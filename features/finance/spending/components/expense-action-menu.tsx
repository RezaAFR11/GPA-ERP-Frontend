"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  History,
  MoreHorizontal,
  Printer,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { FloatingActionMenu } from "@/components/ui/floating-action-menu";
import { expensesApi } from "@/lib/api";
import { getExpenseActionPermissions } from "@/lib/action-center";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import type { Expense, RoleName } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

import { ApprovalTimeline } from "./approval-timeline";

// ── Action menu ───────────────────────────────────────────────────────────────
export function ActionMenu({
  expense,
  onRefresh,
  onDuplicate,
  onPrintVoucher,
  onDelete,
  isSelfService,
  role,
  userId,
  canDuplicate,
}: {
  expense: Expense;
  onRefresh: () => void;
  onDuplicate: (expense: Expense) => void;
  onPrintVoucher: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  isSelfService: boolean;
  role: RoleName | null;
  userId: number | null;
  canDuplicate: boolean;
}) {
  const [open,           setOpen]           = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    data:     auditHistory,
    isFetching: auditFetching,
    refetch:  refetchAudit,
  } = useQuery({
    queryKey: ["expense-audit", expense.id],
    queryFn:  () => expensesApi.audit(expense.id).then((r) => r.data),
    enabled:  false,
  });

  function makeAction(fn: () => Promise<unknown>, successMsg: string) {
    return async () => {
      try { await fn(); toastSuccess(successMsg); onRefresh(); }
      catch (e) { toastError("Action failed", getErrorMessage(e)); }
      finally { setOpen(false); }
    };
  }

  const permissions = getExpenseActionPermissions(expense, role, userId);
  const canSubmit = permissions.canSubmit;
  // Self-service users (STAFF/WORKER) can only submit — they cannot verify, approve, or pay
  const canVerify = !isSelfService && permissions.canVerify;
  const canApprove = !isSelfService && permissions.canApprove;
  const canPay = !isSelfService && permissions.canPay;
  const canReject = !isSelfService && permissions.canReject;
  const canDelete = permissions.canDelete;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
      <FloatingActionMenu
        open={open}
        anchorRef={buttonRef}
        onClose={() => setOpen(false)}
        widthClass="w-48"
        estimatedHeight={historyOpen ? 430 : 300}
      >
            {canSubmit && (
              <button
                onClick={makeAction(() => expensesApi.submit(expense.id), "Expense submitted")}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Send size={12} className="text-blue-500" /> Submit for approval
              </button>
            )}
            {canVerify && (
              <button
                onClick={makeAction(() => expensesApi.verify(expense.id), "Expense verified")}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CheckCircle2 size={12} className="text-cyan-500" /> Verify
              </button>
            )}
            {canApprove && (
              <button
                onClick={makeAction(() => expensesApi.approve(expense.id), "Expense approved")}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CheckCircle2 size={12} className="text-green-500" /> Approve
              </button>
            )}
            {canPay && (
              <button
                onClick={makeAction(() => expensesApi.pay(expense.id), "Marked as paid")}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CheckCircle2 size={12} className="text-purple-500" /> Mark paid
              </button>
            )}

            {/* ── Utility actions ──────────────────────────────────────── */}
            <div className="my-1 border-t border-gray-100" />
            {canDuplicate && (
              <button
                onClick={() => { onDuplicate(expense); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Copy size={12} className="text-amber-500" /> Duplicate
              </button>
            )}
            <button
              onClick={() => { onPrintVoucher(expense); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer size={12} className="text-gray-500" /> Print Voucher
            </button>

            {/* ── Approval history ─────────────────────────────────────── */}
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={() => {
                const next = !historyOpen;
                setHistoryOpen(next);
                if (next && !auditHistory) refetchAudit();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <History size={12} className="text-indigo-500" />
              History
              {auditFetching && (
                <span className="ml-auto w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
              )}
            </button>
            {historyOpen && (
              <div className="px-3 pb-2 max-h-64 overflow-y-auto">
                <ApprovalTimeline
                  history={
                    auditHistory
                      ? auditHistory.map((log) => ({
                          action:    log.action,
                          role:      null,
                          user_id:   log.changed_by ?? 0,
                          timestamp: log.created_at,
                          note:      null,
                        }))
                      : (expense.approval_history ?? [])
                  }
                />
              </div>
            )}

            {canReject && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={makeAction(
                    () => expensesApi.reject(expense.id, "Rejected via action menu"),
                    "Expense rejected"
                  )}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle size={12} /> Reject
                </button>
              </>
            )}
            {canDelete && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { onDelete(expense); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </>
            )}
      </FloatingActionMenu>
    </div>
  );
}

// ── Sortable header ───────────────────────────────────────────────────────────
