"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Fingerprint, Download, PlusCircle, Camera, Clock, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { ClockInModal } from "./components/clock-in-modal";
import { hrisAttendanceApi, hrisEmployeesApi } from "@/lib/api";
import type { AttendanceRecord, AttendanceSummaryItem, Employee } from "@/lib/types";
import { cn } from "@/lib/utils";

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

function faceChip(rec: AttendanceRecord) {
  if (!rec.selfie_url) return null;
  if (rec.face_verified)
    return (
      <Badge className="bg-teal-50 text-teal-700 border-teal-200">
        ✓ Face {((rec.face_confidence ?? 0) * 100).toFixed(0)}%
      </Badge>
    );
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200">⚠ Review</Badge>;
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

/* ─── Face Registration modal ────────────────────────────────────────────── */
function FaceRegModal({
  open, onClose, employees,
}: {
  open: boolean; onClose: () => void; employees: Employee[];
}) {
  const [empId, setEmpId] = useState("");
  const [file,  setFile]  = useState<File | null>(null);
  const [msg,   setMsg]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!empId || !file) { setMsg("Pilih karyawan dan foto"); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await hrisEmployeesApi.registerFace(Number(empId), file);
      setMsg(res.data.message);
    } catch (e: unknown) {
      setMsg((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal registrasi wajah");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500";

  return (
    <Modal open={open} onClose={onClose} title="Registrasi Wajah Karyawan" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Tutup</Button>
          <Button onClick={save} disabled={saving}
            className="bg-purple-700 hover:bg-purple-800 text-white">
            {saving ? "Mendaftar…" : "Daftarkan Wajah"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {msg && (
          <p className={cn("text-xs rounded-lg px-3 py-2",
            msg.includes("Gagal") || msg.includes("error")
              ? "bg-red-50 text-red-600"
              : "bg-teal-50 text-teal-700"
          )}>{msg}</p>
        )}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Foto Wajah (JPG/PNG)</label>
          <input type="file" accept="image/*"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-600" />
          <p className="text-[11px] text-gray-400 mt-1">
            Pastikan wajah terlihat jelas, pencahayaan cukup, tidak memakai kacamata/masker.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function AttendancePage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [tab, setTab]     = useState<"list" | "summary">("list");

  const [showClockIn,  setShowClockIn]  = useState(false);
  const [showManual,   setShowManual]   = useState(false);
  const [showFaceReg,  setShowFaceReg]  = useState(false);
  const [clockInEmp,   setClockInEmp]   = useState<Employee | null>(null);

  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateToRaw = new Date(year, month, 0);
  const dateTo   = `${year}-${String(month).padStart(2, "0")}-${String(dateToRaw.getDate()).padStart(2, "0")}`;

  /* Employees for dropdowns */
  const { data: empData } = useQuery({
    queryKey: ["hris", "employees", { limit: 500 }],
    queryFn:  () => hrisEmployeesApi.list({ limit: 500 }).then(r => r.data),
  });
  const employees = empData?.items ?? [];

  /* Attendance list */
  const { data: attData, isLoading: attLoad } = useQuery({
    queryKey: ["hris", "attendance", { dateFrom, dateTo }],
    queryFn:  () => hrisAttendanceApi.list({ date_from: dateFrom, date_to: dateTo, limit: 500 }).then(r => r.data),
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

  /* Filtering */
  const filtered = records.filter(r => {
    if (!search) return true;
    const emp = employees.find(e => e.id === r.employee_id);
    const name = emp?.full_name.toLowerCase() ?? "";
    const no   = emp?.employee_no.toLowerCase() ?? "";
    const s    = search.toLowerCase();
    return name.includes(s) || no.includes(s) || r.date.includes(s);
  });

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
          <Button variant="ghost" size="sm" onClick={() => setShowFaceReg(true)}
            className="text-purple-700 hover:bg-purple-50 border border-purple-200">
            <Camera size={14} className="mr-1.5" /> Daftarkan Wajah
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowManual(true)}
            className="text-gray-700 border border-gray-200">
            <PlusCircle size={14} className="mr-1.5" /> Manual
          </Button>
          <Button size="sm"
            className="bg-purple-700 hover:bg-purple-800 text-white"
            onClick={() => {
              const emp = employees[0] ?? null;
              setClockInEmp(emp);
              setShowClockIn(true);
            }}
          >
            <Clock size={14} className="mr-1.5" /> Clock-In
          </Button>
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
            {(["list", "summary"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {t === "list" ? "Detail" : "Ringkasan"}
              </button>
            ))}
          </div>

          {tab === "list" && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari karyawan…"
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-48"
              />
            </div>
          )}
        </div>
      </Card>

      {/* TAB: Detail */}
      {tab === "list" && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Tanggal","Karyawan","Masuk","Keluar","Jam Kerja","Lembur","Sumber","Face",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
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
                          <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                            Belum ada data absensi untuk periode ini
                          </td>
                        </tr>
                      )
                    : filtered.map(rec => {
                        const emp  = employees.find(e => e.id === rec.employee_id);
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
                            <td className="px-4 py-3">{faceChip(rec)}</td>
                            <td className="px-4 py-3">
                              {!hasClockOut && rec.clock_in && (
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
      )}

      {/* TAB: Summary */}
      {tab === "summary" && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Karyawan","Departemen","Hari Hadir","Jam Normal","Lembur WD","Lembur WE","Lembur Libur","Total Jam"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
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
                    : (summary as AttendanceSummaryItem[]).map(row => (
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
            <div className="px-5 py-3 border-t border-gray-50 flex justify-end">
              <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                <Download size={13} /> Export CSV
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ClockInModal
        open={showClockIn}
        onClose={() => setShowClockIn(false)}
        employee={clockInEmp}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["hris", "attendance"] })}
      />

      <ManualModal
        open={showManual}
        onClose={() => setShowManual(false)}
        employees={employees}
        onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "attendance"] })}
      />

      <FaceRegModal
        open={showFaceReg}
        onClose={() => setShowFaceReg(false)}
        employees={employees}
      />
    </div>
  );
}
