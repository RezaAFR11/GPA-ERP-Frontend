"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid, List, Plus, Upload, Search,
  ChevronRight, Calendar,
  Building2, AlertTriangle, X, Check, Archive, RotateCcw, Trash2,
} from "lucide-react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import {
  formatCurrency, formatCompact, pct, fmtDate, getCurrencySymbol, CURRENCIES,
  burnTailwind, PROJECT_STATUS_COLORS, getErrorMessage, getStoredCurrency, type CurrencyCode,
} from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import ImportModal from "./components/import-modal";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/lib/types";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { useRole } from "@/lib/auth-context";
import { useTableSort } from "@/lib/table-sort";

const STATUS_OPTS: ProjectStatus[] = ["active", "on_hold", "completed", "cancelled"];
type ProjectSortKey = "code" | "name" | "status" | "contract_value" | "burn_rate" | "margin" | "end_date";
const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled",
};

// ── New Project Modal ─────────────────────────────────────────────────────────
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: "", name: "", contract_value: "", status: "active" as ProjectStatus,
    currency: getStoredCurrency(), start_date: "", end_date: "",
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const create = useMutation({
    mutationFn: () => projectsApi.create({
      code:           form.code.toUpperCase().trim(),
      name:           form.name.trim(),
      contract_value: parseFloat(form.contract_value) || 0,
      currency:       form.currency,
      status:         form.status,
      start_date:     form.start_date || null,
      end_date:       form.end_date   || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (e) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? String(e);
      setToast({ msg, ok: false });
      setTimeout(() => setToast(null), 3500);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in",
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.ok ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">New Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Code *
              </label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="GPA-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase"
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
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Project Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Project description…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as CurrencyCode }))}
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
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
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
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.code || !form.name}
          >
            {create.isPending ? "Creating…" : "Create Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ViewMode = "card" | "table";
type ArchiveFilter = "active" | "archived" | "all";

const STATUS_FILTERS: { label: string; value: ProjectStatus | "" }[] = [
  { label: "All",       value: "" },
  { label: "Active",    value: "active" },
  { label: "On Hold",   value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

// ── Health Badge ──────────────────────────────────────────────────────────────
function HealthBadge({ project }: { project: Project }) {
  if (project.total_revenue <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
        Belum Ada AR
      </span>
    );
  }
  const burn = (project.total_committed / project.total_revenue) * 100;
  if (project.budget < 0 || burn >= 100) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        Over Budget
      </span>
    );
  }
  if (burn >= 70) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Perlu Perhatian
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
      Sehat
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  canManage,
  canDelete,
  onArchive,
  onDelete,
}: {
  project: Project;
  canManage: boolean;
  canDelete: boolean;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const usedPct    = pct(project.total_committed, project.contract_value);
  const revPct     = pct(project.total_revenue,   project.contract_value);
  const marginPct  = project.total_revenue > 0
    ? pct(project.total_revenue - project.total_committed, project.total_revenue)
    : 0;
  const barColor   = burnTailwind(usedPct);
  const symbol = getCurrencySymbol(project.currency);

  return (
    <Card className={cn(
      "flex flex-col gap-4 hover:shadow-card-md transition-shadow group",
      project.is_archived && "opacity-70"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-primary" />
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="num text-xs font-semibold text-gray-400 tracking-wide truncate">{project.code}</p>
            <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {project.is_archived && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase">
              Archived
            </span>
          )}
          <ProjectStatusBadge status={project.status} />
          {canManage && <button
            className="p-1 rounded-md text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
            title={project.is_archived ? "Restore project" : "Archive project"}
            onClick={() => onArchive(project)}
          >
            {project.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
          </button>}
          {canDelete && project.is_archived && (
            <button
              className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete project"
              onClick={() => onDelete(project)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg px-2 py-2">
          <p className="num text-sm font-bold text-gray-900">{symbol}{formatCompact(project.contract_value)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Contract</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-2 py-2">
          <p className={`num text-sm font-bold ${usedPct >= 90 ? "text-red-600" : usedPct >= 70 ? "text-amber-600" : "text-gray-900"}`}>
            {usedPct.toFixed(0)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Used</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-2 py-2">
          <p className={`num text-sm font-bold ${marginPct < 10 ? "text-red-600" : "text-green-600"}`}>
            {marginPct.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Margin</p>
        </div>
      </div>

      {/* Burn bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Budget burn</span>
          <span className="num">
            {formatCurrency(project.total_committed, symbol, 0)} / {formatCurrency(project.contract_value, symbol, 0)}
          </span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gray-200 rounded-full"
            style={{ width: `${Math.min(revPct, 100)}%` }}
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(usedPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-400 num truncate max-w-[55%]">{project.code}</span>
          <span className={`num font-semibold ${usedPct >= 90 ? "text-red-500" : usedPct >= 70 ? "text-amber-500" : "text-gray-400"}`}>
            {usedPct.toFixed(0)}% used
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
          </span>
          <HealthBadge project={project} />
        </div>
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-0.5 text-primary hover:text-primary-700 font-medium transition-colors"
        >
          Open <ChevronRight size={11} />
        </Link>
      </div>
    </Card>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function ProjectRow({
  project,
  canManage,
  canDelete,
  onArchive,
  onDelete,
}: {
  project: Project;
  canManage: boolean;
  canDelete: boolean;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const usedPct   = pct(project.total_committed, project.contract_value);
  const marginPct = project.total_revenue > 0
    ? pct(project.total_revenue - project.total_committed, project.total_revenue)
    : 0;
  const barColor  = burnTailwind(usedPct);
  const symbol = getCurrencySymbol(project.currency);

  return (
    <tr className={cn(
      "hover:bg-gray-50/70 transition-colors border-b border-gray-50 last:border-0",
      project.is_archived && "opacity-70"
    )}>
      <td className="td w-[130px] max-w-[130px]">
        <span className="num font-semibold text-gray-500 text-xs truncate block">{project.code}</span>
      </td>
      <td className="td max-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{project.name}</p>
      </td>
      <td className="td hidden md:table-cell">
        <div className="flex items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          {project.is_archived && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase">
              Archived
            </span>
          )}
          <HealthBadge project={project} />
        </div>
      </td>
      <td className="td text-right hidden lg:table-cell">
        <span className="num font-semibold text-gray-900">
          {formatCurrency(project.contract_value, symbol)}
        </span>
      </td>
      <td className="td hidden xl:table-cell">
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
          <span className={`num text-xs font-semibold w-9 text-right shrink-0 ${
            usedPct >= 90 ? "text-red-500" : usedPct >= 70 ? "text-amber-500" : "text-gray-500"
          }`}>
            {usedPct.toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="td hidden lg:table-cell text-right">
        <span className={`num text-sm font-semibold ${marginPct < 10 ? "text-red-500" : "text-green-600"}`}>
          {marginPct.toFixed(1)}%
        </span>
      </td>
      <td className="td text-right">
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-gray-400 hidden sm:inline">{fmtDate(project.end_date)}</span>
          <Link
            href={`/projects/${project.id}`}
            className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors ml-1"
            title="Open project"
          >
            <ChevronRight size={14} />
          </Link>
          {canManage && <button
            onClick={() => onArchive(project)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={project.is_archived ? "Restore project" : "Archive project"}
          >
            {project.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
          </button>}
          {canDelete && project.is_archived && (
            <button
              onClick={() => onDelete(project)}
              className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const qc  = useQueryClient();
  const { isPM, isCostControl, isMD } = useRole();
  const canManage = isPM || isCostControl;
  const canDelete = isMD;
  const [view,        setView]   = useState<ViewMode>("card");
  const [search,      setSearch] = useState("");
  const [statusFilter,setStatus] = useState<ProjectStatus | "">("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [page,        setPage]   = useState(1);
  const [importOpen,  setImport] = useState(false);
  const [newOpen,     setNew]    = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const { sortKey, sortDirection, toggleSort } = useTableSort<ProjectSortKey>("code", "asc");

  const PAGE_SIZE = 18; // 3-col grid fits 18 nicely

  const { data: projectData, isLoading } = useQuery({
    queryKey: ["projects", statusFilter, archiveFilter, search, sortKey, sortDirection, page],
    queryFn:  () => {
      const params: Parameters<typeof projectsApi.list>[0] = {
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort_by: sortKey,
        sort_dir: sortDirection,
      };
      if (statusFilter) params.status = statusFilter;
      if (archiveFilter === "active") params.archived = false;
      if (archiveFilter === "archived") params.archived = true;
      if (archiveFilter === "all") params.include_archived = true;
      if (search) params.search = search;
      return projectsApi.list(params).then((r) => r.data);
    },
  });
  const projects  = projectData?.items ?? [];
  const totalPages = Math.ceil((projectData?.total ?? 0) / PAGE_SIZE);
  const paged      = projects;

  function handleSort(column: ProjectSortKey) {
    toggleSort(column);
    setPage(1);
  }

  const archiveMut = useMutation({
    mutationFn: (project: Project) => projectsApi.update(project.id, { is_archived: !project.is_archived }),
    onSuccess: (_, project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toastSuccess(project.is_archived ? "Project restored" : "Project archived", project.code);
    },
    onError: (e) => toastError("Update failed", getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (project: Project) => projectsApi.delete(project.id),
    onSuccess: (_, project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDeletingProject(null);
      toastSuccess("Project deleted", project.code);
    },
    onError: (e) => toastError("Delete failed", getErrorMessage(e)),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {canManage && newOpen && <NewProjectModal onClose={() => setNew(false)} />}
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Project Command</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {projectData?.total ?? 0} project{(projectData?.total ?? 0) !== 1 ? "s" : ""} · All workspaces
          </p>
        </div>
        {canManage && <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={13} />}
            onClick={() => setImport(true)}
          >
            Import
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => setNew(true)}
          >
            New Project
          </Button>
        </div>}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search code, name…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                statusFilter === f.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {[
            { label: "Active", value: "active" },
            { label: "Archived", value: "archived" },
            { label: "All", value: "all" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setArchiveFilter(f.value as ArchiveFilter); setPage(1); }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                archiveFilter === f.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-1 ml-auto sm:ml-0">
          <button
            onClick={() => setView("card")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "card" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"
            )}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "table" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"
            )}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : projects.length === 0
              ? (
                <div className="col-span-full bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <AlertTriangle size={24} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">No projects found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {search ? "Try a different search" : "Create or import your first project"}
                  </p>
                </div>
              )
              : paged.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  canManage={canManage}
                  canDelete={canDelete}
                  onArchive={(project) => archiveMut.mutate(project)}
                  onDelete={setDeletingProject}
                />
              ))
          }
        </div>
      ) : (
        <Card padding={false}>
          {isLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <div className="overflow-x-auto"><table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableTableHeader label="Code" column="code" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableTableHeader label="Project Name" column="name" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableTableHeader label="Status" column="status" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell" />
                  <SortableTableHeader label="Contract Value" column="contract_value" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                  <SortableTableHeader label="Burn Rate" column="burn_rate" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell" />
                  <SortableTableHeader label="Margin" column="margin" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                  <SortableTableHeader label="End Date" column="end_date" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="td text-center text-gray-400 py-12">
                      No projects match your filters
                    </td>
                  </tr>
                ) : (
                  paged.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      canManage={canManage}
                      canDelete={canDelete}
                      onArchive={(project) => archiveMut.mutate(project)}
                      onDelete={setDeletingProject}
                    />
                  ))
                )}
              </tbody>
            </table></div>
          )}
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={projectData?.total}
          pageSize={PAGE_SIZE}
        />
      )}

      {canManage && <ImportModal open={importOpen} onClose={() => setImport(false)} />}
      <ConfirmDialog
        open={canDelete && !!deletingProject}
        onClose={() => {
          if (!deleteMut.isPending) setDeletingProject(null);
        }}
        onConfirm={() => {
          if (deletingProject) deleteMut.mutate(deletingProject);
        }}
        title="Delete Project"
        message={
          deletingProject
            ? `Delete archived project ${deletingProject.code}? Related revenue, spending, petty cash, and project documents will also be deleted.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
      />

    </div>
  );
}
