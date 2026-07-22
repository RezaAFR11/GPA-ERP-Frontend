"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Play,
  PlusCircle,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisEmployeesApi, hrisPayrollApi, hrisSalaryApi } from "@/lib/api";
import { useRole } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { PayrollPeriod, PayrollRun } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NewPeriodModal } from "./components/new-period-modal";
import { SlipModal } from "./components/payslip-modal";
import { SalaryModal } from "./components/salary-structure-modal";
import { downloadBlob, fmtRp, MONTHS, STATUS_STYLE } from "./payroll-utils";

type PayrollSortKey = "employee" | "gross" | "bpjs_tk" | "bpjs_kes" | "pph21" | "thr" | "net";

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
