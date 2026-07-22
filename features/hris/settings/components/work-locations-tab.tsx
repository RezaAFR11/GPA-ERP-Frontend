"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisWorkLocationApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { WorkLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

type LocationSortKey = "name" | "type" | "coordinates" | "timezone" | "radius" | "status";

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB - Jakarta" },
  { value: "Asia/Makassar", label: "WITA - Makassar / Berau" },
  { value: "Asia/Jayapura", label: "WIT - Jayapura" },
];

export function WorkLocationsTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", location_type: "home_office", latitude: "", longitude: "",
    radius_meters: "200", timezone_name: "Asia/Jakarta",
  });
  const tableSort = useTableSort<LocationSortKey>("name", "asc");

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["hris", "work-locations"],
    queryFn: () => hrisWorkLocationApi.list(false).then((r) => r.data),
  });
  const sortedLocations = sortTableRows(locations, tableSort.sortKey, tableSort.sortDirection, {
    name: (location) => location.name,
    type: (location) => location.location_type,
    coordinates: (location) => location.latitude,
    timezone: (location) => location.timezone_name,
    radius: (location) => location.radius_meters,
    status: (location) => location.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisWorkLocationApi.create({
      name: form.name,
      location_type: form.location_type as WorkLocation["location_type"],
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius_meters: parseInt(form.radius_meters),
      timezone_name: form.timezone_name,
    }),
    onSuccess: () => {
      toastSuccess("Lokasi berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "work-locations"] });
      setShowAdd(false);
      setForm({
        name: "", location_type: "home_office", latitude: "", longitude: "",
        radius_meters: "200", timezone_name: "Asia/Jakarta",
      });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  const timezoneMut = useMutation({
    mutationFn: ({ id, timezone_name }: { id: number; timezone_name: string }) =>
      hrisWorkLocationApi.update(id, { timezone_name }),
    onSuccess: () => {
      toastSuccess("Zona waktu berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["hris", "work-locations"] });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Titik lokasi kerja yang valid untuk clock-in berbasis GPS</p>
        <Button size="sm" variant="primary" icon={<Plus size={13} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowAdd(true)}>Tambah Lokasi</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Tipe" column="type" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Koordinat" column="coordinates" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Zona Waktu" column="timezone" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Radius" column="radius" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedLocations.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-medium text-gray-800">{loc.name}</td>
                <td className="py-2.5">
                  <Badge className={cn(
                    "text-[10px]",
                    loc.location_type === "home_office" ? "bg-teal-50 text-teal-700 border-teal-200" :
                    loc.location_type === "site"        ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                          "bg-gray-50 text-gray-600 border-gray-200"
                  )}>
                    {loc.location_type === "home_office" ? "HO" : loc.location_type === "site" ? "Site" : "Lainnya"}
                  </Badge>
                </td>
                <td className="py-2.5 text-gray-500 font-mono text-[11px]">
                  {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                </td>
                <td className="py-2.5">
                  <select
                    value={loc.timezone_name}
                    disabled={timezoneMut.isPending}
                    onChange={(e) => timezoneMut.mutate({ id: loc.id, timezone_name: e.target.value })}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600"
                    aria-label={`Zona waktu ${loc.name}`}
                  >
                    {TIMEZONES.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>{timezone.label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 text-right text-gray-600">{loc.radius_meters}m</td>
                <td className="py-2.5 text-right">
                  <Badge className={loc.is_active ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-50 text-gray-500 border-gray-200 text-[10px]"}>
                    {loc.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">Belum ada lokasi kerja</td></tr>
            )}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Lokasi Kerja">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lokasi</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Jakarta HO" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Lokasi</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.location_type} onChange={e => setForm(f => ({...f, location_type: e.target.value}))}>
              <option value="home_office">Home Office (HO)</option>
              <option value="site">Site / Lapangan</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.latitude} onChange={e => setForm(f => ({...f, latitude: e.target.value}))} placeholder="-6.12345" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.longitude} onChange={e => setForm(f => ({...f, longitude: e.target.value}))} placeholder="106.12345" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Radius (meter)</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.radius_meters} onChange={e => setForm(f => ({...f, radius_meters: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Zona Waktu</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.timezone_name}
              onChange={e => setForm(f => ({ ...f, timezone_name: e.target.value }))}
            >
              {TIMEZONES.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>{timezone.label}</option>
              ))}
            </select>
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

// ── Tipe Cuti Tab ─────────────────────────────────────────────────────────────
