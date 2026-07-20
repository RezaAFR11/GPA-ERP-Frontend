import type { Expense, RoleName } from "@/lib/types";
import { expensesApi } from "@/lib/api";

export async function loadActionCenterExpenses(): Promise<Expense[]> {
  // The backend applies the same role/status candidate rules so the global
  // badge no longer downloads the complete historical expense ledger.
  return expensesApi.actionQueue().then((response) => response.data);
}

function effectiveRoles(role: RoleName | null): RoleName[] {
  if (!role) return [];
  if (role === "HR") return [role, "GA"];
  if (role === "PROJECT_CONTROL") return [role, "PM"];
  return [role];
}

function canActAs(role: RoleName | null, expectedRole: string | null): boolean {
  if (!role || !expectedRole) return false;
  return role === "SUPER_ADMIN" || effectiveRoles(role).includes(expectedRole as RoleName);
}

export function getExpenseActionPermissions(
  expense: Expense,
  role: RoleName | null,
  userId: number | null,
) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isCostControl = role === "COST_CONTROL";
  const ownsExpense = userId != null && expense.submitted_by === userId;
  const verificationRole = ["GA", "COST_CONTROL"].includes(expense.current_approver_role ?? "");
  const chainRoles = new Set(expense.approval_chain ?? []);
  const isInApprovalChain = effectiveRoles(role).some((effectiveRole) => chainRoles.has(effectiveRole));

  return {
    canSubmit:
      ["draft", "rejected"].includes(expense.status) &&
      (ownsExpense || isSuperAdmin || isCostControl),
    canVerify:
      expense.status === "submitted" &&
      verificationRole &&
      canActAs(role, expense.current_approver_role),
    canApprove:
      ["submitted", "verified"].includes(expense.status) &&
      !verificationRole &&
      canActAs(role, expense.current_approver_role),
    canPay:
      expense.status === "approved" &&
      (role === "FINANCE" || isSuperAdmin),
    canReject:
      !["paid", "hard_locked", "rejected", "draft"].includes(expense.status) &&
      (role === "FINANCE" || isSuperAdmin || isInApprovalChain),
    canDelete:
      ["draft", "rejected"].includes(expense.status) &&
      (ownsExpense || isSuperAdmin || isCostControl),
  };
}

export function getActionCenterQueues(
  expenses: Expense[],
  role: RoleName | null,
  userId: number | null,
) {
  const receiptReview: Expense[] = [];
  const verify: Expense[] = [];
  const approve: Expense[] = [];
  const pay: Expense[] = [];
  const submit: Expense[] = [];

  for (const expense of expenses) {
    const permissions = getExpenseActionPermissions(expense, role, userId);
    if (permissions.canVerify && expense.current_approver_role === "GA") receiptReview.push(expense);
    if (permissions.canVerify && expense.current_approver_role === "COST_CONTROL") verify.push(expense);
    if (permissions.canApprove) approve.push(expense);
    if (permissions.canPay) pay.push(expense);
    if (permissions.canSubmit) submit.push(expense);
  }

  return {
    receiptReview,
    verify,
    approve,
    pay,
    submit,
    total: receiptReview.length + verify.length + approve.length + pay.length + submit.length,
  };
}
