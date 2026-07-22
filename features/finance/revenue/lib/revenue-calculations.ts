import type { AccountReceivable } from "@/lib/types";

/** Amount received is intentionally independent from revenue confirmation. */
export function paidAmount(receivable: AccountReceivable): number {
  return receivable.actual_payment ?? 0;
}

export function remainingAmount(receivable: AccountReceivable): number {
  return Math.max(receivable.amount - paidAmount(receivable), 0);
}

export function paymentState(receivable: AccountReceivable): "paid" | "partial" | "open" {
  const paid = paidAmount(receivable);
  const remaining = remainingAmount(receivable);
  if (paid > 0 && remaining <= 1) return "paid";
  if (paid > 0) return "partial";
  return "open";
}

/** Support both structured invoices and descriptions imported from older data. */
export function invoiceLabel(receivable: AccountReceivable): string {
  if (receivable.invoice_no) return receivable.invoice_no;
  const match = receivable.description.match(/Invoice:\s*([^\n]+)/i);
  return match?.[1]?.trim() || `AR-${receivable.id}`;
}

export function descriptionSummary(receivable: AccountReceivable): string {
  const match = receivable.description.match(/Description:\s*([^\n]+)/i);
  return (match?.[1] || receivable.description).replace(/\n/g, " ").trim();
}
