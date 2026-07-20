import type { Expense, Project } from "@/lib/types";
import { pct } from "@/lib/utils";

const COMMITTED_EXPENSE_STATUSES = new Set([
  "verified",
  "approved",
  "paid",
  "hard_locked",
]);

export function projectMarginPercent(project: Project): number {
  return project.total_revenue > 0
    ? pct(project.total_revenue - project.total_committed, project.total_revenue)
    : 0;
}

/** Build the immutable view model shared by all finance report tabs. */
export function buildFinanceReport(
  allProjects: Project[],
  allExpenses: Expense[],
  reportingCurrency: string,
) {
  const projects = allProjects.filter(
    (project) => (project.currency || "IDR") === reportingCurrency,
  );
  const projectIds = new Set(projects.map((project) => project.id));
  const expenses = allExpenses.filter(
    (expense) => expense.project_id != null && projectIds.has(expense.project_id),
  );

  const spendingByCategory = new Map<string, number>();
  for (const expense of expenses) {
    if (!COMMITTED_EXPENSE_STATUSES.has(expense.status)) continue;
    const category = expense.cost_code?.category ?? "Other";
    spendingByCategory.set(category, (spendingByCategory.get(category) ?? 0) + expense.amount);
  }

  const categoryData = [...spendingByCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const projectData = projects.map((project) => ({
    name: project.code,
    committed: project.total_committed,
    revenue: project.total_revenue,
    remaining: Math.max(0, project.contract_value - project.total_committed),
  }));
  const totalRevenue = projects.reduce((sum, project) => sum + project.total_revenue, 0);
  const totalCommitted = projects.reduce((sum, project) => sum + project.total_committed, 0);
  const totalContract = projects.reduce((sum, project) => sum + project.contract_value, 0);

  return {
    projects,
    expenses,
    categoryData,
    projectData,
    totalRevenue,
    totalCommitted,
    totalContract,
    margin: totalRevenue > 0 ? pct(totalRevenue - totalCommitted, totalRevenue) : 0,
  };
}

/** Serialize the currently filtered spending rows without changing CSV columns. */
export function buildExpenseCsv(expenses: Expense[]): string {
  const headers = ["ID", "Project", "Cost Code", "Category", "Amount", "Status", "Date"];
  const rows = expenses.map((expense) => [
    expense.id,
    expense.project_id,
    expense.cost_code?.code ?? "",
    expense.cost_code?.category ?? "",
    expense.amount,
    expense.status,
    expense.created_at,
  ]);
  const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
