"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { expensesApi, hrisAttendanceApi, projectsApi, reportsApi } from "@/lib/api";
import { formatCurrency, formatCompact, pct, getCurrencySymbol, getStoredCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/hooks/use-toast";
import { useAuth, useRole } from "@/lib/auth-context";
import type { Expense, Project } from "@/lib/types";
import { sortTableRows, useTableSort } from "@/lib/table-sort";

const TABS = ["Overview", "Spending", "Margin", "Unduh Laporan"] as const;
type Tab = typeof TABS[number];
type MarginSortKey = "project" | "contract" | "revenue" | "committed" | "margin" | "health";

const PIE_COLORS = [
  "#1E40AF", "#F59E0B", "#16A34A", "#DC2626",
  "#7C3AED", "#0891B2", "#D97706", "#374151",
];

const COMMITTED_EXPENSE_STATUSES = new Set(["verified", "approved", "paid", "hard_locked"]);

async function loadAllExpenses(): Promise<Expense[]> {
  const items: Expense[] = [];
  let skip = 0;
  while (true) {
    const response = await expensesApi.list({ skip, limit: 500 });
    items.push(...response.data.items);
    if (items.length >= response.data.total || response.data.items.length === 0) return items;
    skip += response.data.items.length;
  }
}

async function loadAllProjects(): Promise<Project[]> {
  const items: Project[] = [];
  let skip = 0;
  while (true) {
    const response = await projectsApi.list({ skip, limit: 500 });
    items.push(...response.data.items);
    if (items.length >= response.data.total || response.data.items.length === 0) return items;
    skip += response.data.items.length;
  }
}

function CustomTooltip({ active, payload, label, currencySymbol }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-white shadow-lg">
      <p className="font-semibold text-gray-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-mono">{currencySymbol}{formatCompact(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Download helper ────────────────────────────────────────────────────────────

async function downloadBlob(promise: Promise<{ data: Blob }>, filename: string) {
  const res = await promise;
  const url = URL.createObjectURL(res.data);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Download tab ───────────────────────────────────────────────────────────────

function DownloadTab() {
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [excelLoading, setExcelLoading] = useState<boolean>(false);
  const marginSort = useTableSort<MarginSortKey>("project", "asc");
  const reportingCurrency = getStoredCurrency();
  const reportingSymbol = getCurrencySymbol(reportingCurrency);

  const { data: allExpenses = [], isLoading: expLoad } = useQuery({
    queryKey: ["expenses", "all"],
    queryFn: loadAllExpenses,
  });

  const { data: allProjects = [], isLoading: projLoad } = useQuery({
    queryKey: ["projects", "reports-all"],
    queryFn: loadAllProjects,
  });
  const projects = allProjects.filter(
    (project) => (project.currency || "IDR") === reportingCurrency
  );
  const sortedMarginProjects = sortTableRows(projects, marginSort.sortKey, marginSort.sortDirection, {
    project: (project) => project.code,
    contract: (project) => project.contract_value,
    revenue: (project) => project.total_revenue,
    committed: (project) => project.total_committed,
    margin: (project) => project.total_revenue > 0
      ? pct(project.total_revenue - project.total_committed, project.total_revenue)
      : 0,
    health: (project) => project.total_revenue > 0
      ? pct(project.total_revenue - project.total_committed, project.total_revenue)
      : 0,
  });
  const reportingProjectIds = new Set(projects.map((project) => project.id));
  const expenses = allExpenses.filter(
    (expense) => expense.project_id != null && reportingProjectIds.has(expense.project_id)
  );

  // Aggregate: spending by cost code category
  const categoryMap: Record<string, number> = {};
  expenses.filter((expense) => COMMITTED_EXPENSE_STATUSES.has(expense.status)).forEach((e) => {
    const cat = e.cost_code?.category ?? "Other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + e.amount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Project bar data
  const projectData = projects.map((p) => ({
    name: p.code,
    committed: p.total_committed,
    revenue:   p.total_revenue,
    remaining: Math.max(0, p.contract_value - p.total_committed),
  }));

  // Total stats
  const totalRevenue   = projects.reduce((s, p) => s + p.total_revenue, 0);
  const totalCommitted = projects.reduce((s, p) => s + p.total_committed, 0);
  const totalContract  = projects.reduce((s, p) => s + p.contract_value, 0);
  const margin         = totalRevenue > 0 ? pct(totalRevenue - totalCommitted, totalRevenue) : 0;

  async function exportExcel() {
    setExcelLoading(true);
    try {
      await downloadBlob(
        expensesApi.export({ currency: reportingCurrency }),
        `gpa-expenses-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExcelLoading(false);
    }
  }

  function exportCSV() {
    const headers = ["ID", "Project", "Cost Code", "Category", "Amount", "Status", "Date"];
    const rows    = expenses.map((e) => [
      e.id, e.project_id, e.cost_code?.code ?? "", e.cost_code?.category ?? "",
      e.amount, e.status, e.created_at,
    ]);
    const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a   = document.createElement("a");
    a.href = url; a.download = "gpa-expenses.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Analytics & exports · {reportingCurrency} projects</p>
        </div>
        {tab === "Spending" && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={excelLoading ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              onClick={exportExcel}
              disabled={excelLoading}
            >
              Export Expenses Excel
            </Button>
            <Button variant="secondary" size="sm" icon={<FileText size={13} />}
              onClick={exportCSV}>
              Export Expenses CSV
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              tab === t
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Contract",  value: formatCurrency(totalContract, reportingSymbol),  color: "text-gray-900" },
              { label: "Total Revenue",   value: formatCurrency(totalRevenue, reportingSymbol),   color: "text-green-600" },
              { label: "Total Committed", value: formatCurrency(totalCommitted, reportingSymbol), color: "text-amber-600" },
              { label: "Gross Margin",    value: `${margin.toFixed(1)}%`,             color: margin < 20 ? "text-red-500" : "text-green-600" },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{s.label}</p>
                <p className={`num text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Project comparison bar chart */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Project Financials</h3>
              <p className="text-xs text-gray-400 mt-0.5">Revenue vs. committed vs. remaining</p>
            </div>
            <div className="p-5">
              {projLoad ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${reportingSymbol}${formatCompact(v)}`} />
                    <Tooltip content={<CustomTooltip currencySymbol={reportingSymbol} />} />
                    <Bar dataKey="revenue"   name="Revenue"   fill="#1E40AF" radius={[3,3,0,0]} />
                    <Bar dataKey="committed" name="Committed" fill="#F59E0B" radius={[3,3,0,0]} />
                    <Bar dataKey="remaining" name="Remaining" fill="#E5E7EB" radius={[3,3,0,0]} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#9CA3AF" }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Spending tab ──────────────────────────────────────────────────── */}
      {tab === "Spending" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Bar: by category */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Spend by Cost Code Category</h3>
            </div>
            <div className="p-5">
              {expLoad ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={categoryData} layout="vertical"
                    margin={{ top: 0, right: 24, left: 16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${reportingSymbol}${formatCompact(v)}`} />
                    <YAxis type="category" dataKey="name"
                      tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip currencySymbol={reportingSymbol} />} />
                    <Bar dataKey="value" name="Spent" radius={[0,3,3,0]}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Pie: distribution */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Spend Distribution</h3>
            </div>
            <div className="p-5 flex items-center justify-center">
              {expLoad ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      dataKey="value" nameKey="name"
                      paddingAngle={3}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v, reportingSymbol)} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Margin tab ────────────────────────────────────────────────────── */}
      {tab === "Margin" && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Margin by Project</h3>
          </div>
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Project" column="project" sortKey={marginSort.sortKey} sortDirection={marginSort.sortDirection} onSort={marginSort.toggleSort} className="w-[28%]" />
                <SortableTableHeader label="Contract" column="contract" sortKey={marginSort.sortKey} sortDirection={marginSort.sortDirection} onSort={marginSort.toggleSort} align="right" />
                <SortableTableHeader label="Revenue" column="revenue" sortKey={marginSort.sortKey} sortDirection={marginSort.sortDirection} onSort={marginSort.toggleSort} align="right" className="hidden md:table-cell" />
                <SortableTableHeader label="Committed" column="committed" sortKey={marginSort.sortKey} sortDirection={marginSort.sortDirection} onSort={marginSort.toggleSort} align="right" className="hidden md:table-cell" />
                <SortableTableHeader label="Margin" column="margin" sortKey={marginSort.sortKey} sortDirection={marginSort.sortDirection} onSort={marginSort.toggleSort} align="right" />
                <SortableTableHeader label="Health" column="health" sortKey={marginSort.sortKey} sortDirection={marginSort.sortDirection} onSort={marginSort.toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedMarginProjects.map((p) => {
                const m = p.total_revenue > 0
                  ? pct(p.total_revenue - p.total_committed, p.total_revenue)
                  : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td w-[28%]">
                      <div>
                        <p className="num text-xs font-semibold text-gray-500">{p.code}</p>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[360px]">{p.name}</p>
                      </div>
                    </td>
                    <td className="td text-right num font-semibold text-gray-900">{formatCurrency(p.contract_value, getCurrencySymbol(p.currency))}</td>
                    <td className="td text-right num text-green-600 font-semibold hidden md:table-cell">{formatCurrency(p.total_revenue, getCurrencySymbol(p.currency))}</td>
                    <td className="td text-right num text-amber-600 font-semibold hidden md:table-cell">{formatCurrency(p.total_committed, getCurrencySymbol(p.currency))}</td>
                    <td className="td text-right">
                      <span className={`num text-base font-bold ${m < 10 ? "text-red-500" : m < 20 ? "text-amber-600" : "text-green-600"}`}>
                        {m.toFixed(1)}%
                      </span>
                    </td>
                    <td className="td">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m >= 20 ? "bg-green-500" : m >= 10 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(Math.max(m, 0), 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Unduh Laporan tab ─────────────────────────────────────────────── */}
      {tab === "Unduh Laporan" && <DownloadTab />}
    </div>
  );
}
