"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisLeaveApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { LeaveType } from "@/lib/types";

type LeaveTypeSortKey = "code" | "name" | "max_days" | "paid" | "approval" | "status";

export function LeaveTypesTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    code: "", name: "", max_days: "", is_paid: true, requires_approval: true,
    category: "annual" as LeaveType["category"], requires_doctor_cert: false,
  });
  const tableSort = useTableSort<LeaveTypeSortKey>("code", "asc");

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["hris", "leave-types"],
    queryFn: () => hrisLeaveApi.listTypes().then((r) => r.data),
  });
  const sortedTypes = sortTableRows(types, tableSort.sortKey, tableSort.sortDirection, {
    code: (leaveType) => leaveType.code,
    name: (leaveType) => leaveType.name,
    max_days: (leaveType) => leaveType.max_days_per_year,
    paid: (leaveType) => leaveType.is_paid,
    approval: (leaveType) => leaveType.requires_approval,
    status: (leaveType) => leaveType.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisLeaveApi.createType({
      code: form.code,
      name: form.name,
      max_days_per_year: form.max_days ? parseInt(form.max_days) : null,
      is_paid: form.is_paid,
      requires_approval: form.requires_approval,
      category: form.category,
      requires_doctor_cert: form.requires_doctor_cert,
    }),
    onSuccess: () => {
      toastSuccess("Tipe cuti berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "leave-types"] });
      setShowAdd(false);
      setForm({
        code: "", name: "", max_days: "", is_paid: true, requires_approval: true,
        category: "annual", requires_doctor_cert: false,
      });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Jenis cuti dan aturan pengajuan</p>
        <Button size="sm" variant="primary" icon={<Plus size={13} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowAdd(true)}>Tambah Tipe</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Kode" column="code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Maks Hari/Tahun" column="max_days" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" className="!px-0 !py-2" />
              <SortableTableHeader label="Berbayar" column="paid" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
              <SortableTableHeader label="Perlu Persetujuan" column="approval" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedTypes.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-mono text-xs text-gray-600">{t.code}</td>
                <td className="py-2.5">
                  <p className="font-medium text-gray-800">{t.name}</p>
                  <p className="text-[10px] text-gray-400 capitalize">
                    {t.category}{t.requires_doctor_cert ? " · surat dokter" : ""}
                  </p>
                </td>
                <td className="py-2.5 text-right text-gray-600">{t.max_days_per_year ?? "∞"}</td>
                <td className="py-2.5 text-center">
                  {t.is_paid ? <Check size={14} className="text-teal-600 mx-auto" /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 text-center">
                  {t.requires_approval ? <Check size={14} className="text-teal-600 mx-auto" /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 text-center">
                  <Badge className={t.is_active ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-50 text-gray-500 border-gray-200 text-[10px]"}>
                    {t.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Tipe Cuti">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="cth: CB" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Maks Hari/Tahun</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.max_days} onChange={e => setForm(f => ({...f, max_days: e.target.value}))} placeholder="Kosong = tidak terbatas" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Tipe Cuti</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Cuti Bersama" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.category}
              onChange={e => {
                const category = e.target.value as LeaveType["category"];
                setForm(f => ({
                  ...f,
                  category,
                  requires_doctor_cert: category === "sick" ? true : f.requires_doctor_cert,
                }));
              }}
            >
              <option value="annual">Tahunan</option>
              <option value="sick">Sakit</option>
              <option value="maternity">Melahirkan</option>
              <option value="paternity">Pendamping Melahirkan</option>
              <option value="unpaid">Tanpa Gaji</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_paid} onChange={e => setForm(f => ({...f, is_paid: e.target.checked}))} className="rounded" />
              Cuti berbayar
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.requires_approval} onChange={e => setForm(f => ({...f, requires_approval: e.target.checked}))} className="rounded" />
              Perlu persetujuan
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.requires_doctor_cert}
              onChange={e => setForm(f => ({ ...f, requires_doctor_cert: e.target.checked }))}
              className="rounded"
            />
            Wajib melampirkan surat dokter
          </label>
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

// ── Komponen Gaji Tab ─────────────────────────────────────────────────────────
