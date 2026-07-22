import type {
  OperationalModule,
  OperationalRecord,
  OperationalRecordInput,
} from "@/lib/types";

import type { FormState } from "./operational-workspace-config";

export function emptyForm(module?: OperationalModule): FormState {
  return {
    record_type: Object.keys(module?.record_types ?? {})[0] ?? "",
    reference_no: "",
    title: "",
    description: "",
    priority: "normal",
    project_id: "",
    partner_name: "",
    amount: "0",
    currency: "IDR",
    progress: "0",
    due_date: "",
    owner_id: "",
    details: {},
  };
}

export function formFromRecord(record: OperationalRecord): FormState {
  return {
    record_type: record.record_type,
    reference_no: record.reference_no,
    title: record.title,
    description: record.description ?? "",
    priority: record.priority,
    project_id: record.project_id?.toString() ?? "",
    partner_name: record.partner_name ?? "",
    amount: String(record.amount),
    currency: record.currency,
    progress: String(record.progress),
    due_date: record.due_date ?? "",
    owner_id: record.owner_id?.toString() ?? "",
    details: Object.fromEntries(
      Object.entries(record.details ?? {}).map(([key, value]) => [key, value == null ? "" : String(value)]),
    ),
  };
}

export function toPayload(form: FormState): OperationalRecordInput {
  const details = Object.fromEntries(
    Object.entries(form.details).filter(([, value]) => value !== ""),
  );
  return {
    record_type: form.record_type,
    ...(form.reference_no.trim() ? { reference_no: form.reference_no.trim() } : {}),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    priority: form.priority,
    project_id: form.project_id ? Number(form.project_id) : null,
    partner_name: form.partner_name.trim() || undefined,
    amount: Number(form.amount || 0),
    currency: form.currency.toUpperCase(),
    progress: Number(form.progress || 0),
    due_date: form.due_date || null,
    owner_id: form.owner_id ? Number(form.owner_id) : null,
    details,
  };
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}
