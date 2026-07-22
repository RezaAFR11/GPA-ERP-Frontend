"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisHolidayCalendarApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import { fmtDate } from "@/lib/utils";

type HolidaySortKey = "date" | "name" | "type";

export function HolidayCalendarTab() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: "", name: "", is_national: true });
  const tableSort = useTableSort<HolidaySortKey>("date", "asc");

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["hris", "holiday-calendar", year],
    queryFn: () => hrisHolidayCalendarApi.list(year).then((r) => r.data),
  });
  const sortedHolidays = sortTableRows(holidays, tableSort.sortKey, tableSort.sortDirection, {
    date: (holiday) => holiday.date,
    name: (holiday) => holiday.name,
    type: (holiday) => holiday.is_national,
  });

  const createMut = useMutation({
    mutationFn: () => hrisHolidayCalendarApi.create({
      date: form.date,
      name: form.name,
      is_national: form.is_national,
    }),
    onSuccess: () => {
      toastSuccess("Hari libur berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "holiday-calendar"] });
      setShowAdd(false);
      setForm({ date: "", name: "", is_national: true });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => hrisHolidayCalendarApi.delete(id),
    onSuccess: () => {
      toastSuccess("Hari libur dihapus");
      qc.invalidateQueries({ queryKey: ["hris", "holiday-calendar"] });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">Hari libur nasional & perusahaan</p>
          <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Button size="sm" variant="primary" icon={<Plus size={13} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowAdd(true)}>Tambah Libur</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Tanggal" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Tipe" column="type" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
              <th className="text-right py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedHolidays.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-mono text-xs text-gray-700">{fmtDate(h.date)}</td>
                <td className="py-2.5 font-medium text-gray-800">{h.name}</td>
                <td className="py-2.5 text-center">
                  <Badge className={h.is_national ? "bg-red-50 text-red-700 border-red-200 text-[10px]" : "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"}>
                    {h.is_national ? "Nasional" : "Perusahaan"}
                  </Badge>
                </td>
                <td className="py-2.5 text-right">
                  <button onClick={() => deleteMut.mutate(h.id)}
                    disabled={deleteMut.isPending}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">Tidak ada hari libur di tahun {year}</td></tr>
            )}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Hari Libur">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Hari Libur</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Hari Raya Idul Fitri" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={form.is_national} onChange={() => setForm(f => ({...f, is_national: true}))} />
              Hari libur nasional
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={!form.is_national} onChange={() => setForm(f => ({...f, is_national: false}))} />
              Libur perusahaan
            </label>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
