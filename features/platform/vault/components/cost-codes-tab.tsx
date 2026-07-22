"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { costCodesApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { CostCode, CostCodeCategory, CostCodeCreate } from "@/lib/types";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  CATEGORY_COLORS,
  COST_CODE_CATEGORIES as COST_CODE_CATS,
} from "../vault-config";

type CostCodeSortKey = "code" | "name" | "category" | "parent" | "active";

export function CostCodesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deactivating, setDeactivating] = useState<CostCode | null>(null);
  const [form, setForm] = useState<CostCodeCreate>({ code: "", name: "", category: "Direct" });
  const tableSort = useTableSort<CostCodeSortKey>("code", "asc");

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["cost-codes"],
    queryFn: () => costCodesApi.list(false).then((r) => r.data),
  });
  const sortedCodes = sortTableRows(codes, tableSort.sortKey, tableSort.sortDirection, {
    code: (costCode) => costCode.code,
    name: (costCode) => costCode.name,
    category: (costCode) => costCode.category,
    parent: (costCode) => costCode.parent_id,
    active: (costCode) => costCode.is_active,
  });

  const create = useMutation({
    mutationFn: () => costCodesApi.create(form),
    onSuccess: () => {
      toastSuccess("Cost code created");
      qc.invalidateQueries({ queryKey: ["cost-codes"] });
      setShowForm(false);
      setForm({ code: "", name: "", category: "Direct" });
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => costCodesApi.deactivate(id),
    onSuccess: () => {
      toastSuccess("Cost code deactivated");
      qc.invalidateQueries({ queryKey: ["cost-codes"] });
      setDeactivating(null);
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <ConfirmActionModal
        open={!!deactivating}
        title="Deactivate Cost Code"
        message={deactivating ? `Deactivate ${deactivating.code} - ${deactivating.name}?` : ""}
        confirmLabel="Deactivate"
        pending={deactivate.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => { if (deactivating) deactivate.mutate(deactivating.id); }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{codes.length} cost codes</p>
        <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={() => setShowForm((v) => !v)}>
          Add Code
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">New Cost Code</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="D-001"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CostCodeCategory }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {COST_CODE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Material & Equipment"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              variant="primary" size="sm"
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.code || !form.name}
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </Card>
      )}

      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Code" column="code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Name" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Category" column="category" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="Parent" column="parent" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden lg:table-cell" />
                <SortableTableHeader label="Active" column="active" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td text-center text-gray-400 py-8 text-xs">
                    No cost codes yet — click Add Code to create one
                  </td>
                </tr>
              ) : sortedCodes.map((cc) => (
                <tr key={cc.id} className={cn("hover:bg-gray-50/50 transition-colors", !cc.is_active && "opacity-50")}>
                  <td className="td num text-xs font-semibold text-gray-500">{cc.code}</td>
                  <td className="td">
                    <span className={`text-sm font-medium text-gray-900 ${cc.parent_id ? "pl-3 border-l-2 border-gray-200" : "font-semibold"}`}>
                      {cc.name}
                    </span>
                  </td>
                  <td className="td hidden md:table-cell">
                    <Badge className={cn("border", CATEGORY_COLORS[cc.category] ?? "bg-gray-100 text-gray-500 border-gray-200")}>
                      {cc.category}
                    </Badge>
                  </td>
                  <td className="td hidden lg:table-cell num text-xs text-gray-400">
                    {cc.parent_id ?? "—"}
                  </td>
                  <td className="td">
                    {cc.is_active
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <span className="text-xs text-gray-300">Inactive</span>
                    }
                  </td>
                  <td className="td">
                    {cc.is_active && (
                      <button
                        onClick={() => setDeactivating(cc)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Deactivate"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
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
