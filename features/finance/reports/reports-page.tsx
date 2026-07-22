"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { expensesApi, projectsApi } from "@/lib/api";
import { toastError } from "@/lib/hooks/use-toast";
import { loadAllPages } from "@/lib/load-all-pages";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { Expense, Project } from "@/lib/types";
import { cn, formatCurrency, getCurrencySymbol, getStoredCurrency } from "@/lib/utils";
import { DownloadTab } from "./components/download-reports-tab";
import {
  buildExpenseCsv,
  buildFinanceReport,
  projectMarginPercent,
} from "./lib/report-calculations";
import { downloadBlob } from "./lib/download-blob";

const TABS = ["Overview", "Spending", "Margin", "Unduh Laporan"] as const;
type Tab = typeof TABS[number];
type MarginSortKey = "project" | "contract" | "revenue" | "committed" | "margin" | "health";

const ProjectFinancialChart = dynamic(
  () => import("./components/report-charts").then((module) => module.ProjectFinancialChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);
const SpendCategoryChart = dynamic(
  () => import("./components/report-charts").then((module) => module.SpendCategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);
const SpendDistributionChart = dynamic(
  () => import("./components/report-charts").then((module) => module.SpendDistributionChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);

async function loadAllExpenses(): Promise<Expense[]> {
  return loadAllPages((skip, limit) =>
    expensesApi.list({ skip, limit }).then((response) => response.data)
  );
}

async function loadAllProjects(): Promise<Project[]> {
  return loadAllPages((skip, limit) =>
    projectsApi.list({ skip, limit }).then((response) => response.data)
  );
}

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
  const report = useMemo(
    () => buildFinanceReport(allProjects, allExpenses, reportingCurrency),
    [allProjects, allExpenses, reportingCurrency],
  );
  const {
    projects,
    expenses,
    categoryData,
    projectData,
    totalRevenue,
    totalCommitted,
    totalContract,
    margin,
  } = report;
  const sortedMarginProjects = useMemo(
    () => sortTableRows(projects, marginSort.sortKey, marginSort.sortDirection, {
      project: (project) => project.code,
      contract: (project) => project.contract_value,
      revenue: (project) => project.total_revenue,
      committed: (project) => project.total_committed,
      margin: projectMarginPercent,
      health: projectMarginPercent,
    }),
    [projects, marginSort.sortDirection, marginSort.sortKey],
  );

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
    const csv = buildExpenseCsv(expenses);
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
                <ProjectFinancialChart data={projectData} currencySymbol={reportingSymbol} />
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
                <SpendCategoryChart data={categoryData} currencySymbol={reportingSymbol} />
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
                <SpendDistributionChart data={categoryData} currencySymbol={reportingSymbol} />
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
                const m = projectMarginPercent(p);
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
