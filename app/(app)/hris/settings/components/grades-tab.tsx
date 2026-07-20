"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisJobGradesApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";

type GradeSortKey = "code" | "name" | "level" | "status";

export function GradesTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", level: "1" });
  const tableSort = useTableSort<GradeSortKey>("level", "asc");

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ["hris", "job-grades"],
    queryFn: () => hrisJobGradesApi.list(false).then((r) => r.data),
  });
  const sortedGrades = sortTableRows(grades, tableSort.sortKey, tableSort.sortDirection, {
    code: (grade) => grade.code,
    name: (grade) => grade.name,
    level: (grade) => grade.level,
    status: (grade) => grade.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisJobGradesApi.create({
      code: form.code,
      name: form.name,
      level: parseInt(form.level),
    }),
    onSuccess: () => {
      toastSuccess("Jabatan berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "job-grades"] });
      setShowAdd(false);
      setForm({ code: "", name: "", level: "1" });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Grade / jabatan karyawan beserta levelnya</p>
        <Button size="sm" variant="primary" icon={<Plus size={13} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowAdd(true)}>Tambah Jabatan</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Kode" column="code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Level" column="level" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedGrades.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-mono text-xs text-gray-600">{g.code}</td>
                <td className="py-2.5 font-medium text-gray-800">{g.name}</td>
                <td className="py-2.5 text-right text-gray-600">{g.level}</td>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Jabatan">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="cth: SPV" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Level (1 = terendah)</label>
              <input type="number" min={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.level} onChange={e => setForm(f => ({...f, level: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Jabatan</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Supervisor" />
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

// ── Grup Kerja Tab ────────────────────────────────────────────────────────────
