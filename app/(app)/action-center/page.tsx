"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, ShieldCheck, Banknote, Send, AlertCircle, X, Receipt } from "lucide-react";
import { expensesApi } from "@/lib/api";
import { formatCurrency, fmtDateTime, getErrorMessage } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseStatusBadge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import { useAuth, useRole } from "@/lib/auth-context";
import { getActionCenterQueues, loadActionCenterExpenses } from "@/lib/action-center";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";
import { openAuthenticatedFile } from "@/lib/authenticated-files";

interface GroupProps {
  title:    string;
  icon:     React.ElementType;
  color:    string;
  expenses: Expense[];
  action:   { label: string; fn: (id: number) => Promise<unknown>; color?: string };
  onDone:   () => void;
  onView:   (exp: Expense) => void;
}

function ActionGroup({ title, icon: Icon, color, expenses, action, onDone, onView }: GroupProps) {
  const qc = useQueryClient();

  async function handleAction(id: number) {
    try {
      await action.fn(id);
      toastSuccess(`${action.label} — Done`, `Expense #${id} updated`);
      onDone();
    } catch (e) {
      toastError("Action failed", getErrorMessage(e));
    }
  }

  if (expenses.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
          <Icon size={13} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="ml-1 text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 num font-semibold">
          {expenses.length}
        </span>
      </div>
      <Card padding={false}>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th">#</th>
              <th className="th">Description</th>
              <th className="th hidden md:table-cell">Cost Code</th>
              <th className="th text-right">Amount</th>
              <th className="th hidden lg:table-cell">Submitted</th>
              <th className="th">Status</th>
              <th className="th">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="td num text-gray-400 text-xs">#{exp.id}</td>
                <td className="td">
                  <p className="text-sm font-medium text-gray-900 max-w-[180px] truncate">
                    {exp.description}
                  </p>
                </td>
                <td className="td hidden md:table-cell">
                  <span className="text-xs text-gray-400 num">{exp.cost_code?.code ?? "—"}</span>
                </td>
                <td className="td text-right num font-bold text-gray-900">
                  {formatCurrency(exp.amount)}
                </td>
                <td className="td hidden lg:table-cell text-xs text-gray-400 num">
                  {fmtDateTime(exp.created_at)}
                </td>
                <td className="td"><ExpenseStatusBadge status={exp.status} /></td>
                <td className="td">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      variant={action.color === "accent" ? "accent" : "primary"}
                      icon={<CheckCircle2 size={11} />}
                      onClick={() => handleAction(exp.id)}
                    >
                      {action.label}
                    </Button>
                    <button
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      onClick={() => onView(exp)}
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

export default function ActionCenterPage() {
  const qc             = useQueryClient();
  const { user } = useAuth();
  const { role } = useRole();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", "action-center"],
    queryFn: loadActionCenterExpenses,
  });

  // GA receipt review — reimbursements waiting for GA at step 0
  const queues = getActionCenterQueues(expenses, role, user?.id ?? null);
  const toReceiptReview = queues.receiptReview;
  // CC verify — any submitted expense waiting for COST_CONTROL
  const toVerify = queues.verify;
  const toApprove = queues.approve;
  const toPay = queues.pay;
  const toSubmit = queues.submit;

  const total = queues.total;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Action Center</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isLoading ? "Loading…" : total === 0 ? "All clear — no pending tasks" : `${total} item${total !== 1 ? "s" : ""} need your attention`}
        </p>
      </div>

      {/* Summary pills */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Receipt Review", count: toReceiptReview.length, color: "bg-amber-500"  },
            { label: "To Verify",      count: toVerify.length,        color: "bg-cyan-500"   },
            { label: "To Approve",     count: toApprove.length,       color: "bg-green-600"  },
            { label: "To Pay",         count: toPay.length,           color: "bg-purple-600" },
            { label: "Draft",          count: toSubmit.length,        color: "bg-gray-500"   },
          ].map((p) => p.count > 0 && (
            <div key={p.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${p.color}`} />
              <span className="text-xs font-medium text-gray-700">{p.label}</span>
              <span className="num text-xs font-bold text-gray-900">{p.count}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : total === 0 ? (
        <Card className="py-14 text-center">
          <CheckCircle2 size={36} className="text-green-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">You're all caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No pending approvals or actions</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <ActionGroup
            title="Receipt Review (GA)"
            icon={Receipt}
            color="bg-amber-500"
            expenses={toReceiptReview}
            action={{ label: "Review Receipt", fn: (id) => expensesApi.verify(id) }}
            onDone={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
            onView={(exp) => setSelectedExpense(exp)}
          />
          <ActionGroup
            title="To Verify (Cost Control)"
            icon={ShieldCheck}
            color="bg-cyan-500"
            expenses={toVerify}
            action={{ label: "Verify", fn: (id) => expensesApi.verify(id) }}
            onDone={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
            onView={(exp) => setSelectedExpense(exp)}
          />
          <ActionGroup
            title="To Approve"
            icon={CheckCircle2}
            color="bg-green-600"
            expenses={toApprove}
            action={{ label: "Approve", fn: (id) => expensesApi.approve(id) }}
            onDone={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
            onView={(exp) => setSelectedExpense(exp)}
          />
          <ActionGroup
            title="To Pay (Finance)"
            icon={Banknote}
            color="bg-purple-600"
            expenses={toPay}
            action={{ label: "Mark Paid", fn: (id) => expensesApi.pay(id), color: "accent" }}
            onDone={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
            onView={(exp) => setSelectedExpense(exp)}
          />
          <ActionGroup
            title="Drafts / Rejected (ready to submit)"
            icon={Send}
            color="bg-gray-500"
            expenses={toSubmit}
            action={{ label: "Submit", fn: (id) => expensesApi.submit(id) }}
            onDone={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
            onView={(exp) => setSelectedExpense(exp)}
          />
        </div>
      )}

      {selectedExpense && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-detail-title"
        >
          <div
            className="absolute inset-0 bg-[rgba(15,23,42,0.42)] modal-backdrop animate-fade-in"
            onClick={() => setSelectedExpense(null)}
          />

          <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-modal animate-slide-up">
            <div className="relative border-b border-[#E7E5DF] px-6 py-5">
              <h2 id="expense-detail-title" className="w-full text-center text-lg font-bold text-gray-900">
                Expense #{selectedExpense.id}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                aria-label="Close expense details"
                title="Close"
                className="absolute right-5 top-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5">
              {selectedExpense.expense_type === "reimbursement" && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <Receipt size={13} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-amber-700">Reimbursement Request</span>
                </div>
              )}
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Description</p><p className="text-sm font-medium text-gray-900 mt-1">{selectedExpense.description}</p></div>
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Amount</p><p className="text-xl font-bold text-gray-900 mt-1 num">{formatCurrency(selectedExpense.amount)}</p></div>
              {selectedExpense.project_id != null && (
                <div><p className="text-xs text-gray-400 uppercase tracking-wide">Project ID</p><p className="text-sm text-gray-700 mt-1 num">#{selectedExpense.project_id}</p></div>
              )}
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Cost Code</p><p className="text-sm text-gray-700 mt-1">{selectedExpense.cost_code?.code ?? "—"} · {selectedExpense.cost_code?.name ?? ""}</p></div>
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Status</p><div className="mt-1"><ExpenseStatusBadge status={selectedExpense.status} /></div></div>
              {selectedExpense.vendor_name && <div><p className="text-xs text-gray-400 uppercase tracking-wide">Vendor</p><p className="text-sm text-gray-700 mt-1">{selectedExpense.vendor_name}</p></div>}
              {selectedExpense.receipt_url && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Receipt {selectedExpense.expense_type === "reimbursement" && <span className="text-red-500">*</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuthenticatedFile(selectedExpense.receipt_url!).catch(() => {
                      toastError("Receipt unavailable", "The receipt could not be opened");
                    })}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View Receipt
                  </button>
                </div>
              )}
              {!selectedExpense.receipt_url && selectedExpense.expense_type === "reimbursement" && (
                <div className="text-xs text-red-500 font-medium">⚠ No receipt attached</div>
              )}
              <div><p className="text-xs text-gray-400 uppercase tracking-wide">Submitted</p><p className="text-sm text-gray-500 mt-1 num">{fmtDateTime(selectedExpense.created_at)}</p></div>
            </div>

            <div className="flex items-center justify-center border-t border-[#E7E5DF] bg-[#F8FAF9] px-6 py-4">
              <Button variant="secondary" onClick={() => setSelectedExpense(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
