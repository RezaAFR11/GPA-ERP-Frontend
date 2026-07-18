"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote, Lock, Unlock, Play,
  CheckCircle2, PlusCircle, Download, FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisPayrollApi, hrisSalaryApi, hrisEmployeesApi } from "@/lib/api";
import type { PayrollPeriod, PayrollRun, SalaryComponent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";

type PayrollSortKey = "employee" | "gross" | "bpjs_tk" | "bpjs_kes" | "pph21" | "thr" | "net";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function fmtRp(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_STYLE: Record<string, string> = {
  OPEN:   "bg-blue-50 text-blue-700 border-blue-200",
  LOCKED: "bg-amber-50 text-amber-700 border-amber-200",
  POSTED: "bg-teal-50 text-teal-700 border-teal-200",
};

/* ─── Blob download helper ───────────────────────────────────────────────── */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ─── Slip modal ─────────────────────────────────────────────────────────── */
function SlipModal({ run, onClose }: { run: PayrollRun | null; onClose: () => void }) {
  const [dlPdf, setDlPdf] = useState(false);

  const { data: slip, isLoading } = useQuery({
    queryKey: ["payslip", run?.id],
    queryFn:  () => hrisPayrollApi.getSlip(run!.id).then(r => r.data),
    enabled:  !!run,
  });

  async function handlePdfDownload() {
    if (!run) return;
    setDlPdf(true);
    try {
      const res = await hrisPayrollApi.downloadSlipPdf(run.id);
      downloadBlob(res.data, `slip-gaji-${run.id}.pdf`);
    } finally { setDlPdf(false); }
  }

  const row = (label: string, value: string, cls = "") => (
    <div className={cn("flex justify-between items-center py-1.5 border-b border-gray-50 text-sm", cls)}>
      <span className="text-gray-600">{label}</span>
      <span className="font-mono font-semibold text-gray-900">{value}</span>
    </div>
  );

  return (
    <Modal open={!!run} onClose={onClose} title="Slip Gaji" size="md"
      subtitle={slip ? `${slip.employee_name as string} · ${slip.period as string}` : undefined}
      footer={slip ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={handlePdfDownload} disabled={dlPdf}
            className="bg-orange-600 hover:bg-orange-700 text-white">
            <FileText size={13} className="mr-1.5" />
            {dlPdf ? "Mengunduh…" : "Download PDF"}
          </Button>
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
      ) : slip ? (
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Departemen</p>
            <p className="text-sm font-medium text-gray-900">{(slip.department as string) ?? "—"}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pendapatan</p>
            {row("Gaji Kotor (Gross)", fmtRp(slip.gross_salary as number))}
          </div>
          <div className="space-y-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-2">Potongan</p>
            {row("BPJS TK (Karyawan)",  fmtRp(slip.bpjs_tk_employee as number))}
            {row("BPJS Kes (Karyawan)", fmtRp(slip.bpjs_kes_employee as number))}
            {row("PPh 21 (" + (slip.pph21_method as string) + ")", fmtRp(slip.pph21_amount as number))}
          </div>
          {slip.thr_amount != null && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-2">THR</p>
              {row("Tunjangan Hari Raya", fmtRp(slip.thr_amount as number), "text-amber-700")}
            </div>
          )}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-bold text-teal-800">Gaji Bersih (Net)</p>
            <p className="text-lg font-bold text-teal-700 font-mono">{fmtRp(slip.net_salary as number)}</p>
          </div>
          <div className="text-[11px] text-gray-400 text-center mt-2">
            Kontribusi Perusahaan: BPJS TK {fmtRp(slip.bpjs_tk_employer as number)} · BPJS Kes {fmtRp(slip.bpjs_kes_employer as number)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">Tidak ada data slip</p>
      )}
    </Modal>
  );
}

/* ─── New period modal ────────────────────────────────────────────────────── */
function NewPeriodModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [err,   setErr]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await hrisPayrollApi.createPeriod(year, month);
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal membuat periode");
    } finally { setSaving(false); }
  }

  const sel = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <Modal open={open} onClose={onClose} title="Buka Periode Payroll" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? "Membuat…" : "Buat Periode"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              min={2020} max={2035} className={sel} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bulan</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={sel}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Salary assignments modal ────────────────────────────────────────────── */
function SalaryModal({
  open, onClose, employees, components,
}: {
  open: boolean; onClose: () => void;
  employees: { id: number; employee_no: string; full_name: string }[];
  components: SalaryComponent[];
}) {
  const qc = useQueryClient();
  const [empId,  setEmpId]  = useState("");
  const [compId, setCompId] = useState("");
  const [amount, setAmount] = useState("");
  const [from,   setFrom]   = useState(new Date().toISOString().slice(0, 10));
  const [err,    setErr]    = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ["hris", "salary-assignments", empId],
    queryFn:  () => hrisSalaryApi.listAssignments(empId ? Number(empId) : undefined).then(r => r.data),
  });

  async function save() {
    if (!empId || !compId || !amount) { setErr("Semua field wajib diisi"); return; }
    setSaving(true); setErr(null);
    try {
      await hrisSalaryApi.createAssignment({
        employee_id: Number(empId), component_id: Number(compId),
        amount: Number(amount), effective_from: from,
      });
      qc.invalidateQueries({ queryKey: ["hris", "salary-assignments"] });
      setAmount(""); setCompId("");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <Modal open={open} onClose={onClose} title="Struktur Gaji Karyawan" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tambah Komponen Gaji</p>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <select value={empId} onChange={e => setEmpId(e.target.value)} className={field}>
            <option value="">— Pilih karyawan —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_no} · {e.full_name}</option>)}
          </select>
          <select value={compId} onChange={e => setCompId(e.target.value)} className={field}>
            <option value="">— Pilih komponen —</option>
            {components.map(c => <option key={c.id} value={c.id}>{c.name} ({c.component_type})</option>)}
          </select>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Jumlah (Rp)" className={field} />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={field} />
          <Button onClick={save} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? "Menyimpan…" : "Tambah"}
          </Button>
        </div>

        {/* Current assignments */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Komponen Aktif</p>
          {assignments.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Pilih karyawan untuk melihat struktur gaji</p>
          ) : (
            <div className="space-y-1.5">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{a.component.name}</p>
                    <p className="text-[11px] text-gray-400">{a.component.component_type}</p>
                  </div>
                  <p className="text-xs font-mono font-semibold text-gray-700">{fmtRp(a.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function PayrollPage() {
  const qc = useQueryClient();
  const { hasRole } = useRole();
  const canManagePayroll = hasRole("SUPER_ADMIN", "MD");
  const canPostPayroll = hasRole("SUPER_ADMIN", "MD", "FINANCE");
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [slipRun,    setSlipRun]    = useState<PayrollRun | null>(null);
  const [showNew,    setShowNew]    = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const tableSort = useTableSort<PayrollSortKey>("employee", "asc");

  /* Periods */
  const { data: periods = [], isLoading: perLoad } = useQuery({
    queryKey: ["hris", "payroll", "periods"],
    queryFn:  () => hrisPayrollApi.listPeriods().then(r => r.data),
  });

  /* Runs for selected period */
  const { data: runs = [], isLoading: runLoad } = useQuery({
    queryKey: ["hris", "payroll", "runs", selectedPeriod?.id],
    queryFn:  () => hrisPayrollApi.listRuns({ period_id: selectedPeriod!.id }).then(r => r.data),
    enabled:  !!selectedPeriod,
  });
  const sortedRuns = sortTableRows(runs, tableSort.sortKey, tableSort.sortDirection, {
    employee: (run) => run.employee?.full_name,
    gross: (run) => run.gross_salary,
    bpjs_tk: (run) => run.bpjs_tk_employee,
    bpjs_kes: (run) => run.bpjs_kes_employee,
    pph21: (run) => run.pph21_amount,
    thr: (run) => run.thr_amount,
    net: (run) => run.net_salary,
  });

  /* Employees + components for salary modal */
  const { data: empData } = useQuery({
    queryKey: ["hris", "employees", { limit: 500 }],
    queryFn:  () => hrisEmployeesApi.list({ limit: 500 }).then(r => r.data),
    enabled:  showSalary,
  });
  const { data: components = [] } = useQuery({
    queryKey: ["hris", "salary-components"],
    queryFn:  () => hrisSalaryApi.listComponents().then(r => r.data),
    enabled:  showSalary,
  });

  const lockMut = useMutation({
    mutationFn: (id: number) => hrisPayrollApi.lockPeriod(id),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ["hris", "payroll", "periods"] });
      qc.invalidateQueries({ queryKey: ["hris", "payroll", "runs"] });
      setSelectedPeriod(res.data);
      toastSuccess("Periode payroll dikunci");
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal mengunci periode"),
  });

  const unlockMut = useMutation({
    mutationFn: (id: number) => hrisPayrollApi.unlockPeriod(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["hris", "payroll", "periods"] });
      setSelectedPeriod(res.data);
      toastSuccess("Periode payroll dibuka kembali");
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal membuka periode"),
  });

  const calcMut = useMutation({
    mutationFn: (id: number) => hrisPayrollApi.calculate(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["hris", "payroll", "runs", selectedPeriod?.id] });
      toastSuccess("Payroll berhasil dihitung");
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menghitung payroll"),
  });

  const postMut = useMutation({
    mutationFn: (id: number) => hrisPayrollApi.postPeriod(id),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ["hris", "payroll", "periods"] });
      setSelectedPeriod(res.data);
      toastSuccess("Payroll berhasil diposting ke ERP");
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal memposting payroll"),
  });

  const [exportingBank, setExportingBank] = useState(false);
  async function handleBankExport(bank = "BCA") {
    if (!selectedPeriod) return;
    setExportingBank(true);
    try {
      const res = await hrisPayrollApi.exportBankCsv(selectedPeriod.id, bank);
      const MONTHS_ID = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      downloadBlob(res.data, `payroll-${MONTHS_ID[selectedPeriod.month]}-${selectedPeriod.year}-${bank}.csv`);
    } catch (e: unknown) {
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal mengunduh Bank CSV");
    } finally { setExportingBank(false); }
  }

  const [exportingBpjs, setExportingBpjs] = useState(false);
  async function handleBpjsExport() {
    if (!selectedPeriod) return;
    setExportingBpjs(true);
    try {
      const res = await hrisPayrollApi.exportBpjs(selectedPeriod.id);
      const MONTHS_ID = ["","Januari","Februari","Maret","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
      downloadBlob(res.data, `bpjs-${MONTHS_ID[selectedPeriod.month]}-${selectedPeriod.year}.xlsx`);
    } catch (e: unknown) {
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal mengunduh laporan BPJS");
    } finally { setExportingBpjs(false); }
  }

  async function handleForm1721Export(employeeId: number, employeeName: string) {
    try {
      const year = selectedPeriod?.year ?? new Date().getFullYear();
      const res = await hrisPayrollApi.exportForm1721(employeeId, year);
      downloadBlob(res.data, `1721-A1-${employeeName.replace(/\s+/g, "-")}-${year}.xlsx`);
    } catch (e: unknown) {
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal mengunduh Form 1721-A1");
    }
  }

  // Summary for selected period
  const totalGross = runs.reduce((s, r) => s + r.gross_salary, 0);
  const totalNet   = runs.reduce((s, r) => s + r.net_salary,   0);
  const totalBPJS  = runs.reduce((s, r) => s + r.bpjs_tk_employee + r.bpjs_kes_employee, 0);
  const totalPPh21 = runs.reduce((s, r) => s + r.pph21_amount, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote size={20} className="text-orange-600" /> Penggajian (Payroll)
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Kalkulasi gaji, BPJS & PPh 21 per periode</p>
        </div>
        {canManagePayroll && <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSalary(true)}
            className="border border-gray-200 text-gray-700">
            <PlusCircle size={14} className="mr-1.5" /> Struktur Gaji
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white">
            <PlusCircle size={14} className="mr-1.5" /> Buka Periode
          </Button>
        </div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Periods list */}
        <Card padding={false} className="xl:col-span-1">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Periode Payroll</p>
          </div>
          <div className="divide-y divide-gray-50">
            {perLoad
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-3"><Skeleton className="h-12 w-full" /></div>
                ))
              : periods.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Belum ada periode</p>
                : periods.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPeriod(p)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                        selectedPeriod?.id === p.id ? "bg-orange-50 border-l-2 border-orange-500" : ""
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {MONTHS[p.month - 1]} {p.year}
                        </p>
                        <Badge className={STATUS_STYLE[p.status] ?? ""}>{p.status}</Badge>
                      </div>
                    </button>
                  ))
            }
          </div>
        </Card>

        {/* Right: Runs + actions */}
        <div className="xl:col-span-2 space-y-4">
          {!selectedPeriod ? (
            <Card className="text-center py-12">
              <Banknote size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Pilih periode di kiri untuk melihat detailnya</p>
            </Card>
          ) : (
            <>
              {/* Actions bar */}
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {MONTHS[selectedPeriod.month - 1]} {selectedPeriod.year}
                    </p>
                    <p className="text-xs text-gray-400">{runs.length} karyawan · {selectedPeriod.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {canManagePayroll && selectedPeriod.status === "OPEN" && (
                      <>
                        <Button size="sm"
                          onClick={() => calcMut.mutate(selectedPeriod.id)}
                          disabled={calcMut.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Play size={13} className="mr-1.5" />
                          {calcMut.isPending ? "Menghitung…" : "Hitung"}
                        </Button>
                        <Button size="sm"
                          onClick={() => lockMut.mutate(selectedPeriod.id)}
                          disabled={lockMut.isPending || runs.length === 0}
                          className="bg-amber-500 hover:bg-amber-600 text-white">
                          <Lock size={13} className="mr-1.5" /> Kunci
                        </Button>
                      </>
                    )}
                    {canPostPayroll && selectedPeriod.status === "LOCKED" && (
                      <Button size="sm"
                        onClick={() => postMut.mutate(selectedPeriod.id)}
                        disabled={postMut.isPending || unlockMut.isPending}
                        className="bg-teal-600 hover:bg-teal-700 text-white">
                        <CheckCircle2 size={13} className="mr-1.5" />
                        {postMut.isPending ? "Memposting…" : "Posting ke ERP"}
                      </Button>
                    )}
                    {canManagePayroll && selectedPeriod.status === "LOCKED" && (
                      <Button size="sm" variant="ghost"
                        onClick={() => unlockMut.mutate(selectedPeriod.id)}
                        disabled={unlockMut.isPending || postMut.isPending}
                        className="border border-amber-200 text-amber-700 hover:bg-amber-50">
                        <Unlock size={13} className="mr-1.5" />
                        {unlockMut.isPending ? "Membuka…" : "Buka Kunci"}
                      </Button>
                    )}
                    {canPostPayroll && (selectedPeriod.status === "LOCKED" || selectedPeriod.status === "POSTED") && (
                      <>
                        <Button variant="ghost" size="sm"
                          onClick={() => handleBankExport("BCA")}
                          disabled={exportingBank}
                          className="border border-gray-200">
                          <Download size={13} className="mr-1.5" />
                          {exportingBank ? "Mengunduh…" : "Bank CSV"}
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={handleBpjsExport}
                          disabled={exportingBpjs}
                          className="border border-purple-200 text-purple-700 hover:bg-purple-50">
                          <FileText size={13} className="mr-1.5" />
                          {exportingBpjs ? "Mengunduh…" : "BPJS Excel"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Summary KPIs */}
              {runs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Gross",  value: totalGross,  color: "text-gray-900" },
                    { label: "Total BPJS",   value: totalBPJS,   color: "text-blue-600" },
                    { label: "Total PPh 21", value: totalPPh21,  color: "text-amber-600" },
                    { label: "Total Net",    value: totalNet,    color: "text-teal-600" },
                  ].map(kpi => (
                    <Card key={kpi.label} className="text-center">
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{kpi.label}</p>
                      <p className={cn("text-sm font-bold mt-1 font-mono", kpi.color)}>{fmtRp(kpi.value)}</p>
                    </Card>
                  ))}
                </div>
              )}

              {/* Runs table */}
              <Card padding={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <SortableTableHeader label="Karyawan" column="employee" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <SortableTableHeader label="Gross" column="gross" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <SortableTableHeader label="BPJS TK" column="bpjs_tk" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <SortableTableHeader label="BPJS Kes" column="bpjs_kes" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <SortableTableHeader label="PPh 21" column="pph21" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <SortableTableHeader label="THR" column="thr" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <SortableTableHeader label="Net" column="net" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                        <th className="th">Slip</th>
                        <th className="th">1721-A1</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {runLoad
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                            ))}</tr>
                          ))
                        : runs.length === 0
                          ? (
                              <tr>
                                <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                                  {canManagePayroll
                                    ? <>Klik <strong>Hitung</strong> untuk menjalankan kalkulasi payroll</>
                                    : "Belum ada hasil payroll pada periode ini"}
                                </td>
                              </tr>
                            )
                          : sortedRuns.map(r => (
                              <tr key={r.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3">
                                  <p className="text-xs font-medium text-gray-900">{r.employee?.full_name ?? `#${r.employee_id}`}</p>
                                  <p className="text-[11px] text-gray-400">{r.employee?.employee_no}</p>
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-gray-700">{fmtRp(r.gross_salary)}</td>
                                <td className="px-4 py-3 text-xs font-mono text-blue-600">{fmtRp(r.bpjs_tk_employee)}</td>
                                <td className="px-4 py-3 text-xs font-mono text-blue-600">{fmtRp(r.bpjs_kes_employee)}</td>
                                <td className="px-4 py-3 text-xs font-mono text-amber-600">{fmtRp(r.pph21_amount)}</td>
                                <td className="px-4 py-3 text-xs font-mono text-purple-600">{r.thr_amount != null ? fmtRp(r.thr_amount) : "—"}</td>
                                <td className="px-4 py-3 text-xs font-mono font-bold text-teal-700">{fmtRp(r.net_salary)}</td>
                                <td className="px-4 py-3">
                                  <button onClick={() => setSlipRun(r)}
                                    className="text-xs text-orange-600 hover:text-orange-800 font-medium underline">
                                    Slip
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleForm1721Export(
                                      r.employee_id,
                                      r.employee?.full_name ?? String(r.employee_id)
                                    )}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-medium underline"
                                    title="Unduh Form 1721-A1 tahunan">
                                    1721-A1
                                  </button>
                                </td>
                              </tr>
                            ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {canManagePayroll && (
        <NewPeriodModal
          open={showNew}
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "payroll", "periods"] })}
        />
      )}
      {canManagePayroll && (
        <SalaryModal
          open={showSalary}
          onClose={() => setShowSalary(false)}
          employees={empData?.items ?? []}
          components={components}
        />
      )}

      <SlipModal run={slipRun} onClose={() => setSlipRun(null)} />
    </div>
  );
}
