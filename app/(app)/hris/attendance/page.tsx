"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Fingerprint, Download, PlusCircle, Clock, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Search, LogIn,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { ClockInModal } from "./components/clock-in-modal";
import { hrisAttendanceApi, hrisEmployeesApi, hrisWorkGroupsApi, hrisOvertimeApi } from "@/lib/api";
import { useRole } from "@/lib/auth-context";
import type { AttendanceRecord, AttendanceSummaryItem, Employee, WorkGroup, OvertimeRequest } from "@/lib/types";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { SelfieModal } from "@/components/hris/SelfieModal";
import { AuthenticatedImage } from "@/components/ui/authenticated-image";
import { cn } from "@/lib/utils";
import { sortTableRows, useTableSort } from "@/lib/table-sort";

type OvertimeSortKey = "employee" | "date" | "planned_hours" | "reason" | "status";
type AttendanceSortKey = "date" | "employee" | "clock_in" | "clock_out" | "regular" | "overtime" | "source" | "location" | "face";
type AttendanceSummarySortKey = "employee" | "department" | "days" | "regular" | "ot_weekday" | "ot_weekend" | "ot_holiday" | "total";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function fmt12H(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  const n = Number(h);
  return isNaN(n) ? "—" : `${n.toFixed(1)}j`;
}

function locationChip(rec: AttendanceRecord) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000";
  if (rec.matched_location_name) {
    const isHO   = rec.matched_location_type === "home_office";
    const isSite = rec.matched_location_type === "site";
    const color  = isHO ? "bg-teal-50 text-teal-700 border-teal-200"
                 : isSite ? "bg-blue-50 text-blue-700 border-blue-200"
                 : "bg-gray-50 text-gray-600 border-gray-200";
    const icon   = isHO ? "🏢" : isSite ? "⛏" : "📍";
    const dist   = rec.location_distance_m != null ? ` · ${Math.round(Number(rec.location_distance_m))}m` : "";
    return <Badge className={`${color} text-[10px]`}>{icon} {rec.matched_location_name}{dist}</Badge>;
  }
  if (rec.location_ok === false) {
    const dist = rec.location_distance_m != null ? ` · ${Math.round(Number(rec.location_distance_m))}m` : "";
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">✗ Di luar radius{dist}</Badge>;
  }
  if (rec.latitude != null) return <span className="text-gray-300 text-[11px]">—</span>;
  return null;
  void BASE_URL;
}

/* ─── Overtime approval panel ────────────────────────────────────────────── */
const OT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft", submitted: "Diajukan", approved: "Disetujui", rejected: "Ditolak",
};
const OT_STATUS_COLOR: Record<string, string> = {
  draft:     "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-teal-50 text-teal-700 border-teal-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
};

function OvertimeApprovalPanel() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"" | "submitted" | "approved" | "rejected">("");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const tableSort = useTableSort<OvertimeSortKey>("date", "desc");

  const { data: requests = [], isLoading } = useQuery<OvertimeRequest[]>({
    queryKey: ["hris", "overtime-requests", filterStatus],
    queryFn: () => hrisOvertimeApi.list(filterStatus ? { status: filterStatus } : undefined).then(r => r.data),
  });
  const sortedRequests = sortTableRows(requests, tableSort.sortKey, tableSort.sortDirection, {
    employee: (request) => request.employee_name,
    date: (request) => request.date,
    planned_hours: (request) => request.planned_hours,
    reason: (request) => request.reason,
    status: (request) => request.status,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => hrisOvertimeApi.approve(id),
    onSuccess: () => {
      toastSuccess("Pengajuan lembur disetujui");
      qc.invalidateQueries({ queryKey: ["hris", "overtime-requests"] });
    },
    onError: () => toastError("Gagal menyetujui"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => hrisOvertimeApi.reject(id, note),
    onSuccess: () => {
      toastSuccess("Pengajuan lembur ditolak");
      qc.invalidateQueries({ queryKey: ["hris", "overtime-requests"] });
      setRejectId(null);
      setRejectNote("");
    },
    onError: () => toastError("Gagal menolak"),
  });

  const pending = requests.filter(r => r.status === "submitted").length;

  return (
    <>
      <Card padding={false}>
        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { value: "", label: "Semua" },
              { value: "submitted", label: `Diajukan${pending > 0 ? ` (${pending})` : ""}` },
              { value: "approved",  label: "Disetujui" },
              { value: "rejected",  label: "Ditolak" },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filterStatus === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Karyawan" column="employee" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Tanggal" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Rencana Jam" column="planned_hours" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Alasan" column="reason" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <th className="th">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      ))}
                    </tr>
                  ))
                : requests.length === 0
                  ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                          Tidak ada pengajuan lembur
                        </td>
                      </tr>
                    )
                  : sortedRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-900">{req.employee_name ?? `#${req.employee_id}`}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700">{req.date}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{req.planned_hours} jam</td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                          <span className="line-clamp-2">{req.reason}</span>
                          {req.rejection_reason && (
                            <span className="block text-red-500 mt-0.5 text-[11px]">Alasan tolak: {req.rejection_reason}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-[10px]", OT_STATUS_COLOR[req.status])}>
                            {OT_STATUS_LABEL[req.status] ?? req.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {req.status === "submitted" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => approveMut.mutate(req.id)}
                                disabled={approveMut.isPending}
                                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} /> Setuju
                              </button>
                              <button
                                onClick={() => { setRejectId(req.id); setRejectNote(""); }}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                <AlertCircle size={13} /> Tolak
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reject modal */}
      <Modal open={rejectId !== null} onClose={() => setRejectId(null)} title="Tolak Pengajuan Lembur" size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectId(null)}>Batal</Button>
            <Button
              onClick={() => rejectId !== null && rejectMut.mutate({ id: rejectId, note: rejectNote })}
              disabled={rejectMut.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectMut.isPending ? "Memproses…" : "Tolak"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Berikan alasan penolakan (opsional):</p>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Contoh: Tidak ada keperluan lembur pada tanggal tersebut"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none"
          />
        </div>
      </Modal>
    </>
  );
}

/* ─── Manual entry modal ─────────────────────────────────────────────────── */
function ManualModal({
  open, onClose, employees, onCreated,
}: {
  open: boolean; onClose: () => void;
  employees: Employee[];
  onCreated: () => void;
}) {
  const [empId, setEmpId]   = useState("");
  const [date,  setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [ci,    setCi]      = useState("08:00");
  const [co,    setCo]      = useState("17:00");
  const [note,  setNote]    = useState("");
  const [err,   setErr]     = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!empId || !date) { setErr("Pilih karyawan dan tanggal"); return; }
    setSaving(true); setErr(null);
    try {
      await hrisAttendanceApi.manualCreate({
        employee_id: Number(empId), date,
        clock_in:  date + "T" + ci + ":00",
        clock_out: date + "T" + co + ":00",
        note: note || undefined,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

  return (
    <Modal open={open} onClose={onClose} title="Tambah Absensi Manual" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className={field}>
            <option value="">— Pilih karyawan —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.employee_no} · {e.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clock-In</label>
            <input type="time" value={ci} onChange={e => setCi(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clock-Out</label>
            <input type="time" value={co} onChange={e => setCo(e.target.value)} className={field} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional" className={field} />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function AttendancePage() {
  const qc = useQueryClient();
  const { isHR, isMD } = useRole();
  const canManageAttendance = isHR || isMD;
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch]           = useState("");
  const [workGroupId, setWorkGroupId] = useState<number | "">("");
  const [tab, setTab]     = useState<"list" | "summary" | "overtime">("list");
  const [exporting, setExporting] = useState(false);

  const [showClockIn,  setShowClockIn]  = useState(false);
  const [showManual,   setShowManual]   = useState(false);
  const [clockInEmp,   setClockInEmp]   = useState<Employee | null>(null);
  const [selfieRec,    setSelfieRec]    = useState<AttendanceRecord | null>(null);
  const attendanceSort = useTableSort<AttendanceSortKey>("date", "desc");
  const summarySort = useTableSort<AttendanceSummarySortKey>("employee", "asc");

  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateToRaw = new Date(year, month, 0);
  const dateTo   = `${year}-${String(month).padStart(2, "0")}-${String(dateToRaw.getDate()).padStart(2, "0")}`;

  /* Employees for dropdowns */
  const { data: empData } = useQuery({
    queryKey: ["hris", "employees", { limit: 500 }],
    queryFn:  () => hrisEmployeesApi.list({ limit: 500 }).then(r => r.data),
  });
  const employees = empData?.items ?? [];
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  /* Work groups for filter */
  const { data: workGroups = [] } = useQuery<WorkGroup[]>({
    queryKey: ["hris", "work-groups"],
    queryFn:  () => hrisWorkGroupsApi.list({ is_active: true }).then(r => r.data),
  });

  /* Attendance list */
  const { data: attData, isLoading: attLoad } = useQuery({
    queryKey: ["hris", "attendance", { dateFrom, dateTo, workGroupId }],
    queryFn:  () => hrisAttendanceApi.list({
      date_from: dateFrom, date_to: dateTo, limit: 500,
      ...(workGroupId ? { work_group_id: Number(workGroupId) } : {}),
    }).then(r => r.data),
  });
  const records: AttendanceRecord[] = attData?.items ?? [];

  /* Monthly summary */
  const { data: summary = [], isLoading: sumLoad } = useQuery({
    queryKey: ["hris", "attendance", "summary", year, month],
    queryFn:  () => hrisAttendanceApi.summary({ year, month }).then(r => r.data),
    enabled:  tab === "summary",
  });

  /* Clock-out mutation */
  const clockOutMut = useMutation({
    mutationFn: (empId: number) => hrisAttendanceApi.clockOut({ employee_id: empId }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["hris", "attendance"] }),
  });

  /* Export */
  async function handleExport(fmt: "xlsx" | "csv" = "xlsx") {
    setExporting(true);
    try {
      const res = await hrisAttendanceApi.export({ date_from: dateFrom, date_to: dateTo, fmt });
      const blob = new Blob([res.data as BlobPart], {
        type: fmt === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv",
      });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `absensi_${year}-${String(month).padStart(2, "0")}.${fmt}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Gagal mengunduh data absensi");
    } finally { setExporting(false); }
  }

  /* Filtering */
  const filtered = records.filter(r => {
    if (!search) return true;
    const emp = employees.find(e => e.id === r.employee_id);
    const name = emp?.full_name.toLowerCase() ?? "";
    const no   = emp?.employee_no.toLowerCase() ?? "";
    const s    = search.toLowerCase();
    return name.includes(s) || no.includes(s) || r.date.includes(s);
  });
  const sortedFiltered = sortTableRows(filtered, attendanceSort.sortKey, attendanceSort.sortDirection, {
    date: (record) => record.date,
    employee: (record) => employeeById.get(record.employee_id)?.full_name,
    clock_in: (record) => record.clock_in,
    clock_out: (record) => record.clock_out,
    regular: (record) => record.hours_regular,
    overtime: (record) => Number(record.hours_overtime_weekday ?? 0) + Number(record.hours_overtime_weekend ?? 0) + Number(record.hours_overtime_holiday ?? 0),
    source: (record) => record.source,
    location: (record) => record.matched_location_name,
    face: (record) => record.face_verified,
  });
  const sortedSummary = sortTableRows(
    summary as AttendanceSummaryItem[],
    summarySort.sortKey,
    summarySort.sortDirection,
    {
      employee: (row) => row.full_name,
      department: (row) => row.department,
      days: (row) => row.days_present,
      regular: (row) => row.hours_regular,
      ot_weekday: (row) => row.hours_overtime_weekday,
      ot_weekend: (row) => row.hours_overtime_weekend,
      ot_holiday: (row) => row.hours_overtime_holiday,
      total: (row) => row.total_hours,
    },
  );

  /* Navigation */
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  /* ── Source badge ─────────────────────────────────────────────────────── */
  const srcBadge: Record<string, string> = {
    mobile:      "bg-teal-100 text-teal-700",
    manual:      "bg-gray-100 text-gray-600",
    fingerprint: "bg-purple-100 text-purple-700",
    import:      "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Fingerprint size={20} className="text-purple-600" /> Absensi &amp; Lembur
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Rekap kehadiran harian karyawan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => handleExport("xlsx")}
            disabled={exporting}
            className="text-gray-700 border border-gray-200">
            <Download size={14} className="mr-1.5" />
            {exporting ? "Mengunduh…" : "Export Excel"}
          </Button>
          {canManageAttendance && <Button variant="ghost" size="sm" onClick={() => setShowManual(true)}
            className="text-gray-700 border border-gray-200">
            <PlusCircle size={14} className="mr-1.5" /> Manual
          </Button>}
          {canManageAttendance && <div className="flex items-center gap-1.5">
            <select
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-[180px]"
              value={clockInEmp?.id ?? ""}
              onChange={(e) => {
                const found = employees.find((em) => em.id === Number(e.target.value)) ?? null;
                setClockInEmp(found);
              }}
            >
              <option value="">— Pilih karyawan —</option>
              {employees.map((em) => (
                <option key={em.id} value={em.id}>{em.full_name}</option>
              ))}
            </select>
            <Button size="sm"
              className="bg-purple-700 hover:bg-purple-800 text-white"
              disabled={!clockInEmp}
              onClick={() => setShowClockIn(true)}
            >
              <Clock size={14} className="mr-1.5" /> Clock-In
            </Button>
          </div>}
        </div>
      </div>

      {/* Period navigation */}
      <Card>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { value: "list",     label: "Detail" },
              { value: "summary",  label: "Ringkasan" },
              { value: "overtime", label: "Lembur Diajukan" },
            ] as const).filter(t => t.value !== "overtime" || canManageAttendance).map(t => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  tab === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "list" && (
            <div className="flex items-center gap-2 flex-wrap">
              {workGroups.length > 0 && (
                <select
                  value={workGroupId}
                  onChange={e => setWorkGroupId(e.target.value ? Number(e.target.value) : "")}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-500 text-gray-700 bg-white"
                >
                  <option value="">Semua Grup</option>
                  {workGroups.map(wg => (
                    <option key={wg.id} value={wg.id}>{wg.name}</option>
                  ))}
                </select>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari karyawan…"
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-48"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* TAB: Detail */}
      {tab === "list" && (
        <>
          {/* Desktop table — hidden on mobile */}
          <div className="hidden sm:block">
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <SortableTableHeader label="Tanggal" column="date" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Karyawan" column="employee" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Masuk" column="clock_in" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Keluar" column="clock_out" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Jam Kerja" column="regular" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Lembur" column="overtime" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Sumber" column="source" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Lokasi" column="location" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <SortableTableHeader label="Face" column="face" sortKey={attendanceSort.sortKey} sortDirection={attendanceSort.sortDirection} onSort={attendanceSort.toggleSort} />
                      <th className="th" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attLoad
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                            ))}
                          </tr>
                        ))
                      : filtered.length === 0
                        ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                                Belum ada data absensi untuk periode ini
                              </td>
                            </tr>
                          )
                        : sortedFiltered.map(rec => {
                            const emp  = employeeById.get(rec.employee_id);
                            const totalOT = (Number(rec.hours_overtime_weekday ?? 0) +
                              Number(rec.hours_overtime_weekend ?? 0) + Number(rec.hours_overtime_holiday ?? 0));
                            const hasClockOut = !!rec.clock_out;
                            return (
                              <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                                  {rec.date}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-gray-900 font-medium text-xs">{emp?.full_name ?? `#${rec.employee_id}`}</p>
                                  <p className="text-gray-400 text-[11px]">{emp?.employee_no}</p>
                                </td>
                                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{fmt12H(rec.clock_in)}</td>
                                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{fmt12H(rec.clock_out)}</td>
                                <td className="px-4 py-3 text-gray-700 text-xs">{fmtHours(rec.hours_regular)}</td>
                                <td className="px-4 py-3 text-xs">
                                  {totalOT > 0
                                    ? <span className="text-amber-600 font-medium">{fmtHours(totalOT)}</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", srcBadge[rec.source] ?? "bg-gray-100 text-gray-600")}>
                                    {rec.source}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{locationChip(rec)}</td>
                                <td className="px-4 py-3">
                                  {rec.selfie_url ? (
                                    <button
                                      onClick={() => setSelfieRec(rec)}
                                      className="group relative"
                                      title="Lihat selfie"
                                    >
                                      <AuthenticatedImage
                                        src={rec.selfie_url}
                                        alt="selfie"
                                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow group-hover:ring-purple-400 transition-all"
                                      />
                                      {rec.face_verified && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-teal-500 rounded-full border border-white text-[6px] text-white flex items-center justify-center">✓</span>
                                      )}
                                      {!rec.face_verified && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border border-white text-[6px] text-white flex items-center justify-center">!</span>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-gray-300 text-[11px]">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {canManageAttendance && !hasClockOut && rec.clock_in && (
                                    <button
                                      onClick={() => clockOutMut.mutate(rec.employee_id)}
                                      disabled={clockOutMut.isPending}
                                      className="text-xs text-purple-600 hover:text-purple-800 font-medium underline whitespace-nowrap"
                                    >
                                      Clock-Out
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                    }
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile card list — visible only on small screens */}
          <div className="sm:hidden space-y-2">
            {attLoad
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </Card>
                ))
              : filtered.length === 0
                ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                      Belum ada data absensi untuk periode ini
                    </div>
                  )
                : sortedFiltered.map(rec => {
                    const emp = employeeById.get(rec.employee_id);
                    const totalOT = (Number(rec.hours_overtime_weekday ?? 0) +
                      Number(rec.hours_overtime_weekend ?? 0) + Number(rec.hours_overtime_holiday ?? 0));
                    const hasClockOut = !!rec.clock_out;
                    return (
                      <Card key={rec.id}>
                        <div className="p-3">
                          <div className="flex items-start gap-3">
                            {/* Selfie thumbnail */}
                            {rec.selfie_url ? (
                              <button
                                onClick={() => setSelfieRec(rec)}
                                className="relative flex-shrink-0"
                                title="Lihat selfie"
                              >
                                <AuthenticatedImage
                                  src={rec.selfie_url}
                                  alt="selfie"
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow"
                                />
                                {rec.face_verified ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-teal-500 rounded-full border border-white text-[7px] text-white flex items-center justify-center">✓</span>
                                ) : (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border border-white text-[7px] text-white flex items-center justify-center">!</span>
                                )}
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Fingerprint size={16} className="text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Date + employee name */}
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                  {emp?.full_name ?? `#${rec.employee_id}`}
                                </p>
                                <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">{rec.date}</span>
                              </div>
                              <p className="text-[10px] text-gray-400">{emp?.employee_no}</p>

                              {/* Clock times + hours */}
                              <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <LogIn size={11} className="text-teal-500" />
                                  {fmt12H(rec.clock_in)}
                                </span>
                                <span className="text-gray-300">→</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-gray-400" />
                                  {fmt12H(rec.clock_out)}
                                </span>
                                {rec.hours_regular != null && (
                                  <span className="ml-auto text-[10px] font-medium text-gray-700">
                                    {fmtHours(rec.hours_regular)}
                                  </span>
                                )}
                              </div>

                              {/* Overtime */}
                              {totalOT > 0 && (
                                <p className="text-[10px] text-amber-600 mt-0.5">Lembur: {fmtHours(totalOT)}</p>
                              )}

                              {/* Bottom row: source badge + location chip + clock-out action */}
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium", srcBadge[rec.source] ?? "bg-gray-100 text-gray-600")}>
                                  {rec.source}
                                </span>
                                {locationChip(rec)}
                                {canManageAttendance && !hasClockOut && rec.clock_in && (
                                  <button
                                    onClick={() => clockOutMut.mutate(rec.employee_id)}
                                    disabled={clockOutMut.isPending}
                                    className="ml-auto text-[10px] text-purple-600 hover:text-purple-800 font-medium underline"
                                  >
                                    Clock-Out
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
            }
          </div>
        </>
      )}

      {/* TAB: Summary */}
      {tab === "summary" && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableTableHeader label="Karyawan" column="employee" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Departemen" column="department" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Hari Hadir" column="days" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Jam Normal" column="regular" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Lembur WD" column="ot_weekday" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Lembur WE" column="ot_weekend" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Lembur Libur" column="ot_holiday" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                  <SortableTableHeader label="Total Jam" column="total" sortKey={summarySort.sortKey} sortDirection={summarySort.sortDirection} onSort={summarySort.toggleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sumLoad
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        ))}
                      </tr>
                    ))
                  : (summary as AttendanceSummaryItem[]).length === 0
                    ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                            Belum ada data ringkasan
                          </td>
                        </tr>
                      )
                    : sortedSummary.map(row => (
                        <tr key={row.employee_id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-xs">{row.full_name}</p>
                            <p className="text-gray-400 text-[11px]">{row.employee_no}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{row.department ?? "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                              <CheckCircle2 size={12} />{row.days_present}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">{fmtHours(row.hours_regular)}</td>
                          <td className="px-4 py-3 text-xs text-amber-600">{fmtHours(row.hours_overtime_weekday)}</td>
                          <td className="px-4 py-3 text-xs text-amber-600">{fmtHours(row.hours_overtime_weekend)}</td>
                          <td className="px-4 py-3 text-xs text-red-500">{fmtHours(row.hours_overtime_holiday)}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-900">{fmtHours(row.total_hours)}</td>
                        </tr>
                      ))
                }
              </tbody>
            </table>
          </div>
          {tab === "summary" && (summary as AttendanceSummaryItem[]).length > 0 && (
            <div className="px-5 py-3 border-t border-gray-50 flex justify-end gap-2">
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Download size={13} /> Export CSV
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 disabled:opacity-50"
              >
                <Download size={13} /> Export Excel
              </button>
            </div>
          )}
        </Card>
      )}

      {/* TAB: Lembur Diajukan */}
      {canManageAttendance && tab === "overtime" && <OvertimeApprovalPanel />}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {canManageAttendance && <ClockInModal
        open={showClockIn}
        onClose={() => setShowClockIn(false)}
        employee={clockInEmp}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["hris", "attendance"] })}
      />}

      {canManageAttendance && <ManualModal
        open={showManual}
        onClose={() => setShowManual(false)}
        employees={employees}
        onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "attendance"] })}
      />}

      {selfieRec && selfieRec.selfie_url && (() => {
        const emp = employees.find(e => e.id === selfieRec.employee_id);
        return (
          <SelfieModal
            open={!!selfieRec}
            onClose={() => setSelfieRec(null)}
            selfie_url={selfieRec.selfie_url!}
            face_verified={selfieRec.face_verified}
            face_confidence={selfieRec.face_confidence}
            employee_name={emp?.full_name ?? `Karyawan #${selfieRec.employee_id}`}
            date={selfieRec.date}
          />
        );
      })()}

    </div>
  );
}
