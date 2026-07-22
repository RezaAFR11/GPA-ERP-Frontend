"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { vaultApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { ApprovalRule, ApprovalRuleCreate, CostCodeCategory, RoleName } from "@/lib/types";
import { formatCurrency, getErrorMessage, ROLE_LABEL } from "@/lib/utils";
import {
  APPROVAL_ROLES as ROLES,
  COST_CODE_CATEGORIES as COST_CODE_CATS,
} from "../vault-config";

type RuleSortKey = "priority" | "amount" | "category" | "role" | "status";

export function ApprovalMatrixTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApprovalRule | null>(null);
  const [deactivating, setDeactivating] = useState<ApprovalRule | null>(null);
  const [form, setForm] = useState<ApprovalRuleCreate>({
    min_amount: 0, required_role: "PM", priority: 10,
  });
  const tableSort = useTableSort<RuleSortKey>("priority", "asc");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: () => vaultApi.listRules().then((r) => r.data),
  });
  const sortedRules = sortTableRows(rules, tableSort.sortKey, tableSort.sortDirection, {
    priority: (rule) => rule.priority,
    amount: (rule) => rule.min_amount,
    category: (rule) => rule.cost_code_category,
    role: (rule) => rule.required_role,
    status: (rule) => rule.is_active,
  });

  const invalidRange =
    form.min_amount < 0 ||
    form.priority < 1 ||
    (form.max_amount !== undefined && form.max_amount <= form.min_amount);

  const create = useMutation({
    mutationFn: () => editing
      ? vaultApi.updateRule(editing.id, {
          min_amount: form.min_amount,
          max_amount: form.max_amount ?? null,
          cost_code_category: form.cost_code_category ?? null,
          required_role: form.required_role,
          priority: form.priority,
        })
      : vaultApi.createRule(form),
    onSuccess: () => {
      toastSuccess(editing ? "Rule updated" : "Rule created");
      qc.invalidateQueries({ queryKey: ["approval-rules"] });
      setShowForm(false);
      setEditing(null);
      setForm({ min_amount: 0, required_role: "PM", priority: 10 });
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => vaultApi.deactivateRule(id),
    onSuccess: () => {
      toastSuccess("Rule deactivated");
      qc.invalidateQueries({ queryKey: ["approval-rules"] });
      setDeactivating(null);
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <ConfirmActionModal
        open={!!deactivating}
        title="Deactivate Rule"
        message={deactivating ? `Deactivate approval rule #${deactivating.id} for ${ROLE_LABEL[deactivating.required_role]}?` : ""}
        confirmLabel="Deactivate"
        pending={deactivate.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => { if (deactivating) deactivate.mutate(deactivating.id); }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {rules.length} active rule{rules.length !== 1 ? "s" : ""} — applied at expense submit time
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={() => {
          setEditing(null);
          setForm({ min_amount: 0, required_role: "PM", priority: 10 });
          setShowForm((v) => !v);
        }}>
          Add Rule
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">{editing ? "Edit Approval Rule" : "New Approval Rule"}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Amount (IDR) *</label>
              <input
                type="number"
                min={0}
                value={form.min_amount}
                onChange={(e) => setForm((f) => ({ ...f, min_amount: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Amount (empty = unlimited)</label>
              <input
                type="number"
                min={0}
                value={form.max_amount ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f, max_amount: e.target.value ? Number(e.target.value) : undefined,
                }))}
                placeholder="∞"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Required Role *</label>
              <select
                value={form.required_role}
                onChange={(e) => setForm((f) => ({ ...f, required_role: e.target.value as RoleName }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Priority (lower = checked first)</label>
              <input
                type="number"
                min={1}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Category filter (optional)</label>
              <select
                value={form.cost_code_category ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f, cost_code_category: e.target.value ? e.target.value as CostCodeCategory : undefined,
                }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Any category</option>
                {COST_CODE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {invalidRange && (
            <p className="mb-3 text-xs text-red-600">
              Amount must be non-negative, Max Amount must exceed Min Amount, and Priority must be at least 1.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            <Button
              variant="primary" size="sm"
              onClick={() => create.mutate()}
              disabled={create.isPending || invalidRange}
            >
              {create.isPending ? "Saving..." : editing ? "Save Rule" : "Create Rule"}
            </Button>
          </div>
        </Card>
      )}

      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={5} cols={6} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Priority" column="priority" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Amount Range" column="amount" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Category" column="category" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="Required Role" column="role" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td text-center text-gray-400 py-8 text-xs">
                    No rules defined yet — click Add Rule to create one
                  </td>
                </tr>
              ) : sortedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="td">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {rule.priority}
                    </span>
                  </td>
                  <td className="td num text-sm font-semibold text-gray-800">
                    {formatCurrency(rule.min_amount)} – {rule.max_amount ? formatCurrency(rule.max_amount) : "∞"}
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className="text-xs text-gray-500">
                      {rule.cost_code_category ?? "Any"}
                    </span>
                  </td>
                  <td className="td">
                    <Badge className="bg-primary-50 text-primary border-primary/20">
                      {ROLE_LABEL[rule.required_role] ?? rule.required_role.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="td">
                    {rule.is_active ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200" dot>Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 border-gray-200">Inactive</Badge>
                    )}
                  </td>
                  <td className="td">
                    <button
                      onClick={() => {
                        setEditing(rule);
                        setForm({
                          min_amount: rule.min_amount,
                          max_amount: rule.max_amount ?? undefined,
                          cost_code_category: rule.cost_code_category ?? undefined,
                          required_role: rule.required_role,
                          priority: rule.priority,
                        });
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mr-1"
                      title="Edit rule"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setDeactivating(rule)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Deactivate rule"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
