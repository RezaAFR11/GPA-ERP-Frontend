"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { expensesApi, hrisAttendanceApi, reportsApi } from "@/lib/api";
import { useAuth, useRole } from "@/lib/auth-context";
import { toastError } from "@/lib/hooks/use-toast";
import { getStoredCurrency } from "@/lib/utils";
import { downloadBlob } from "../lib/download-blob";

export function DownloadTab() {
  const { canAccessMenu } = useAuth();
  const { isFinance, isMD, isPM, isCostControl, isHR } = useRole();
  const canPayroll  = isFinance || isMD;                 // payroll-summary: FINANCE/MD/SUPER_ADMIN
  const canProjFin  = isMD || isCostControl || isFinance; // project-financial: MD/COST_CONTROL/FINANCE/SUPER_ADMIN
  const canPettyExport = (isFinance || isHR) && canAccessMenu("petty_cash");
  const canAttendance = canAccessMenu("hris_attendance") && (
    isPM || isFinance || isCostControl || isHR
  );

  const thisYear  = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;

  // Laporan Pengeluaran
  const [expDateFrom, setExpDateFrom] = useState("");
  const [expDateTo,   setExpDateTo]   = useState("");
  const [expStatus,   setExpStatus]   = useState("");
  const [expLoading,  setExpLoading]  = useState(false);

  // Absensi Bulanan
  const [attYear,     setAttYear]     = useState(String(thisYear));
  const [attMonth,    setAttMonth]    = useState(String(thisMonth));
  const [attEmpId,    setAttEmpId]    = useState("");
  const [attLoading,  setAttLoading]  = useState(false);

  // Rekap Payroll
  const [payYear,     setPayYear]     = useState(String(thisYear));
  const [payMonth,    setPayMonth]    = useState(String(thisMonth));
  const [payLoading,  setPayLoading]  = useState(false);

  // Keuangan Proyek
  const [projYear,    setProjYear]    = useState(String(thisYear));
  const [projStatus,  setProjStatus]  = useState("");
  const [projLoading, setProjLoading] = useState(false);

  // Rekap Petty Cash
  const [pcDateFrom,  setPcDateFrom]  = useState("");
  const [pcDateTo,    setPcDateTo]    = useState("");
  const [pcLoading,   setPcLoading]   = useState(false);

  async function handleExpenses() {
    setExpLoading(true);
    try {
      await downloadBlob(
        expensesApi.export({
          date_from: expDateFrom || undefined,
          date_to: expDateTo || undefined,
          status: expStatus || undefined,
          currency: getStoredCurrency(),
        }),
        `gpa-expenses-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setExpLoading(false);
    }
  }

  async function handleAttendance() {
    setAttLoading(true);
    try {
      const year = Number(attYear);
      const month = Number(attMonth);
      const monthText = String(month).padStart(2, "0");
      const lastDay = new Date(year, month, 0).getDate();
      await downloadBlob(
        hrisAttendanceApi.export({
          date_from: `${year}-${monthText}-01`,
          date_to: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
          employee_id: attEmpId ? Number(attEmpId) : undefined,
          fmt: "xlsx",
        }),
        `absensi-${attYear}-${monthText}.xlsx`,
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setAttLoading(false);
    }
  }

  async function handlePayroll() {
    setPayLoading(true);
    try {
      await downloadBlob(
        reportsApi.payrollSummary(Number(payYear), Number(payMonth)),
        `payroll-summary-${payYear}-${String(payMonth).padStart(2, "0")}.xlsx`,
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setPayLoading(false);
    }
  }

  async function handleProjectFinancial() {
    setProjLoading(true);
    try {
      await downloadBlob(
        reportsApi.projectFinancial(projYear ? Number(projYear) : undefined, projStatus || undefined),
        `project-financial-${projYear || new Date().getFullYear()}.xlsx`,
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setProjLoading(false);
    }
  }

  async function handlePettyCash() {
    setPcLoading(true);
    try {
      await downloadBlob(
        reportsApi.pettyCashExport({
          date_from: pcDateFrom || undefined,
          date_to:   pcDateTo   || undefined,
        }),
        `petty-cash-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setPcLoading(false);
    }
  }

  const inputCls = "border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
  const labelCls = "block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1";
  const months   = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

      {/* 1. Laporan Pengeluaran */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-0.5">
            <FileSpreadsheet size={15} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Laporan Pengeluaran</h3>
          </div>
          <p className="text-xs text-gray-400">Semua data pengeluaran dalam rentang tanggal tertentu</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Dari Tanggal</label>
            <input type="date" className={inputCls} value={expDateFrom} onChange={e => setExpDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sampai Tanggal</label>
            <input type="date" className={inputCls} value={expDateTo} onChange={e => setExpDateTo(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={expStatus} onChange={e => setExpStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="hard_locked">Locked</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <Button
            className="w-full mt-1"
            size="sm"
            icon={expLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={handleExpenses}
            disabled={expLoading}
          >
            Unduh Excel
          </Button>
        </div>
      </Card>

      {/* 2. Absensi Bulanan */}
      {canAttendance && (
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-0.5">
            <FileSpreadsheet size={15} className="text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">Absensi Bulanan</h3>
          </div>
          <p className="text-xs text-gray-400">Rekap kehadiran karyawan per bulan</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Tahun</label>
            <input type="number" className={inputCls} value={attYear} onChange={e => setAttYear(e.target.value)} min={2020} max={2100} />
          </div>
          <div>
            <label className={labelCls}>Bulan</label>
            <select className={inputCls} value={attMonth} onChange={e => setAttMonth(e.target.value)}>
              {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>ID Karyawan (opsional)</label>
            <input type="number" className={inputCls} value={attEmpId} onChange={e => setAttEmpId(e.target.value)} placeholder="Kosongkan untuk semua" />
          </div>
          <Button
            className="w-full mt-1"
            size="sm"
            icon={attLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={handleAttendance}
            disabled={attLoading}
          >
            Unduh Excel
          </Button>
        </div>
      </Card>
      )}

      {/* 3. Rekap Payroll */}
      {canPayroll && (
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-0.5">
            <FileSpreadsheet size={15} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Rekap Payroll</h3>
          </div>
          <p className="text-xs text-gray-400">Ringkasan gaji karyawan beserta potongan dan tunjangan</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Tahun</label>
            <input type="number" className={inputCls} value={payYear} onChange={e => setPayYear(e.target.value)} min={2020} max={2100} />
          </div>
          <div>
            <label className={labelCls}>Bulan</label>
            <select className={inputCls} value={payMonth} onChange={e => setPayMonth(e.target.value)}>
              {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <Button
            className="w-full mt-4"
            size="sm"
            icon={payLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={handlePayroll}
            disabled={payLoading}
          >
            Unduh Excel
          </Button>
        </div>
      </Card>
      )}

      {/* 4. Keuangan Proyek */}
      {canProjFin && (
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-0.5">
            <FileSpreadsheet size={15} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Keuangan Proyek</h3>
          </div>
          <p className="text-xs text-gray-400">Nilai kontrak, budget terpakai, dan burn rate per proyek</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Tahun (opsional)</label>
            <input type="number" className={inputCls} value={projYear} onChange={e => setProjYear(e.target.value)} min={2020} max={2100} />
          </div>
          <div>
            <label className={labelCls}>Status Proyek</label>
            <select className={inputCls} value={projStatus} onChange={e => setProjStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <Button
            className="w-full mt-1"
            size="sm"
            icon={projLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={handleProjectFinancial}
            disabled={projLoading}
          >
            Unduh Excel
          </Button>
        </div>
      </Card>
      )}

      {/* 5. Rekap Petty Cash */}
      {canPettyExport && (
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-0.5">
            <FileSpreadsheet size={15} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900">Rekap Petty Cash</h3>
          </div>
          <p className="text-xs text-gray-400">Semua transaksi petty cash dalam rentang tanggal</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Dari Tanggal</label>
            <input type="date" className={inputCls} value={pcDateFrom} onChange={e => setPcDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sampai Tanggal</label>
            <input type="date" className={inputCls} value={pcDateTo} onChange={e => setPcDateTo(e.target.value)} />
          </div>
          <Button
            className="w-full mt-4"
            size="sm"
            icon={pcLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={handlePettyCash}
            disabled={pcLoading}
          >
            Unduh Excel
          </Button>
        </div>
      </Card>
      )}

    </div>
  );
}
