"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Wallet, TrendingUp, Layers, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { projectsApi, expensesApi, reportsApi, operationsApi } from "@/lib/api";
import { formatCurrency, formatCompact, pct, fmtDate, getCurrencySymbol, getStoredCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader } from "@/components/ui/card";
import { KPISkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ExpenseStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import { loadAllPages } from "@/lib/load-all-pages";
import {
  buildProjectHealthMetrics,
} from "./lib/dashboard-metrics";
import type { Expense, OperationalRecord, Project } from "@/lib/types";
import { HealthBadge, KPICard, ProjectHealthRow } from "./components/dashboard-cards";

type RecentExpenseSortKey = "id" | "description" | "cost_code" | "amount" | "status" | "approver";
type ProjectHealthSortKey = "project" | "progress" | "committed" | "hse" | "status";

const MarginTrendChart = dynamic(() => import("./components/margin-trend-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full" />,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLast6Months(): { key: string; label: string }[] {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
    });
  }
  return result;
}

async function loadAllActiveProjects(): Promise<Project[]> {
  return loadAllPages((skip, limit) =>
    projectsApi.list({ status: "active", archived: false, skip, limit })
      .then((response) => response.data)
  );
}

async function loadAllOperationalRecords(
  module: string,
  recordType?: string,
): Promise<OperationalRecord[]> {
  return loadAllPages((skip, limit) =>
    operationsApi.list(module, { record_type: recordType, skip, limit })
      .then((response) => response.data)
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { canAccessMenu } = useAuth();
  const [projectStatusPage, setProjectStatusPage] = useState(1);
  const [projectStatusPageSize, setProjectStatusPageSize] = useState(5);
  const recentSort = useTableSort<RecentExpenseSortKey>("id", "desc");
  const healthSort = useTableSort<ProjectHealthSortKey>("project", "asc");
  const reportingCurrency = getStoredCurrency();
  const reportingSymbol = getCurrencySymbol(reportingCurrency);
  const canReadProjectExecution = canAccessMenu("project_execution");
  const canReadHse = canAccessMenu("hse");
  const { data: allProjects = [], isLoading: projLoad } = useQuery({
    queryKey: ["projects", "dashboard", "active"],
    queryFn: loadAllActiveProjects,
  });
  const projects = useMemo(
    () => allProjects.filter((project) => (project.currency || "IDR") === reportingCurrency),
    [allProjects, reportingCurrency],
  );

  const { data: progressRecords = [], isLoading: progressLoad } = useQuery({
    queryKey: ["operational-records", "dashboard", "project_execution", "progress_update"],
    queryFn: () => loadAllOperationalRecords("project_execution", "progress_update"),
    enabled: canReadProjectExecution,
    retry: false,
  });
  const { data: hseRecords = [], isLoading: hseLoad } = useQuery({
    queryKey: ["operational-records", "dashboard", "hse"],
    queryFn: () => loadAllOperationalRecords("hse"),
    enabled: canReadHse,
    retry: false,
  });

  const { data: recentExpenseData, isLoading: expLoad } = useQuery({
    queryKey: ["expenses", "recent", reportingCurrency],
    queryFn: () => expensesApi.list({ currency: reportingCurrency, limit: 100 }).then((r) => r.data),
  });
  const { data: dashboardTrend } = useQuery({
    queryKey: ["reports", "dashboard-trend", reportingCurrency],
    queryFn: () => reportsApi.dashboardTrend(reportingCurrency).then((r) => r.data),
  });
  const recentExpenses = useMemo(
    () => sortTableRows<Expense, RecentExpenseSortKey>(
      recentExpenseData?.items ?? [],
      recentSort.sortKey,
      recentSort.sortDirection,
      {
        id: (expense) => expense.id,
        description: (expense) => expense.description,
        cost_code: (expense) => expense.cost_code?.code,
        amount: (expense) => expense.amount,
        status: (expense) => expense.status,
        approver: (expense) => expense.current_approver_role,
      },
    ).slice(0, 8),
    [recentExpenseData?.items, recentSort.sortDirection, recentSort.sortKey],
  );
  const projectHealth = useMemo(
    () => sortTableRows(
      buildProjectHealthMetrics(
        projects,
        progressRecords,
        hseRecords,
        new Date(),
        canReadProjectExecution,
        canReadHse,
      ),
      healthSort.sortKey,
      healthSort.sortDirection,
      {
        project: (metric) => metric.project.code,
        progress: (metric) => metric.progress,
        committed: (metric) => metric.project.total_committed,
        hse: (metric) => metric.safeDays,
        status: (metric) => metric.status,
      },
    ),
    [
      canReadHse,
      canReadProjectExecution,
      healthSort.sortDirection,
      healthSort.sortKey,
      hseRecords,
      progressRecords,
      projects,
    ],
  );

  function sortProjectHealth(column: ProjectHealthSortKey) {
    healthSort.toggleSort(column);
    setProjectStatusPage(1);
  }
  const projectStatusTotalPages = Math.max(1, Math.ceil(projectHealth.length / projectStatusPageSize));
  const currentProjectStatusPage = Math.min(projectStatusPage, projectStatusTotalPages);
  const visibleProjectHealth = projectHealth.slice(
    (currentProjectStatusPage - 1) * projectStatusPageSize,
    currentProjectStatusPage * projectStatusPageSize,
  );
  const projectHealthLoading = projLoad || progressLoad || hseLoad;

  // ── Aggregate KPIs ──────────────────────────────────────────────────────────
  const totalBudget    = projects.reduce((s, p) => s + (Number(p.contract_value) || 0), 0);
  const totalCommitted = projects.reduce((s, p) => s + (Number(p.total_committed) || 0), 0);
  const totalRevenue   = projects.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0);
  const marginPct      = totalRevenue > 0
    ? pct(totalRevenue - totalCommitted, totalRevenue)
    : 0;
  const pendingExpenses = dashboardTrend?.pending_expenses ?? 0;

  // ── Margin trend chart (computed from real data) ─────────────────────────────
  const months = getLast6Months();
  const trendByMonth = new Map((dashboardTrend?.months ?? []).map((row) => [row.month, row]));
  const marginTrend = months.map(({ key, label }) => {
    const monthSpent = trendByMonth.get(key)?.spent ?? 0;
    const monthRevenue = trendByMonth.get(key)?.revenue ?? 0;

    const rev  = parseFloat((monthRevenue / 1_000_000).toFixed(1));
    const spent = parseFloat((monthSpent   / 1_000_000).toFixed(1));
    const margin = rev > 0 ? Math.round(((rev - spent) / rev) * 100) : 0;

    return { month: label, revenue: rev, spent, margin };
  });

  // ── This-month vs last-month delta for KPI trends ────────────────────────────
  const thisMonth = months[5].key;
  const lastMonth = months[4].key;

  const thisMonthCommitted = trendByMonth.get(thisMonth)?.spent ?? 0;
  const lastMonthCommitted = trendByMonth.get(lastMonth)?.spent ?? 0;
  const committedDelta = thisMonthCommitted - lastMonthCommitted;

  const thisMonthRevenue = trendByMonth.get(thisMonth)?.revenue ?? 0;
  const lastMonthRevenue = trendByMonth.get(lastMonth)?.revenue ?? 0;
  const revenueDelta = thisMonthRevenue - lastMonthRevenue;

  const hasChartData = marginTrend.some((d) => d.revenue > 0 || d.spent > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Cost Control · {reportingCurrency} projects</p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {projLoad ? (
          Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
        ) : (
          <>
            <KPICard
              title="Contract Value"
              value={`${reportingSymbol}${formatCompact(totalBudget)}`}
              sub={`${projects.length} active ${reportingCurrency} project${projects.length !== 1 ? "s" : ""}`}
              icon={Wallet}
              color="bg-primary"
            />
            <KPICard
              title="Total Committed"
              value={`${reportingSymbol}${formatCompact(totalCommitted)}`}
              sub={`${pct(totalCommitted, totalBudget).toFixed(0)}% of contract`}
              icon={Layers}
              color="bg-amber-500"
              trend={committedDelta !== 0
                ? `${committedDelta > 0 ? "+" : ""}${reportingSymbol}${formatCompact(Math.abs(committedDelta))} vs last month`
                : undefined}
              trendUp={committedDelta <= 0}
            />
            <KPICard
              title="Revenue (AR)"
              value={`${reportingSymbol}${formatCompact(totalRevenue)}`}
              sub="Confirmed billings"
              icon={TrendingUp}
              color="bg-green-600"
              trend={revenueDelta !== 0
                ? `${revenueDelta > 0 ? "+" : ""}${reportingSymbol}${formatCompact(Math.abs(revenueDelta))} vs last month`
                : undefined}
              trendUp={revenueDelta >= 0}
            />
            <KPICard
              title="Gross Margin"
              value={`${marginPct.toFixed(1)}%`}
              sub="Revenue minus committed"
              icon={AlertCircle}
              color={marginPct < 20 ? "bg-red-500" : "bg-purple-600"}
              trend={pendingExpenses > 0 ? `${pendingExpenses} pending approval` : "All clear"}
              trendUp={pendingExpenses === 0}
            />
          </>
        )}
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Margin trend chart */}
        <Card padding={false} className="xl:col-span-2">
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Margin Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Revenue vs. committed spend · last 6 months</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md num">
                All projects
              </span>
            </div>
          </div>
          <div className="p-5">
            {!hasChartData ? (
              <div className="flex items-center justify-center h-[220px] text-xs text-gray-400">
                No transaction data yet — chart will populate as expenses and revenue are recorded
              </div>
            ) : (
              <MarginTrendChart data={marginTrend} currencySymbol={reportingSymbol} />
            )}
          </div>
        </Card>

        {/* Project health summary */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <CardHeader
              title="Project Health"
              subtitle="Progress, budget, HSE & risk status"
              className="mb-0"
            />
          </div>
          <div className="px-4 py-2 divide-y divide-gray-50">
            {projectHealthLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="py-2.5 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-5 w-full rounded-md" />
                  </div>
                ))
              : projectHealth.length === 0
                ? <p className="py-6 text-center text-sm text-gray-400">No active projects</p>
                : projectHealth.slice(0, 5).map((metric) => (
                    <ProjectHealthRow key={metric.project.id} metric={metric} />
                  ))
            }
          </div>
          {projectHealth.length > 5 && (
            <div className="px-5 py-3 border-t border-gray-50 text-right">
              <a href="#active-project-status" className="text-xs text-primary hover:underline font-medium">
                View {projectHealth.length - 5} more
              </a>
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Expenses table ─────────────────────────────────────────── */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Recent Expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest 8 across all projects</p>
          </div>
          <Link
            href="/spending"
            className="text-xs text-primary hover:underline font-medium"
          >
            View all →
          </Link>
        </div>

        {expLoad ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <SortableTableHeader label="ID" column="id" sortKey={recentSort.sortKey} sortDirection={recentSort.sortDirection} onSort={recentSort.toggleSort} />
                <SortableTableHeader label="Description" column="description" sortKey={recentSort.sortKey} sortDirection={recentSort.sortDirection} onSort={recentSort.toggleSort} />
                <SortableTableHeader label="Cost Code" column="cost_code" sortKey={recentSort.sortKey} sortDirection={recentSort.sortDirection} onSort={recentSort.toggleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="Amount" column="amount" sortKey={recentSort.sortKey} sortDirection={recentSort.sortDirection} onSort={recentSort.toggleSort} align="right" />
                <SortableTableHeader label="Status" column="status" sortKey={recentSort.sortKey} sortDirection={recentSort.sortDirection} onSort={recentSort.toggleSort} />
                <SortableTableHeader label="Approver" column="approver" sortKey={recentSort.sortKey} sortDirection={recentSort.sortDirection} onSort={recentSort.toggleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td text-center text-gray-400 py-8">
                    No expenses yet
                  </td>
                </tr>
              ) : (
                recentExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td num text-gray-400">#{exp.id}</td>
                    <td className="td max-w-[200px] truncate font-medium text-gray-800">
                      {exp.description}
                    </td>
                    <td className="td hidden md:table-cell text-gray-400 text-xs">
                      {exp.cost_code?.code}
                    </td>
                    <td className="td text-right num font-semibold text-gray-900">
                      {formatCurrency(exp.amount, reportingSymbol)}
                    </td>
                    <td className="td">
                      <ExpenseStatusBadge status={exp.status} />
                    </td>
                    <td className="td hidden lg:table-cell">
                      {exp.current_approver_role ? (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                          {exp.current_approver_role.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        )}
      </Card>

      <div id="active-project-status">
        <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Active Project Status</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Progress, committed budget, HSE, and overall project health
            </p>
          </div>
          <Link
            href="/projects"
            className="text-xs text-primary hover:underline font-medium whitespace-nowrap"
          >
            View projects
          </Link>
        </div>

        {projectHealthLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : projectHealth.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No active projects</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed">
                <thead>
                  <tr className="border-b border-gray-50">
                    <SortableTableHeader label="Project" column="project" sortKey={healthSort.sortKey} sortDirection={healthSort.sortDirection} onSort={sortProjectHealth} className="w-[29%]" />
                    <SortableTableHeader label="Progress" column="progress" sortKey={healthSort.sortKey} sortDirection={healthSort.sortDirection} onSort={sortProjectHealth} className="w-[19%]" />
                    <SortableTableHeader label="Committed / Contract" column="committed" sortKey={healthSort.sortKey} sortDirection={healthSort.sortDirection} onSort={sortProjectHealth} className="w-[24%]" />
                    <SortableTableHeader label="HSE" column="hse" sortKey={healthSort.sortKey} sortDirection={healthSort.sortDirection} onSort={sortProjectHealth} align="center" className="w-[12%]" />
                    <SortableTableHeader label="Status" column="status" sortKey={healthSort.sortKey} sortDirection={healthSort.sortDirection} onSort={sortProjectHealth} className="w-[16%]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleProjectHealth.map((metric) => {
                    const progressBar = metric.status === "behind"
                      ? "bg-red-500"
                      : metric.status === "at_risk"
                        ? "bg-amber-500"
                        : metric.status === "needs_data"
                          ? "bg-gray-300"
                          : "bg-green-600";
                    return (
                      <tr key={metric.project.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="td">
                          <Link
                            href={`/projects/${metric.project.id}`}
                            className="font-mono text-[11px] font-semibold text-primary hover:underline"
                          >
                            {metric.project.code}
                          </Link>
                          <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                            {metric.project.name}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {metric.project.start_date || metric.project.end_date
                              ? `${fmtDate(metric.project.start_date)} - ${fmtDate(metric.project.end_date)}`
                              : "Schedule not set"}
                          </p>
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <span className="num w-10 text-right text-xs font-semibold text-gray-700">
                              {metric.progress == null
                                ? "--"
                                : `${metric.progress.toFixed(1)}%`}
                            </span>
                            <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressBar}`}
                                style={{ width: `${metric.progress == null ? 0 : metric.progress}%` }}
                              />
                            </div>
                          </div>
                          {metric.progress == null && (
                            <p className="text-[10px] text-gray-400 mt-1 ml-[52px]">
                              {canReadProjectExecution ? "Not reported" : "No access"}
                            </p>
                          )}
                        </td>
                        <td className="td">
                          <p className="num text-xs font-semibold text-gray-900">
                            {formatCurrency(metric.project.total_committed, reportingSymbol)}
                            <span className="font-normal text-gray-400"> / </span>
                            {formatCurrency(metric.project.contract_value, reportingSymbol)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  metric.budgetUsed > 100
                                    ? "bg-red-500"
                                    : metric.budgetUsed >= 90
                                      ? "bg-amber-500"
                                      : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(metric.budgetUsed, 100)}%` }}
                              />
                            </div>
                            <span className="num text-[10px] text-gray-500 w-11 text-right">
                              {metric.budgetUsed.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="td text-center">
                          {!canReadHse ? (
                            <>
                              <p className="text-xs font-semibold text-gray-400">--</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">No access</p>
                            </>
                          ) : metric.safeDays == null ? (
                            <>
                              <p className="text-xs font-semibold text-gray-400">--</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Not reported</p>
                            </>
                          ) : (
                            <>
                              <p className="num text-sm font-bold text-green-600">{metric.safeDays}</p>
                              <p className="text-[10px] text-green-600 mt-0.5">days safe</p>
                            </>
                          )}
                        </td>
                        <td className="td">
                          <HealthBadge metric={metric} />
                          <p className="text-[10px] text-gray-400 mt-1.5 truncate" title={metric.reason}>
                            {metric.reason}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                Showing{" "}
                <span className="font-medium text-gray-600">
                  {(currentProjectStatusPage - 1) * projectStatusPageSize + 1}-
                  {Math.min(currentProjectStatusPage * projectStatusPageSize, projectHealth.length)}
                </span>
                {" "}of{" "}
                <span className="font-medium text-gray-600">{projectHealth.length}</span>
                {" "}active projects
              </p>
              <div className="flex items-center justify-end gap-3">
                <select
                  value={projectStatusPageSize}
                  onChange={(event) => {
                    setProjectStatusPageSize(Number(event.target.value));
                    setProjectStatusPage(1);
                  }}
                  aria-label="Projects per page"
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                </select>
                <Pagination
                  page={currentProjectStatusPage}
                  totalPages={projectStatusTotalPages}
                  onPageChange={setProjectStatusPage}
                  className="pt-0"
                />
              </div>
            </div>
          </>
        )}
        </Card>
      </div>
    </div>
  );
}
