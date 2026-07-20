import { Receipt } from "lucide-react";

// ── Expense type badge ────────────────────────────────────────────────────────
export function ExpenseTypeBadge({ type }: { type?: string }) {
  if (type === "reimbursement") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        <Receipt size={9} /> Reimb.
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
      Regular
    </span>
  );
}
