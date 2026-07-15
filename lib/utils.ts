import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import type { ExpenseStatus, ARStatus, ProjectStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCIES = [
  { code: "IDR", symbol: "Rp ", label: "IDR - Rupiah" },
  { code: "PHP", symbol: "PHP ", label: "PHP - Peso" },
  { code: "USD", symbol: "USD ", label: "USD - Dollar" },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]["code"];

export function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "IDR";
  const stored = window.localStorage.getItem("gpa_currency");
  return CURRENCIES.some((c) => c.code === stored) ? stored as CurrencyCode : "IDR";
}

export function setStoredCurrency(code: CurrencyCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("gpa_currency", code);
  window.dispatchEvent(new Event("gpa_currency_changed"));
}

export function getCurrencySymbol(code?: string | null): string {
  const selected = CURRENCIES.find((c) => c.code === (code ?? "IDR"));
  return selected?.symbol ?? "Rp ";
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(
  value: number | string | null | undefined,
  symbol = getCurrencySymbol(),
  decimals = 0
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${symbol}${num.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(num) >= 1_000_000)     return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000)         return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd MMM yyyy"); }
  catch { return iso; }
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd MMM yyyy · HH:mm"); }
  catch { return iso; }
}

export function toLocalDateInputValue(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Percent ──────────────────────────────────────────────────────────────────

export function pct(part: number | string, total: number | string, decimals = 1): number {
  const p = typeof part  === "string" ? parseFloat(part)  : part;
  const t = typeof total === "string" ? parseFloat(total) : total;
  if (!t || isNaN(p) || isNaN(t)) return 0;
  return parseFloat(((p / t) * 100).toFixed(decimals));
}

export function fmtPct(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  draft:       "Draft",
  submitted:   "Submitted",
  verified:    "Verified",
  approved:    "Approved",
  paid:        "Paid",
  hard_locked: "Locked",
  rejected:    "Rejected",
};

export const EXPENSE_STATUS_COLORS: Record<
  ExpenseStatus,
  { bg: string; text: string; border: string }
> = {
  draft:       { bg: "bg-gray-100",   text: "text-gray-600",   border: "border-gray-300" },
  submitted:   { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  verified:    { bg: "bg-cyan-50",    text: "text-cyan-700",   border: "border-cyan-200" },
  approved:    { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
  paid:        { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  hard_locked: { bg: "bg-gray-900",   text: "text-white",      border: "border-gray-700" },
  rejected:    { bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200" },
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active:    "bg-green-50 text-green-700 border-green-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  on_hold:   "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export const AR_STATUS_COLORS: Record<ARStatus, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-300",
  confirmed: "bg-green-50 text-green-700 border-green-200",
};

// ─── Burn-rate color ──────────────────────────────────────────────────────────

export function burnColor(pctUsed: number): string {
  if (pctUsed >= 90) return "bar-critical";
  if (pctUsed >= 70) return "bar-caution";
  return "bar-ok";
}

export function burnTailwind(pctUsed: number): string {
  if (pctUsed >= 90) return "bg-red-500";
  if (pctUsed >= 70) return "bg-amber-500";
  return "bg-green-500";
}

// ─── Role labels ──────────────────────────────────────────────────────────────

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:     "Super Admin",
  MD:              "Managing Director",
  PM:              "Project Manager",
  PROJECT_CONTROL: "Project Control",
  COST_CONTROL:    "Cost Control",
  FINANCE:         "Finance",
  GA:              "General Admin",
  HR:              "HR",
  STAFF:           "Staff",
  WORKER:          "Worker (Self-Service)",
};

// ─── Axios error message ──────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const e = error as { response?: { data?: { detail?: unknown } }; message?: string };
    const detail = e.response?.data?.detail;
    if (Array.isArray(detail)) {
      // FastAPI / Pydantic validation errors: [{type, loc, msg, input}, ...]
      const msgs = detail
        .map((d: unknown) => {
          if (typeof d === "object" && d !== null && "msg" in d) return String((d as { msg: unknown }).msg);
          return null;
        })
        .filter(Boolean);
      return msgs.length > 0 ? msgs.join("; ") : "Validation error";
    }
    if (typeof detail === "string") return detail;
    return e.message ?? "An unexpected error occurred";
  }
  return String(error);
}
