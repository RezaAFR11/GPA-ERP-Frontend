"use client";

import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, fmtDate, EXPENSE_STATUS_LABEL } from "@/lib/utils";
import { terbilang } from "@/lib/terbilang";
import type { Expense } from "@/lib/types";

interface ExpenseVoucherModalProps {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
}

export default function ExpenseVoucherModal({
  open,
  onClose,
  expense,
}: ExpenseVoucherModalProps) {
  if (!expense) return null;

  const infoRows: { label: string; value: string }[] = [
    { label: "No. ID",        value: `#${expense.id}` },
    { label: "Tanggal",       value: fmtDate(expense.created_at) },
    { label: "Proyek",        value: (expense as unknown as { project?: { name?: string } }).project?.name ?? String(expense.project_id) },
    { label: "Cost Code",     value: expense.cost_code?.code ?? "—" },
    { label: "Vendor",        value: expense.vendor_name || "—" },
    { label: "No. Referensi", value: expense.reference_no || "—" },
    { label: "Status",        value: EXPENSE_STATUS_LABEL[expense.status] },
  ];

  return (
    <>
      {/* Print style — only active when printing */}
      <style>{`@media print { body > * { display: none !important; } #voucher-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; } body { margin: 0; } }`}</style>

      <Modal
        open={open}
        onClose={onClose}
        title="Bukti Pengeluaran"
        size="lg"
        footer={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Printer size={14} />
            Print
          </button>
        }
      >
        <div id="voucher-print-area" className="font-mono text-sm space-y-4">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="text-center space-y-0.5">
            <p className="font-bold text-base tracking-wide">PT GRAHA PERKASA ABADI</p>
            <p className="font-semibold tracking-widest text-xs uppercase">Bukti Pengeluaran</p>
          </div>
          <hr className="border-gray-400" />

          {/* ── Info table ──────────────────────────────────────────────────── */}
          <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-xs">
            {infoRows.map(({ label, value }) => (
              <>
                <dt key={`l-${label}`} className="text-gray-500 py-0.5">{label}</dt>
                <dd key={`v-${label}`} className="text-gray-900 font-medium py-0.5">{value}</dd>
              </>
            ))}
          </dl>

          <hr className="border-gray-200" />

          {/* ── Amount box ──────────────────────────────────────────────────── */}
          <div className="border border-gray-300 rounded-lg px-4 py-3 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest">Jumlah</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(expense.amount, "Rp ")}
            </p>
            <p className="text-xs italic text-gray-500">
              {terbilang(expense.amount)}
            </p>
          </div>

          {/* ── Keterangan ──────────────────────────────────────────────────── */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Keterangan</p>
            <p className="text-sm text-gray-800 leading-relaxed">{expense.description}</p>
          </div>

          <hr className="border-gray-200" />

          {/* ── Signatures ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {["Dibuat Oleh", "Diverifikasi Oleh", "Disetujui Oleh"].map((role) => (
              <div key={role} className="text-center space-y-8">
                <p className="text-xs font-semibold text-gray-600">{role}</p>
                <div className="border-b border-gray-400 mx-4" />
                <p className="text-xs text-gray-400">( ________________ )</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
