"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisDepartmentsApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";

type DepartmentSortKey = "code" | "name" | "parent" | "status";

export function DepartmentsTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", parent_id: "" });
  const tableSort = useTableSort<DepartmentSortKey>("code", "asc");

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ["hris", "departments"],
    queryFn: () => hrisDepartmentsApi.list(false).then((r) => r.data),
  });
  const departmentById = new Map(depts.map((department) => [department.id, department]));
  const sortedDepartments = sortTableRows(depts, tableSort.sortKey, tableSort.sortDirection, {
    code: (department) => department.code,
    name: (department) => department.name,
    parent: (department) => department.parent_id ? departmentById.get(department.parent_id)?.name : null,
    status: (department) => department.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisDepartmentsApi.create({
      code: form.code,
      name: form.name,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null,
    }),
    onSuccess: () => {
      toastSuccess("Departemen berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "departments"] });
      setShowAdd(false);
      setForm({ code: "", name: "", parent_id: "" });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Struktur departemen dan divisi perusahaan</p>
        <Button size="sm" variant="primary" icon={<Plus size={13} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowAdd(true)}>Tambah Departemen</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Kode" column="code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Induk" column="parent" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedDepartments.map((d) => {
              const parent = d.parent_id ? departmentById.get(d.parent_id) : null;
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="py-2.5 font-mono text-xs text-gray-600">{d.code}</td>
                  <td className="py-2.5 font-medium text-gray-800">{d.name}</td>
                  <td className="py-2.5 text-gray-500">{parent?.name ?? "—"}</td>
                  <td className="py-2.5 text-center">
                    <Badge className={d.is_active ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-50 text-gray-500 border-gray-200 text-[10px]"}>
                      {d.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Departemen">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="cth: OPS" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Departemen Induk</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.parent_id} onChange={e => setForm(f => ({...f, parent_id: e.target.value}))}>
                <option value="">— Tidak ada (root) —</option>
                {depts.filter(d => d.is_active).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Departemen</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Operasional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button variant="primary" size="sm" loading={createMut.isPending}
              className="bg-teal-700 hover:bg-teal-600 border-teal-700"
              onClick={() => createMut.mutate()}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Jabatan Tab ───────────────────────────────────────────────────────────────
