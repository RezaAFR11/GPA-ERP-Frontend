import type { EmployeeStatus, EmploymentType, RoleName } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const TIPE_COLORS: Record<string, string> = {
  Tetap:     "bg-teal-50 text-teal-700 border-teal-200",
  PKWT:      "bg-blue-50 text-blue-700 border-blue-200",
  Outsource: "bg-orange-50 text-orange-700 border-orange-200",
};

export const STATUS_COLORS: Record<string, string> = {
  active:     "bg-green-50 text-green-700 border-green-200",
  probation:  "bg-amber-50 text-amber-700 border-amber-200",
  leave:      "bg-blue-50 text-blue-700 border-blue-200",
  terminated: "bg-red-50 text-red-700 border-red-200",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Aktif", probation: "Probasi", leave: "Cuti Panjang", terminated: "Berhenti",
};

export const TIPE_OPTIONS: EmploymentType[] = ["Tetap", "PKWT", "Outsource"];
export const STATUS_OPTIONS: EmployeeStatus[] = ["active", "probation", "leave", "terminated"];

/** Roles available for bulk assignment (exclude super admin) */
export const ASSIGNABLE_ROLES: RoleName[] = [
  "MD", "PM", "PROJECT_CONTROL", "COST_CONTROL", "FINANCE", "GA", "HR", "STAFF", "WORKER",
];
