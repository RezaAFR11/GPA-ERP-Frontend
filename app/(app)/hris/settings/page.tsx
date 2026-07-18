"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, CalendarDays, DollarSign, Building2, GraduationCap,
  Users, Calendar, Plus, Trash2, Loader2, Check, AlertTriangle,
} from "lucide-react";
import {
  hrisWorkLocationApi, hrisLeaveApi, hrisSalaryApi, hrisDepartmentsApi,
  hrisJobGradesApi, hrisWorkGroupsApi, hrisHolidayCalendarApi,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { cn, fmtDate } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { useRole } from "@/lib/auth-context";
import type { WorkLocation, LeaveType, SalaryComponent, Department, JobGrade, WorkGroup, HolidayCalendar } from "@/lib/types";
import { sortTableRows, useTableSort } from "@/lib/table-sort";

// ── TABS ──────────────────────────────────────────────────────────────────────

type TabKey = "locations" | "leave-types" | "salary" | "departments" | "grades" | "work-groups" | "holidays";
type LocationSortKey = "name" | "type" | "coordinates" | "timezone" | "radius" | "status";
type LeaveTypeSortKey = "code" | "name" | "max_days" | "paid" | "approval" | "status";
type SalaryComponentSortKey = "code" | "name" | "type" | "taxable" | "status";
type DepartmentSortKey = "code" | "name" | "parent" | "status";
type GradeSortKey = "code" | "name" | "level" | "status";
type WorkGroupSortKey = "name" | "role" | "description" | "members" | "status";
type HolidaySortKey = "date" | "name" | "type";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "locations",    label: "Lokasi Kerja",     icon: MapPin         },
  { key: "leave-types",  label: "Tipe Cuti",        icon: CalendarDays   },
  { key: "salary",       label: "Komponen Gaji",    icon: DollarSign     },
  { key: "departments",  label: "Departemen",       icon: Building2      },
  { key: "grades",       label: "Jabatan",          icon: GraduationCap  },
  { key: "work-groups",  label: "Grup Kerja",       icon: Users          },
  { key: "holidays",     label: "Kalender Libur",   icon: Calendar       },
];

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB - Jakarta" },
  { value: "Asia/Makassar", label: "WITA - Makassar / Berau" },
  { value: "Asia/Jayapura", label: "WIT - Jayapura" },
];

// ── Lokasi Kerja Tab ──────────────────────────────────────────────────────────

function WorkLocationsTab() {
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

function LeaveTypesTab() {
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

function SalaryComponentsTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", component_type: "ALLOWANCE", is_taxable: false });
  const tableSort = useTableSort<SalaryComponentSortKey>("code", "asc");

  const { data: components = [], isLoading } = useQuery({
    queryKey: ["hris", "salary-components"],
    queryFn: () => hrisSalaryApi.listComponents().then((r) => r.data),
  });
  const sortedComponents = sortTableRows(components, tableSort.sortKey, tableSort.sortDirection, {
    code: (component) => component.code,
    name: (component) => component.name,
    type: (component) => component.component_type,
    taxable: (component) => component.is_taxable,
    status: (component) => component.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisSalaryApi.createComponent({
      code: form.code,
      name: form.name,
      component_type: form.component_type as SalaryComponent["component_type"],
      is_taxable: form.is_taxable,
    }),
    onSuccess: () => {
      toastSuccess("Komponen berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "salary-components"] });
      setShowAdd(false);
      setForm({ code: "", name: "", component_type: "ALLOWANCE", is_taxable: false });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  const TYPE_COLORS: Record<string, string> = {
    BASIC:     "bg-teal-50 text-teal-700 border-teal-200",
    ALLOWANCE: "bg-blue-50 text-blue-700 border-blue-200",
    DEDUCTION: "bg-red-50 text-red-700 border-red-200",
    BPJS:      "bg-purple-50 text-purple-700 border-purple-200",
    TAX:       "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Daftar komponen penggajian (tunjangan, potongan, BPJS, pajak)</p>
        {canManage && (
          <Button size="sm" variant="primary" icon={<Plus size={13} />}
            className="bg-teal-700 hover:bg-teal-600 border-teal-700"
            onClick={() => setShowAdd(true)}>Tambah Komponen</Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Kode" column="code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Tipe" column="type" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Kena Pajak" column="taxable" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedComponents.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-mono text-xs text-gray-600">{c.code}</td>
                <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                <td className="py-2.5">
                  <Badge className={cn("text-[10px]", TYPE_COLORS[c.component_type])}>
                    {c.component_type}
                  </Badge>
                </td>
                <td className="py-2.5 text-center">
                  {c.is_taxable ? <Check size={14} className="text-teal-600 mx-auto" /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 text-center">
                  <Badge className={c.is_active ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-50 text-gray-500 border-gray-200 text-[10px]"}>
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Komponen Gaji">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="cth: MEAL" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.component_type} onChange={e => setForm(f => ({...f, component_type: e.target.value}))}>
                <option value="BASIC">BASIC</option>
                <option value="ALLOWANCE">ALLOWANCE</option>
                <option value="DEDUCTION">DEDUCTION</option>
                <option value="BPJS">BPJS</option>
                <option value="TAX">TAX</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Komponen</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Tunjangan Makan" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_taxable} onChange={e => setForm(f => ({...f, is_taxable: e.target.checked}))} className="rounded" />
            Kena pajak penghasilan (PPh 21)
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

// ── Departemen Tab ────────────────────────────────────────────────────────────

function DepartmentsTab() {
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

function GradesTab() {
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

function WorkGroupsTab() {
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

function HolidayCalendarTab() {
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

export default function HrisSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("locations");
  const { hasRole } = useRole();
  const canAccessSettings = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canManageSalary = hasRole("SUPER_ADMIN", "MD");

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Akses ditolak</p>
        <p className="text-sm text-gray-400">Halaman ini hanya untuk HR, MD, atau Super Admin</p>
      </div>
    );
  }

  const activeTabDef = TABS.find(t => t.key === activeTab)!;
  const ActiveIcon = activeTabDef.icon;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pengaturan HRIS</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Kelola konfigurasi sistem HRIS — lokasi, cuti, komponen gaji, dan kalender libur
        </p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  activeTab === tab.key
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <Card className="flex-1 min-w-0">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <ActiveIcon size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-800">{activeTabDef.label}</h2>
          </div>
          <div className="p-4">
            {activeTab === "locations"   && <WorkLocationsTab />}
            {activeTab === "leave-types" && <LeaveTypesTab />}
            {activeTab === "salary"      && <SalaryComponentsTab canManage={canManageSalary} />}
            {activeTab === "departments" && <DepartmentsTab />}
            {activeTab === "grades"      && <GradesTab />}
            {activeTab === "work-groups" && <WorkGroupsTab />}
            {activeTab === "holidays"    && <HolidayCalendarTab />}
          </div>
        </Card>
      </div>
    </div>
  );
}
