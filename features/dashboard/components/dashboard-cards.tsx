import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ProjectHealthMetric, ProjectHealthStatus } from "../lib/dashboard-metrics";

export function KPICard({
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

// ── Project health ────────────────────────────────────────────────────────────
const HEALTH_STATUS: Record<ProjectHealthStatus, { label: string; className: string; dot: string }> = {
  on_track: {
    label: "On Track",
    className: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  at_risk: {
    label: "At Risk",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  behind: {
    label: "Behind",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  needs_data: {
    label: "Needs Data",
    className: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
};

export function HealthBadge({ metric }: { metric: ProjectHealthMetric }) {
  const style = HEALTH_STATUS[metric.status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-semibold whitespace-nowrap ${style.className}`}
      title={metric.reason}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function ProjectHealthRow({ metric }: { metric: ProjectHealthMetric }) {
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-mono font-semibold text-gray-500">{metric.project.code}</p>
          <p className="text-xs text-gray-800 truncate font-medium mt-0.5">{metric.project.name}</p>
        </div>
        <HealthBadge metric={metric} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-gray-400">
        <span>Progress <strong className="text-gray-600">{metric.progress == null ? "--" : `${metric.progress.toFixed(0)}%`}</strong></span>
        <span>Budget <strong className="text-gray-600">{metric.budgetUsed.toFixed(0)}%</strong></span>
        <span>HSE <strong className="text-gray-600">{metric.safeDays == null ? "--" : `${metric.safeDays}d`}</strong></span>
      </div>
    </div>
  );
}
