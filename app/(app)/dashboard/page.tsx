"use client";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, Layers, AlertCircle,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { projectsApi, expensesApi, receivablesApi } from "@/lib/api";
import { formatCurrency, formatCompact, pct, fmtDate, burnTailwind, getCurrencySymbol } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { KPISkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ExpenseStatusBadge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";

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

function moneyValue(value: number | string | null | undefined): number {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(num) ? num : 0;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-white shadow-lg">
      <p className="font-semibold text-gray-300 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400 capitalize">{p.name}:</span>
          <span className="font-mono font-medium">
            {p.name === "margin" ? `${p.value}%` : `${getCurrencySymbol()}${p.value}M`}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({
  title, value, sub, icon: Icon, trend, trendUp, color,
}: {
  title: string; value: string; sub: string;
  icon: React.ElementType; trend?: string; trendUp?: boolean;
  color: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <div>
        <p className="num text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      )}
    </Card>
  );
}

// ── Burn Rate Bar ─────────────────────────────────────────────────────────────
function BurnBar({ project }: { project: Project }) {
  const used    = pct(project.total_committed, project.contract_value);
  const revenue = pct(project.total_revenue,   project.contract_value);
  const color   = burnTailwind(used);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-16 shrink-0">
        <p className="text-[11px] font-mono font-semibold text-gray-500 truncate">{project.code}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-700 truncate font-medium">{project.name}</p>
          <p className={`text-[10px] num font-semibold ml-2 shrink-0 ${used >= 90 ? "text-red-500" : used >= 70 ? "text-amber-600" : "text-gray-500"}`}>
            {used.toFixed(0)}%
          </p>
        </div>
        <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gray-200 rounded-full"
            style={{ width: `${Math.min(revenue, 100)}%` }}
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${color}`}
            style={{ width: `${Math.min(used, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: projects = [], isLoading: projLoad } = useQuery({
    queryKey: ["projects", "dashboard", "active"],
    queryFn: () => projectsApi.list({ status: "active", archived: false, limit: 500 }).then((r) => r.data.items),
  });

  const { data: recentExpenses = [], isLoading: expLoad } = useQuery({
    queryKey: ["expenses", "recent"],
    queryFn: () => expensesApi.list({ limit: 8 }).then((r) => r.data.items),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses", "chart"],
    queryFn: () => expensesApi.list({ limit: 500 }).then((r) => r.data.items),
  });

  const { data: allReceivables = [] } = useQuery({
    queryKey: ["receivables", "chart"],
    queryFn: () => receivablesApi.list().then((r) => r.data.items),
  });

  // ── Aggregate KPIs ──────────────────────────────────────────────────────────
  const totalBudget    = projects.reduce((s, p) => s + (Number(p.contract_value) || 0), 0);
  const totalCommitted = projects.reduce((s, p) => s + (Number(p.total_committed) || 0), 0);
  const totalRevenue   = projects.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0);
  const marginPct      = totalRevenue > 0
    ? pct(totalRevenue - totalCommitted, totalRevenue)
    : 0;
  const pendingExpenses = recentExpenses.filter((e) =>
    ["submitted", "verified"].includes(e.status)
  ).length;

  // ── Margin trend chart (computed from real data) ─────────────────────────────
  const months = getLast6Months();
  const marginTrend = months.map(({ key, label }) => {
    const monthSpent = allExpenses
      .filter((e) =>
        e.created_at.slice(0, 7) === key &&
        !["draft", "rejected"].includes(e.status)
      )
      .reduce((s, e) => s + moneyValue(e.amount), 0);

    const monthRevenue = allReceivables
      .filter((r) => r.created_at.slice(0, 7) === key && r.status === "confirmed")
      .reduce((s, r) => s + moneyValue(r.amount), 0);

    const rev  = parseFloat((monthRevenue / 1_000_000).toFixed(1));
    const spent = parseFloat((monthSpent   / 1_000_000).toFixed(1));
    const margin = rev > 0 ? Math.round(((rev - spent) / rev) * 100) : 0;

    return { month: label, revenue: rev, spent, margin };
  });

  // ── This-month vs last-month delta for KPI trends ────────────────────────────
  const thisMonth = months[5].key;
  const lastMonth = months[4].key;

  const thisMonthCommitted = allExpenses
    .filter((e) => e.created_at.slice(0, 7) === thisMonth && !["draft","rejected"].includes(e.status))
    .reduce((s, e) => s + moneyValue(e.amount), 0);
  const lastMonthCommitted = allExpenses
    .filter((e) => e.created_at.slice(0, 7) === lastMonth && !["draft","rejected"].includes(e.status))
    .reduce((s, e) => s + moneyValue(e.amount), 0);
  const committedDelta = thisMonthCommitted - lastMonthCommitted;

  const thisMonthRevenue = allReceivables
    .filter((r) => r.created_at.slice(0, 7) === thisMonth && r.status === "confirmed")
    .reduce((s, r) => s + moneyValue(r.amount), 0);
  const lastMonthRevenue = allReceivables
    .filter((r) => r.created_at.slice(0, 7) === lastMonth && r.status === "confirmed")
    .reduce((s, r) => s + moneyValue(r.amount), 0);
  const revenueDelta = thisMonthRevenue - lastMonthRevenue;

  const hasChartData = marginTrend.some((d) => d.revenue > 0 || d.spent > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Cost Control · All Projects</p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {projLoad ? (
          Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
        ) : (
          <>
            <KPICard
              title="Contract Value"
              value={`${getCurrencySymbol()}${formatCompact(totalBudget)}`}
              sub={`${projects.length} active project${projects.length !== 1 ? "s" : ""}`}
              icon={Wallet}
              color="bg-primary"
            />
            <KPICard
              title="Total Committed"
              value={`${getCurrencySymbol()}${formatCompact(totalCommitted)}`}
              sub={`${pct(totalCommitted, totalBudget).toFixed(0)}% of contract`}
              icon={Layers}
              color="bg-amber-500"
              trend={committedDelta !== 0
                ? `${committedDelta > 0 ? "+" : ""}${getCurrencySymbol()}${formatCompact(Math.abs(committedDelta))} vs last month`
                : undefined}
              trendUp={committedDelta <= 0}
            />
            <KPICard
              title="Revenue (AR)"
              value={`${getCurrencySymbol()}${formatCompact(totalRevenue)}`}
              sub="Confirmed billings"
              icon={TrendingUp}
              color="bg-green-600"
              trend={revenueDelta !== 0
                ? `${revenueDelta > 0 ? "+" : ""}${getCurrencySymbol()}${formatCompact(Math.abs(revenueDelta))} vs last month`
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
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={marginTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <YAxis
                    yAxisId="money"
                    orientation="left"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${getCurrencySymbol()}${v}M`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    yAxisId="money" type="monotone" dataKey="revenue"
                    stroke="#1E40AF" strokeWidth={2} dot={{ r: 3, fill: "#1E40AF" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="money" type="monotone" dataKey="spent"
                    stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }}
                    activeDot={{ r: 5 }} strokeDasharray="5 3"
                  />
                  <Line
                    yAxisId="pct" type="monotone" dataKey="margin"
                    stroke="#16A34A" strokeWidth={2} dot={{ r: 3, fill: "#16A34A" }}
                    activeDot={{ r: 5 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#9CA3AF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Project burn rates */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-50">
            <CardHeader
              title="Project Burn Rate"
              subtitle="Committed vs. contract value"
              className="mb-0"
            />
          </div>
          <div className="px-4 py-2 divide-y divide-gray-50">
            {projLoad
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="py-2.5 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))
              : projects.length === 0
                ? <p className="py-6 text-center text-sm text-gray-400">No active projects</p>
                : projects.map((p) => <BurnBar key={p.id} project={p} />)
            }
          </div>
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
                <th className="th">ID</th>
                <th className="th">Description</th>
                <th className="th hidden md:table-cell">Cost Code</th>
                <th className="th text-right">Amount</th>
                <th className="th">Status</th>
                <th className="th hidden lg:table-cell">Approver</th>
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
                      {formatCurrency(exp.amount)}
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
    </div>
  );
}
