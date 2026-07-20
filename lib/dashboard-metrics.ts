import type { OperationalRecord, Project } from "@/lib/types";
import { pct } from "@/lib/utils";

export type ProjectHealthStatus = "on_track" | "at_risk" | "behind" | "needs_data";

export interface ProjectHealthMetric {
  project: Project;
  progress: number | null;
  budgetUsed: number;
  safeDays: number | null;
  status: ProjectHealthStatus;
  reason: string;
}

const TRUSTED_PROGRESS_STATUSES = new Set(["approved", "active", "completed", "closed"]);
const IGNORED_HSE_STATUSES = new Set(["rejected", "cancelled"]);

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / 86_400_000));
}

function expectedScheduleProgress(project: Project, now: Date): number | null {
  const start = asDate(project.start_date);
  const end = asDate(project.end_date);
  if (!start || !end || end <= start) return null;
  const elapsed = now.getTime() - start.getTime();
  const duration = end.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (elapsed / duration) * 100));
}

function latestRecord(records: OperationalRecord[]): OperationalRecord | undefined {
  return [...records].sort((a, b) => {
    const byUpdated = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    return byUpdated || b.id - a.id;
  })[0];
}

function groupByProject(
  records: OperationalRecord[],
  include: (record: OperationalRecord) => boolean,
): Map<number, OperationalRecord[]> {
  const grouped = new Map<number, OperationalRecord[]>();
  for (const record of records) {
    if (record.project_id == null || !include(record)) continue;
    const projectRecords = grouped.get(record.project_id) ?? [];
    projectRecords.push(record);
    grouped.set(record.project_id, projectRecords);
  }
  return grouped;
}

function buildProjectHealth(
  project: Project,
  progressRecords: OperationalRecord[],
  hseRecords: OperationalRecord[],
  now: Date,
  canReadProgress: boolean,
  canReadHse: boolean,
): ProjectHealthMetric {
  const progressRecord = latestRecord(progressRecords);
  const progress = progressRecord ? Math.max(0, Math.min(100, Number(progressRecord.progress))) : null;
  const budgetUsed = Math.max(0, pct(project.total_committed, project.contract_value));
  const lostTimeIncidents = hseRecords.filter((record) =>
    record.record_type === "incident" && Number(record.details?.lost_time_days ?? 0) > 0,
  );
  const latestLostTimeIncident = latestRecord(lostTimeIncidents);
  const latestLostTimeDate = latestLostTimeIncident
    ? asDate(latestLostTimeIncident.details?.event_date) ?? asDate(latestLostTimeIncident.created_at)
    : null;
  const hseBaseline = latestLostTimeDate ?? asDate(project.start_date);
  const safeDays = hseRecords.length > 0 && hseBaseline ? daysSince(hseBaseline, now) : null;
  const expectedProgress = expectedScheduleProgress(project, now);
  const scheduleGap = progress != null && expectedProgress != null ? expectedProgress - progress : 0;
  const projectEnd = asDate(project.end_date);
  const isOverdue = !!projectEnd && projectEnd < now && (progress ?? 0) < 100;
  const recentLostTimeIncident = latestLostTimeDate ? daysSince(latestLostTimeDate, now) <= 30 : false;

  // Project health intentionally combines approved progress, schedule, spend,
  // and recorded HSE evidence. These thresholds are existing business rules.
  if (budgetUsed > 100 || isOverdue || scheduleGap >= 30) {
    return {
      project, progress, budgetUsed, safeDays, status: "behind",
      reason: budgetUsed > 100
        ? "Committed spend exceeds contract value"
        : isOverdue
          ? "Project end date has passed"
          : "Progress is materially behind schedule",
    };
  }
  if (budgetUsed >= 90 || scheduleGap >= 15 || recentLostTimeIncident) {
    return {
      project, progress, budgetUsed, safeDays, status: "at_risk",
      reason: recentLostTimeIncident
        ? "Lost-time incident recorded in the last 30 days"
        : budgetUsed >= 90
          ? "Committed spend is nearing contract value"
          : "Progress is behind the planned schedule",
    };
  }
  if (progress == null || (canReadHse && hseRecords.length === 0)) {
    return {
      project, progress, budgetUsed, safeDays, status: "needs_data",
      reason: progress == null
        ? canReadProgress
          ? "No approved progress update has been recorded"
          : "Project Execution access is required to assess progress"
        : "No HSE activity has been recorded for this project",
    };
  }
  return {
    project, progress, budgetUsed, safeDays, status: "on_track",
    reason: "Progress, budget, schedule, and HSE indicators are within limits",
  };
}

/**
 * Index operational rows once before calculating every project's health.
 * This preserves the original thresholds while avoiding repeated full-array
 * filtering for each active project.
 */
export function buildProjectHealthMetrics(
  projects: Project[],
  progressRecords: OperationalRecord[],
  hseRecords: OperationalRecord[],
  now: Date,
  canReadProgress: boolean,
  canReadHse: boolean,
): ProjectHealthMetric[] {
  const progressByProject = groupByProject(
    progressRecords,
    (record) => TRUSTED_PROGRESS_STATUSES.has(record.status),
  );
  const hseByProject = groupByProject(
    hseRecords,
    (record) => !IGNORED_HSE_STATUSES.has(record.status),
  );

  return projects.map((project) =>
    buildProjectHealth(
      project,
      progressByProject.get(project.id) ?? [],
      hseByProject.get(project.id) ?? [],
      now,
      canReadProgress,
      canReadHse,
    ),
  );
}
