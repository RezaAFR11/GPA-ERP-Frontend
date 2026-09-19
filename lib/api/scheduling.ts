import { api } from "./client";

export interface Shift {
  id: number; name: string; start_time: string; break_start_minutes: number;
  grace_minutes: number; reminder_minutes: number; is_active: boolean;
}
export interface Schedule {
  shift_name: string; date: string; timezone: string; location_name: string;
  starts_at: string; ends_at: string; break_starts_at: string; break_ends_at: string;
  grace_minutes: number; reminder_minutes: number;
}
export interface Assignment {
  id: number; employee_name: string; employee_id: number; snapshot: Schedule;
  shift_id: number; work_location_id: number; weekdays: number[];
  effective_from: string; is_active: boolean;
}
export interface UnresolvedAttendance {
  id: number; date: string; clock_in: string; auto_closed_at: string;
  clarification_status: string; schedule_snapshot: Schedule;
}
export interface Clarification {
  id: number; attendance_id: number; reason: string; actual_clock_out: string; note: string;
  status: string; review_note: string | null; employee_name?: string;
  attendance_date?: string; schedule?: Schedule; clock_in?: string;
}
export interface MySchedule {
  current: Schedule | null; upcoming: Schedule[]; unresolved: UnresolvedAttendance[];
  clarifications: Clarification[];
}
export interface ScheduleAudit {
  id: number; entity_type: string; entity_id: number; action: string;
  changed_by: number | null; created_at: string;
  before_state: unknown; after_state: unknown;
}
const root = "/hris/scheduling";
export const schedulingApi = {
  shifts: () => api.get<Shift[]>(`${root}/shifts`),
  saveShift: (data: Omit<Shift, "id">, id?: number) => id
    ? api.put<Shift>(`${root}/shifts/${id}`, data) : api.post<Shift>(`${root}/shifts`, data),
  assignments: () => api.get<Assignment[]>(`${root}/weekly-schedules`),
  assign: (data: { employee_ids: number[]; work_group_id?: number; shift_id: number;
    work_location_id: number; weekdays: number[] }) =>
    api.post<{ assigned: number; preserved_sessions: number }>(`${root}/weekly-schedules`, data),
  cancel: (id: number) => api.delete(`${root}/weekly-schedules/${id}`),
  mine: () => api.get<MySchedule>(`${root}/me`),
  clarify: (id: number, data: { reason: string; actual_clock_out: string; note: string }) =>
    api.post(`${root}/attendance/${id}/clarifications`, data),
  clarifications: () => api.get<Clarification[]>(`${root}/clarifications`),
  review: (id: number, approve: boolean, note: string) => api.post(`${root}/clarifications/${id}/review`, { approve, note }),
  history: () => api.get<ScheduleAudit[]>(`${root}/history`),
};

export function scheduleTime(iso: string | null | undefined, zone?: string) {
  return iso ? new Date(iso).toLocaleString("id-ID", {
    timeZone: zone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }) : "—";
}

export const clarificationLabels: Record<string, string> = {
  required: "Ditutup otomatis — menunggu klarifikasi", pending: "Menunggu persetujuan HR",
  approved: "Koreksi disetujui", rejected: "Ditolak — kirim ulang klarifikasi",
};
