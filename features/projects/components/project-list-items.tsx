import Link from "next/link";
import {
  Archive,
  Building2,
  Calendar,
  ChevronRight,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/types";
import {
  burnTailwind,
  cn,
  fmtDate,
  formatCompact,
  formatCurrency,
  getCurrencySymbol,
  pct,
} from "@/lib/utils";

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
export function ProjectCard({
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
export function ProjectRow({
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
