"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Fingerprint, CalendarDays, Banknote, Clock, CheckCircle2,
  LogIn, MapPin, ChevronRight, TimerOff, FolderOpen, Edit3,
} from "lucide-react";
import { hrisMeApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import ClockInModal from "@/features/hris/attendance/components/clock-in-modal";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";

// ── Data Change Request button + modal ────────────────────────────────────────

const CHANGEABLE_FIELDS = [
  { key: "phone",        label: "Nomor Telepon" },
  { key: "email",        label: "Email" },
  { key: "bank_name",    label: "Nama Bank" },
  { key: "bank_account", label: "Nomor Rekening" },
  { key: "npwp",         label: "NPWP" },
  { key: "bpjs_tk_no",   label: "No. BPJS Ketenagakerjaan" },
  { key: "bpjs_kes_no",  label: "No. BPJS Kesehatan" },
];

function DataChangeButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ field_name: "phone", new_value: "", reason: "" });

  const submitMut = useMutation({
    mutationFn: () => hrisMeApi.submitDataChangeRequest({
      field_name: form.field_name,
      new_value: form.new_value,
      reason: form.reason || undefined,
    }),
    onSuccess: () => {
      toastSuccess("Permintaan perubahan data berhasil dikirim");
      setOpen(false);
      setForm({ field_name: "phone", new_value: "", reason: "" });
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <>
      <button onClick={() => setOpen(true)} className="h-full">
        <Card className="border hover:border-teal-400 hover:bg-teal-50/40 transition-all cursor-pointer h-full">
          <div className="p-3 flex flex-col items-center gap-1.5 text-center">
            <Edit3 size={22} className="text-teal-600" />
            <span className="text-xs font-medium text-gray-700">Perbarui Data</span>
          </div>
        </Card>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Permintaan Perubahan Data">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bidang yang Ingin Diubah</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.field_name} onChange={e => setForm(f => ({ ...f, field_name: e.target.value }))}>
              {CHANGEABLE_FIELDS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nilai Baru</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.new_value} onChange={e => setForm(f => ({ ...f, new_value: e.target.value }))}
              maxLength={255}
              placeholder="Masukkan nilai baru..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alasan Perubahan (opsional)</label>
            <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              maxLength={1000}
              placeholder="cth: nomor rekening lama sudah tidak aktif" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            Perubahan akan diproses oleh HR. Data lama tetap berlaku sampai disetujui.
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" loading={submitMut.isPending}
              className="bg-teal-700 hover:bg-teal-600 border-teal-700"
              disabled={!form.new_value.trim()}
              onClick={() => submitMut.mutate()}>Kirim Permintaan</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

const MONTH_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function formatTime(iso: string | null | undefined) {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

export default function HrisMePage() {
  const { canAccessMenu } = useAuth();
  const [showClockIn, setShowClockIn] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const today = new Date();

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    setShowInstallBanner(false);
  }

  function dismissBanner() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setShowInstallBanner(false);
  }

  const canAttendance = canAccessMenu("hris_attendance");
  const canLeave = canAccessMenu("hris_leave");
  const canPayslip = canAccessMenu("hris_my_payslip");

  const {
    data: profile,
    error: profileError,
    isError: profileIsError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["hris-me-profile"],
    queryFn: () => hrisMeApi.getProfile().then((r) => r.data),
  });

  const {
    data: attendance,
    error: attendanceError,
    isError: attendanceIsError,
    isLoading: attendanceIsLoading,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ["hris-me-attendance", today.getFullYear(), today.getMonth() + 1],
    queryFn: () => hrisMeApi.getAttendance(today.getFullYear(), today.getMonth() + 1).then((r) => r.data),
    enabled: canAttendance,
  });

  const {
    data: leaveBalances,
    error: leaveError,
    isError: leaveIsError,
    refetch: refetchLeave,
  } = useQuery({
    queryKey: ["hris-me-leave-balance"],
    queryFn: () => hrisMeApi.getLeaveBalance().then((r) => r.data),
    enabled: canLeave,
  });

  const {
    data: payslips,
    error: payslipError,
    isError: payslipIsError,
    refetch: refetchPayslips,
  } = useQuery({
    queryKey: ["hris-me-payslips"],
    queryFn: () => hrisMeApi.getPayslips().then((r) => r.data),
    enabled: canPayslip,
  });

  const clockState   = attendance?.clock_state ?? "not_clocked_in";
  const todayRecord  = attendance?.today;
  const latestPayslip = payslips?.[0];
  const annualLeave  = leaveBalances?.find((b) => b.code === "TAHUNAN");

  if (profileIsError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <QueryErrorState error={profileError} onRetry={() => refetchProfile()} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
          <span className="text-xl">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-teal-900">Pasang GPA di layar utama</p>
            <p className="text-[11px] text-teal-600">Akses lebih cepat tanpa buka browser</p>
          </div>
          <button onClick={handleInstall} className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors">
            Pasang
          </button>
          <button onClick={dismissBanner} className="text-teal-400 hover:text-teal-600 text-xs px-1">
            Nanti
          </button>
        </div>
      )}

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            Halo, {profile?.full_name?.split(" ")[0] ?? "—"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {[profile?.employee_no, profile?.department?.name, profile?.site].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-base border-2 border-teal-200">
          {profile?.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2) ?? "?"}
        </div>
      </div>

      {/* Clock-in Card */}
      {canAttendance && attendanceIsLoading && (
        <Card className="border p-4 text-sm text-gray-400">Memuat status absensi...</Card>
      )}
      {canAttendance && attendanceIsError && (
        <QueryErrorState error={attendanceError} onRetry={() => refetchAttendance()} compact />
      )}
      {canAttendance && attendance && <Card className={cn(
        "border-2 transition-colors",
        clockState === "clocked_in"     && "border-teal-400 bg-teal-50",
        clockState === "clocked_out"    && "border-gray-200 bg-gray-50",
        clockState === "not_clocked_in" && "border-amber-300 bg-amber-50",
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                clockState === "clocked_in"     && "bg-teal-500 text-white",
                clockState === "clocked_out"    && "bg-gray-400 text-white",
                clockState === "not_clocked_in" && "bg-amber-400 text-white",
              )}>
                {clockState === "clocked_in"  ? <CheckCircle2 size={20} /> :
                 clockState === "clocked_out" ? <Clock size={20} /> :
                 <LogIn size={20} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {clockState === "clocked_in"     ? "Sedang Bekerja" :
                   clockState === "clocked_out"    ? "Sudah Selesai" :
                   "Belum Absen Masuk"}
                </p>
                {todayRecord?.clock_in && (
                  <p className="text-xs text-gray-500">
                    Masuk: {formatTime(todayRecord.clock_in)}
                    {todayRecord.clock_out && ` · Keluar: ${formatTime(todayRecord.clock_out)}`}
                  </p>
                )}
                {todayRecord?.latitude != null && (
                  <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                    <MapPin size={9} />
                    {Number(todayRecord.latitude).toFixed(5)}, {Number(todayRecord.longitude).toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {clockState !== "clocked_out" && (
              <Button
                size="sm"
                onClick={() => setShowClockIn(true)}
                className={cn(
                  "text-xs font-semibold text-white",
                  clockState === "clocked_in"
                    ? "bg-gray-600 hover:bg-gray-700 border-gray-600"
                    : "bg-teal-600 hover:bg-teal-700 border-teal-600",
                )}
              >
                {clockState === "clocked_in" ? "Absen Keluar" : "Absen Masuk"}
              </Button>
            )}
          </div>

          {attendance && (
            <div className="mt-3 pt-3 border-t border-dashed flex gap-6 text-xs text-gray-500">
              <div>
                <span className="font-semibold text-gray-700">{attendance.summary.attendance_days}</span>
                {" "}hari hadir
              </div>
              <div>
                <span className="font-semibold text-gray-700">{attendance.summary.total_hours.toFixed(1)}</span>
                {" "}jam bulan ini
              </div>
            </div>
          )}
        </div>
      </Card>}

      {/* Quick Links Grid */}
      <div className="grid grid-cols-3 gap-3">
        {canAttendance && <Link href="/hris/me/attendance">
          <Card className="border hover:border-teal-400 hover:bg-teal-50/40 transition-all cursor-pointer h-full">
            <div className="p-3 flex flex-col items-center gap-1.5 text-center">
              <Fingerprint size={22} className="text-teal-600" />
              <span className="text-xs font-medium text-gray-700">Riwayat Absensi</span>
            </div>
          </Card>
        </Link>}
        {canLeave && <Link href="/hris/me/leave">
          <Card className="border hover:border-purple-400 hover:bg-purple-50/40 transition-all cursor-pointer h-full">
            <div className="p-3 flex flex-col items-center gap-1.5 text-center">
              <CalendarDays size={22} className="text-purple-600" />
              <span className="text-xs font-medium text-gray-700">Cuti & Izin</span>
              {annualLeave && (
                <Badge className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-200">
                  {annualLeave.remaining} hari
                </Badge>
              )}
            </div>
          </Card>
        </Link>}
        {canPayslip && <Link href="/hris/me/payslip">
          <Card className="border hover:border-orange-400 hover:bg-orange-50/40 transition-all cursor-pointer h-full">
            <div className="p-3 flex flex-col items-center gap-1.5 text-center">
              <Banknote size={22} className="text-orange-600" />
              <span className="text-xs font-medium text-gray-700">Slip Gaji</span>
            </div>
          </Card>
        </Link>}
        {/* Enhancement Pack — new quick actions */}
        {canAttendance && <Link href="/hris/me/overtime">
          <Card className="border hover:border-amber-400 hover:bg-amber-50/40 transition-all cursor-pointer h-full">
            <div className="p-3 flex flex-col items-center gap-1.5 text-center">
              <TimerOff size={22} className="text-amber-600" />
              <span className="text-xs font-medium text-gray-700">Lembur</span>
            </div>
          </Card>
        </Link>}
        {canPayslip && <Link href="/hris/me/documents">
          <Card className="border hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer h-full">
            <div className="p-3 flex flex-col items-center gap-1.5 text-center">
              <FolderOpen size={22} className="text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Dokumen Saya</span>
            </div>
          </Card>
        </Link>}
        <DataChangeButton />
      </div>

      {canLeave && leaveIsError && (
        <QueryErrorState error={leaveError} onRetry={() => refetchLeave()} compact />
      )}
      {canPayslip && payslipIsError && (
        <QueryErrorState error={payslipError} onRetry={() => refetchPayslips()} compact />
      )}

      {/* Latest Payslip */}
      {latestPayslip && (
        <Link href="/hris/me/payslip">
          <Card className="border hover:border-orange-300 transition-colors cursor-pointer">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Slip Gaji Terakhir</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {MONTH_NAMES[latestPayslip.month - 1]} {latestPayslip.year}
                  </p>
                  <p className="text-lg font-bold text-orange-600 mt-1">
                    {formatCurrency(latestPayslip.net_salary)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Total penghasilan: {formatCurrency(latestPayslip.total_earnings)}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Leave Balances */}
      {leaveBalances && leaveBalances.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sisa Cuti</p>
            <Link href="/hris/me/leave" className="text-xs text-teal-600 hover:underline">Lihat semua</Link>
          </div>
          <div className="space-y-2">
            {leaveBalances.filter((b) => b.max_days !== null).map((b) => (
              <div key={b.leave_type_id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-700 font-medium">{b.name}</span>
                    <span className="text-xs text-gray-400">{b.remaining}/{b.accrued} hari</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-400 transition-all"
                      style={{ width: `${b.accrued ? (b.remaining / b.accrued) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showClockIn && (
        <ClockInModal
          mode={clockState === "clocked_in" ? "clock-out" : "clock-in"}
          onClose={() => setShowClockIn(false)}
          onSuccess={() => { setShowClockIn(false); refetchAttendance(); }}
        />
      )}
    </div>
  );
}
