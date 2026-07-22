"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { costCentresApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { CostCentre, CostCentreCreate } from "@/lib/types";
import { cn, getErrorMessage } from "@/lib/utils";

type CostCentreSortKey = "code" | "name" | "description" | "status";

export function CostCentresTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CostCentre | null>(null);
  const [deactivating, setDeactivating] = useState<CostCentre | null>(null);
  const [form, setForm] = useState<CostCentreCreate>({ code: "", name: "", description: "" });
  const tableSort = useTableSort<CostCentreSortKey>("code", "asc");

  const { data: centres = [], isLoading } = useQuery({
    queryKey: ["cost-centres", "all"],
    queryFn: () => costCentresApi.list(false).then((r) => r.data),
  });
  const sortedCentres = sortTableRows(centres, tableSort.sortKey, tableSort.sortDirection, {
    code: (centre) => centre.code,
    name: (centre) => centre.name,
    description: (centre) => centre.description,
    status: (centre) => centre.is_active,
  });

  const save = useMutation({
    mutationFn: () => editing
      ? costCentresApi.update(editing.id, { name: form.name, description: form.description })
      : costCentresApi.create(form),
    onSuccess: () => {
      toastSuccess(editing ? "Cost centre updated" : "Cost centre created");
      qc.invalidateQueries({ queryKey: ["cost-centres"] });
      setShowForm(false);
      setEditing(null);
      setForm({ code: "", name: "", description: "" });
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => costCentresApi.deactivate(id),
    onSuccess: () => {
      toastSuccess("Cost centre deactivated");
      qc.invalidateQueries({ queryKey: ["cost-centres"] });
      setDeactivating(null);
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  const restore = useMutation({
    mutationFn: (id: number) => costCentresApi.update(id, { is_active: true }),
    onSuccess: () => {
      toastSuccess("Cost centre restored");
      qc.invalidateQueries({ queryKey: ["cost-centres"] });
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", description: "" });
    setShowForm(true);
  }

  function openEdit(centre: CostCentre) {
    setEditing(centre);
    setForm({
      code: centre.code,
      name: centre.name,
      description: centre.description ?? "",
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <ConfirmActionModal
        open={!!deactivating}
        title="Deactivate Cost Centre"
        message={deactivating ? `Deactivate ${deactivating.code} - ${deactivating.name}?` : ""}
        confirmLabel="Deactivate"
        pending={deactivate.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => { if (deactivating) deactivate.mutate(deactivating.id); }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{centres.length} cost centres</p>
        <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={openCreate}>
          Add Centre
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">
            {editing ? "Edit Cost Centre" : "New Cost Centre"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input
                value={form.code}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="CC-001"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Head Office"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={save.isPending || !form.code || !form.name}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving..." : editing ? "Save Centre" : "Create Centre"}
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
                <SortableTableHeader label="Description" column="description" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {centres.length === 0 ? (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-8 text-xs">No cost centres defined</td></tr>
              ) : sortedCentres.map((centre) => (
                <tr key={centre.id} className={cn("hover:bg-gray-50/50 transition-colors", !centre.is_active && "opacity-50")}>
                  <td className="td num text-xs font-semibold text-gray-500">{centre.code}</td>
                  <td className="td text-sm font-medium text-gray-900">{centre.name}</td>
                  <td className="td hidden md:table-cell text-xs text-gray-500">{centre.description || "—"}</td>
                  <td className="td">
                    {centre.is_active
                      ? <Badge className="bg-green-50 text-green-700 border-green-200" dot>Active</Badge>
                      : <Badge className="bg-gray-100 text-gray-500 border-gray-200">Inactive</Badge>}
                  </td>
                  <td className="td">
                    <button
                      onClick={() => openEdit(centre)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mr-1"
                      title="Edit centre"
                    >
                      <Pencil size={12} />
                    </button>
                    {centre.is_active ? (
                      <button
                        onClick={() => setDeactivating(centre)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Deactivate centre"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => restore.mutate(centre.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Restore centre"
                      >
                        <ArchiveRestore size={12} />
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
