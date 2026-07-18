"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Calendar, ChevronRight,
  CreditCard, Edit2, TrendingUp, MoreHorizontal,
  DollarSign, X, Check, AlertTriangle, FileText, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { projectsApi, expensesApi, receivablesApi } from "@/lib/api";
import {
  formatCurrency, formatCompact, pct, fmtDate, fmtDateTime, getCurrencySymbol, CURRENCIES,
  burnTailwind, PROJECT_STATUS_COLORS, EXPENSE_STATUS_COLORS,
  EXPENSE_STATUS_LABEL, getErrorMessage,
} from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { cn } from "@/lib/utils";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import { openAuthenticatedFile } from "@/lib/authenticated-files";
import { toastError } from "@/lib/hooks/use-toast";
import type { Project, ProjectStatus, Expense, AccountReceivable } from "@/lib/types";

const STATUS_OPTS: ProjectStatus[] = ["active", "on_hold", "completed", "cancelled"];
const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled",
};
type ProjectExpenseSortKey = "description" | "cost_code" | "amount" | "status" | "date";
type ProjectRevenueSortKey = "description" | "amount" | "status" | "date";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in",
      ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {ok ? <Check size={15} /> : <X size={15} />}
      {msg}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  project, onClose,
}: { project: Project; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name:           project.name,
    contract_value: String(project.contract_value),
    currency:       project.currency ?? "IDR",
    status:         project.status as ProjectStatus,
    start_date:     project.start_date?.slice(0, 10) ?? "",
    end_date:       project.end_date?.slice(0, 10) ?? "",
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const save = useMutation({
    mutationFn: () => projectsApi.update(project.id, {
      name:           form.name,
      contract_value: parseFloat(form.contract_value),
      currency:       form.currency,
      status:         form.status,
      start_date:     form.start_date || null,
      end_date:       form.end_date   || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (e) => {
      setToast({ msg: getErrorMessage(e), ok: false });
      setTimeout(() => setToast(null), 3500);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {toast && <Toast {...toast} />}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Edit Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Project Code
            </label>
            <input
              value={project.code}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Project Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Contract Value
            </label>
            <input
              type="number"
              value={form.contract_value}
              onChange={(e) => setForm((f) => ({ ...f, contract_value: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ projectId, currency }: { projectId: number; currency: string }) {
  const tableSort = useTableSort<ProjectExpenseSortKey>("date", "desc");
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", { project_id: projectId }],
    queryFn: () => expensesApi.list({ project_id: projectId }).then((r) => r.data.items),
  });
  const sortedExpenses = sortTableRows(expenses, tableSort.sortKey, tableSort.sortDirection, {
    description: (expense) => expense.description,
    cost_code: (expense) => expense.cost_code?.code,
    amount: (expense) => expense.amount,
    status: (expense) => expense.status,
    date: (expense) => expense.created_at,
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""} ·{" "}
          Total {formatCurrency(total, getCurrencySymbol(currency))}
        </p>
        <Link href={`/spending?project=${projectId}`}>
          <Button variant="secondary" size="sm">
            Manage in Spending
          </Button>
        </Link>
      </div>
      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={5} cols={5} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Description" column="description" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Cost Code" column="cost_code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="Amount" column="amount" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden sm:table-cell" />
                <SortableTableHeader label="Date" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td text-center text-gray-400 py-10 text-xs">
                    No expenses recorded for this project
                  </td>
                </tr>
              ) : sortedExpenses.map((exp) => {
                const sc = EXPENSE_STATUS_COLORS[exp.status];
                return (
                  <tr key={exp.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="td">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {exp.description}
                      </p>
                    </td>
                    <td className="td hidden md:table-cell">
                      <span className="text-xs text-gray-500 font-mono">
                        {exp.cost_code?.code ?? "—"}
                      </span>
                    </td>
                    <td className="td text-right">
                      <span className="num font-semibold text-gray-900 text-sm">
                        {formatCurrency(exp.amount, getCurrencySymbol(currency))}
                      </span>
                    </td>
                    <td className="td hidden sm:table-cell">
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        sc.bg, sc.text, sc.border
                      )}>
                        {EXPENSE_STATUS_LABEL[exp.status]}
                      </span>
                    </td>
                    <td className="td hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{fmtDate(exp.created_at)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────
function RevenueTab({ projectId, currency }: { projectId: number; currency: string }) {
  const tableSort = useTableSort<ProjectRevenueSortKey>("date", "desc");
  const { data: ars = [], isLoading } = useQuery({
    queryKey: ["receivables", { project_id: projectId }],
    queryFn: () => receivablesApi.list({ project_id: projectId }).then((r) => r.data.items),
  });
  const sortedReceivables = sortTableRows(ars, tableSort.sortKey, tableSort.sortDirection, {
    description: (receivable) => receivable.description,
    amount: (receivable) => receivable.amount,
    status: (receivable) => receivable.status,
    date: (receivable) => receivable.created_at,
  });

  const total = ars.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {ars.length} invoice{ars.length !== 1 ? "s" : ""} ·{" "}
          Total {formatCurrency(total, getCurrencySymbol(currency))}
        </p>
        <Link href="/revenue">
          <Button variant="secondary" size="sm">
            Manage in Revenue
          </Button>
        </Link>
      </div>
      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={4} cols={4} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Description" column="description" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Amount" column="amount" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden sm:table-cell" />
                <SortableTableHeader label="Date" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ars.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td text-center text-gray-400 py-10 text-xs">
                    No revenue entries for this project
                  </td>
                </tr>
              ) : sortedReceivables.map((ar) => (
                <tr key={ar.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="td">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">
                      {ar.description}
                    </p>
                  </td>
                  <td className="td text-right">
                    <span className="num font-semibold text-green-700 text-sm">
                      {formatCurrency(ar.amount, getCurrencySymbol(currency))}
                    </span>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className={cn(
                      "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      ar.status === "confirmed"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                      {ar.status === "confirmed" ? "Confirmed" : "Draft"}
                    </span>
                  </td>
                  <td className="td hidden lg:table-cell">
                    <span className="text-xs text-gray-400">{fmtDate(ar.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function DocumentsTab({ projectId }: { projectId: number }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: () => projectsApi.documents(projectId).then((r) => r.data),
  });

  async function openDoc(docId: number, title: string) {
    try {
      await openAuthenticatedFile(projectsApi.documentUrl(projectId, docId));
    } catch {
      toastError("Document unavailable", `Could not open ${title}`);
    }
  }

  return (
    <Card padding={false}>
      {isLoading ? <TableSkeleton rows={4} cols={3} /> : (
        <div className="divide-y divide-gray-50">
          {docs.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">No original contracts or POs linked yet</div>
          ) : docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => openDoc(doc.id, doc.title)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <FileText size={15} className="text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                <p className="text-[11px] text-gray-400 uppercase">{doc.doc_type} · {doc.reference_no ?? "No ref"}</p>
              </div>
              <ExternalLink size={13} className="text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
