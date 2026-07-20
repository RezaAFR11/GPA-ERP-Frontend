"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisWorkGroupsApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { WorkGroup } from "@/lib/types";

type WorkGroupSortKey = "name" | "role" | "description" | "members" | "status";

export function WorkGroupsTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "WORKER", description: "" });
  const tableSort = useTableSort<WorkGroupSortKey>("name", "asc");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["hris", "work-groups"],
    queryFn: () => hrisWorkGroupsApi.list().then((r) => r.data),
  });
  const sortedGroups = sortTableRows(groups, tableSort.sortKey, tableSort.sortDirection, {
    name: (group) => group.name,
    role: (group) => group.role,
    description: (group) => group.description,
    members: (group) => group.members?.length ?? 0,
    status: (group) => group.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisWorkGroupsApi.create({
      name: form.name,
      role: form.role as WorkGroup["role"],
      description: form.description || null,
    }),
    onSuccess: () => {
      toastSuccess("Grup kerja berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["hris", "work-groups"] });
      setShowAdd(false);
      setForm({ name: "", role: "WORKER", description: "" });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Sub-grup karyawan untuk filter absensi dan penugasan</p>
        <Button size="sm" variant="primary" icon={<Plus size={13} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowAdd(true)}>Tambah Grup</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Nama Grup" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Role" column="role" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Deskripsi" column="description" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Anggota" column="members" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedGroups.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-medium text-gray-800">{g.name}</td>
                <td className="py-2.5">
                  <Badge className={g.role === "WORKER" ? "bg-blue-50 text-blue-700 border-blue-200 text-[10px]" : "bg-teal-50 text-teal-700 border-teal-200 text-[10px]"}>
                    {g.role}
                  </Badge>
                </td>
                <td className="py-2.5 text-gray-500 text-xs">{g.description ?? "—"}</td>
                <td className="py-2.5 text-right text-gray-600">{g.members?.length ?? 0}</td>
                <td className="py-2.5 text-center">
                  <Badge className={g.is_active ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-50 text-gray-500 border-gray-200 text-[10px]"}>
                    {g.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Grup Kerja">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama Grup</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Tim Site A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                <option value="WORKER">WORKER (Lapangan)</option>
                <option value="STAFF">STAFF (Kantor)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi (opsional)</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
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

// ── Kalender Libur Tab ────────────────────────────────────────────────────────
