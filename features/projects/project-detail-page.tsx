"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  DollarSign,
  Edit2,
  TrendingUp,
} from "lucide-react";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { projectsApi } from "@/lib/api";
import {
  burnTailwind,
  cn,
  fmtDate,
  formatCurrency,
  getCurrencySymbol,
  pct,
} from "@/lib/utils";
import { EditModal } from "./components/edit-project-modal";
import {
  DocumentsTab,
  ExpensesTab,
  RevenueTab,
} from "./components/project-financial-tabs";

const TABS = ["Overview", "Expenses", "Revenue", "Documents"] as const;
type Tab = typeof TABS[number];

export default function ProjectDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const projectId   = parseInt(id, 10);
  const router      = useRouter();
  const [tab, setTab]         = useState<Tab>("Overview");
  const [editOpen, setEdit]   = useState(false);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn:  () => projectsApi.get(projectId).then((r) => r.data),
    enabled:  !!projectId && !isNaN(projectId),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="h-8 bg-gray-100 rounded-lg w-48 animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm font-medium text-gray-600">Project not found</p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const usedPct   = pct(project.total_committed, project.contract_value);
  const revPct    = pct(project.total_revenue,   project.contract_value);
  const marginPct = project.total_revenue > 0
    ? pct(project.total_revenue - project.total_committed, project.total_revenue)
    : 0;
  const barColor  = burnTailwind(usedPct);
  const currencySymbol = getCurrencySymbol(project.currency);

  return (
    <div className="space-y-5 animate-fade-in">
      {editOpen && <EditModal project={project} onClose={() => setEdit(false)} />}

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/projects" className="flex items-center gap-1 hover:text-gray-600 transition-colors">
          <ArrowLeft size={12} />
          Projects
        </Link>
        <ChevronRight size={11} />
        <span className="font-mono font-semibold text-gray-600">{project.code}</span>
      </div>

      {/* ── Project Header ──────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="num text-xs font-bold text-gray-400 tracking-widest uppercase">
                  {project.code}
                </span>
                <ProjectStatusBadge status={project.status} />
              </div>
              <h1 className="text-lg font-bold text-gray-900 leading-snug mt-0.5 truncate">
                {project.name}
              </h1>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {fmtDate(project.start_date)} — {fmtDate(project.end_date)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEdit(true)}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shrink-0"
          >
            <Edit2 size={14} />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            {
              icon: <DollarSign size={13} className="text-blue-500" />,
              label: "Contract Value",
              value: formatCurrency(project.contract_value, currencySymbol),
              color: "text-blue-700",
            },
            {
              icon: <CreditCard size={13} className="text-amber-500" />,
              label: "Committed",
              value: formatCurrency(project.total_committed, currencySymbol),
              color: usedPct >= 90 ? "text-red-600" : usedPct >= 70 ? "text-amber-600" : "text-amber-700",
            },
            {
              icon: <TrendingUp size={13} className="text-green-500" />,
              label: "Revenue Billed",
              value: formatCurrency(project.total_revenue, currencySymbol),
              color: "text-green-700",
            },
            {
              icon: <span className="text-xs font-bold text-purple-500">%</span>,
              label: "Margin",
              value: `${marginPct.toFixed(1)}%`,
              color: marginPct < 10 ? "text-red-600" : "text-purple-700",
            },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
              </div>
              <p className={cn("num text-sm font-bold", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Over-budget warning */}
        {project.budget < 0 && (
          <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-800">Over confirmed revenue</p>
              <p className="text-amber-700 mt-0.5">
                Committed spend exceeds confirmed AR revenue by{" "}
                <span className="num font-bold">{formatCurrency(Math.abs(project.budget), currencySymbol)}</span>.
                Confirm additional AR or reduce committed expenses.
              </p>
            </div>
          </div>
        )}

        {/* Burn bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Budget burn vs confirmed revenue</span>
            <span className="num font-medium">
              {formatCurrency(project.total_committed, currencySymbol)} / {formatCurrency(project.total_revenue, currencySymbol)}
              {project.total_revenue > 0 ? ` (${pct(project.total_committed, project.total_revenue).toFixed(1)}%)` : ""}
            </span>
          </div>
          <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all ${project.budget < 0 ? "bg-red-500" : barColor}`}
              style={{ width: `${Math.min(project.total_revenue > 0 ? pct(project.total_committed, project.total_revenue) : 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Confirmed revenue ceiling · Colored = committed spend</span>
            <span className={cn(
              "num font-semibold",
              project.budget < 0 ? "text-red-500" : usedPct >= 90 ? "text-amber-500" : "text-green-600"
            )}>
              {project.budget < 0 ? "Over budget" : usedPct >= 90 ? "Critical" : usedPct >= 70 ? "Caution" : "Healthy"}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
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

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Project Details
            </h3>
            <dl className="space-y-2.5">
              {[
                ["Code",           <span className="font-mono">{project.code}</span>],
                ["Name",           project.name],
                ["Status",         <ProjectStatusBadge status={project.status} />],
                ["Start Date",     fmtDate(project.start_date)],
                ["End Date",       fmtDate(project.end_date)],
                ["Currency",       project.currency],
                ["Contract Value", <span className="num font-semibold">{formatCurrency(project.contract_value, currencySymbol)}</span>],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-start justify-between gap-4">
                  <dt className="text-xs text-gray-400 shrink-0">{k}</dt>
                  <dd className="text-xs font-medium text-gray-900 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Financial Summary
            </h3>
            <dl className="space-y-2.5">
              {[
                ["Contract Value",   <span className="num font-bold text-blue-700">{formatCurrency(project.contract_value, currencySymbol)}</span>],
                ["Total Committed",  <span className="num font-bold text-amber-600">{formatCurrency(project.total_committed, currencySymbol)}</span>],
                ["Revenue Billed",   <span className="num font-bold text-green-700">{formatCurrency(project.total_revenue, currencySymbol)}</span>],
                ["Gross Margin",     <span className={cn("num font-bold", marginPct < 10 ? "text-red-600" : "text-purple-700")}>{marginPct.toFixed(1)}%</span>],
                ["Budget Used",      <span className={cn("num font-bold", usedPct >= 90 ? "text-red-600" : usedPct >= 70 ? "text-amber-600" : "text-green-600")}>{usedPct.toFixed(1)}%</span>],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center justify-between gap-4">
                  <dt className="text-xs text-gray-400">{k}</dt>
                  <dd className="text-xs">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
      {tab === "Expenses" && <ExpensesTab projectId={projectId} currency={project.currency} />}
      {tab === "Revenue"  && <RevenueTab  projectId={projectId} currency={project.currency} />}
      {tab === "Documents" && <DocumentsTab projectId={projectId} />}
    </div>
  );
}
