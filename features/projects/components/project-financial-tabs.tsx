"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { expensesApi, projectsApi, receivablesApi } from "@/lib/api";
import { openAuthenticatedFile } from "@/lib/authenticated-files";
import { toastError } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import {
  cn,
  EXPENSE_STATUS_COLORS,
  EXPENSE_STATUS_LABEL,
  fmtDate,
  formatCurrency,
  getCurrencySymbol,
} from "@/lib/utils";

type ProjectExpenseSortKey = "description" | "cost_code" | "amount" | "status" | "date";
type ProjectRevenueSortKey = "description" | "amount" | "status" | "date";

export function ExpensesTab({ projectId, currency }: { projectId: number; currency: string }) {
  const tableSort = useTableSort<ProjectExpenseSortKey>("date", "desc");
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", { project_id: projectId }],
    queryFn: () => expensesApi.list({ project_id: projectId }).then((r) => r.data.items),
  });
  const sortedExpenses = sortTableRows(expenses, tableSort.sortKey, tableSort.sortDirection, {
    description: (expense) => expense.description,
    cost_code: (expense) => expense.cost_code?.code,
    amount: (expense) => expense.amount,
    status: (expense) => expense.status,
    date: (expense) => expense.created_at,
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""} ·{" "}
          Total {formatCurrency(total, getCurrencySymbol(currency))}
        </p>
        <Link href={`/spending?project=${projectId}`}>
          <Button variant="secondary" size="sm">
            Manage in Spending
          </Button>
        </Link>
      </div>
      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={5} cols={5} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Description" column="description" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Cost Code" column="cost_code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="Amount" column="amount" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden sm:table-cell" />
                <SortableTableHeader label="Date" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td text-center text-gray-400 py-10 text-xs">
                    No expenses recorded for this project
                  </td>
                </tr>
              ) : sortedExpenses.map((exp) => {
                const sc = EXPENSE_STATUS_COLORS[exp.status];
                return (
                  <tr key={exp.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="td">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {exp.description}
                      </p>
                    </td>
                    <td className="td hidden md:table-cell">
                      <span className="text-xs text-gray-500 font-mono">
                        {exp.cost_code?.code ?? "—"}
                      </span>
                    </td>
                    <td className="td text-right">
                      <span className="num font-semibold text-gray-900 text-sm">
                        {formatCurrency(exp.amount, getCurrencySymbol(currency))}
                      </span>
                    </td>
                    <td className="td hidden sm:table-cell">
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        sc.bg, sc.text, sc.border
                      )}>
                        {EXPENSE_STATUS_LABEL[exp.status]}
                      </span>
                    </td>
                    <td className="td hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{fmtDate(exp.created_at)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function RevenueTab({ projectId, currency }: { projectId: number; currency: string }) {
  const tableSort = useTableSort<ProjectRevenueSortKey>("date", "desc");
  const { data: ars = [], isLoading } = useQuery({
    queryKey: ["receivables", { project_id: projectId }],
    queryFn: () => receivablesApi.list({ project_id: projectId }).then((r) => r.data.items),
  });
  const sortedReceivables = sortTableRows(ars, tableSort.sortKey, tableSort.sortDirection, {
    description: (receivable) => receivable.description,
    amount: (receivable) => receivable.amount,
    status: (receivable) => receivable.status,
    date: (receivable) => receivable.created_at,
  });

  const total = ars.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {ars.length} invoice{ars.length !== 1 ? "s" : ""} ·{" "}
          Total {formatCurrency(total, getCurrencySymbol(currency))}
        </p>
        <Link href="/revenue">
          <Button variant="secondary" size="sm">
            Manage in Revenue
          </Button>
        </Link>
      </div>
      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={4} cols={4} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Description" column="description" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Amount" column="amount" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="right" />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden sm:table-cell" />
                <SortableTableHeader label="Date" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ars.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td text-center text-gray-400 py-10 text-xs">
                    No revenue entries for this project
                  </td>
                </tr>
              ) : sortedReceivables.map((ar) => (
                <tr key={ar.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="td">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">
                      {ar.description}
                    </p>
                  </td>
                  <td className="td text-right">
                    <span className="num font-semibold text-green-700 text-sm">
                      {formatCurrency(ar.amount, getCurrencySymbol(currency))}
                    </span>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className={cn(
                      "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      ar.status === "confirmed"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                      {ar.status === "confirmed" ? "Confirmed" : "Draft"}
                    </span>
                  </td>
                  <td className="td hidden lg:table-cell">
                    <span className="text-xs text-gray-400">{fmtDate(ar.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function DocumentsTab({ projectId }: { projectId: number }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: () => projectsApi.documents(projectId).then((r) => r.data),
  });

  async function openDoc(docId: number, title: string) {
    try {
      await openAuthenticatedFile(projectsApi.documentUrl(projectId, docId));
    } catch {
      toastError("Document unavailable", `Could not open ${title}`);
    }
  }

  return (
    <Card padding={false}>
      {isLoading ? <TableSkeleton rows={4} cols={3} /> : (
        <div className="divide-y divide-gray-50">
          {docs.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">No original contracts or POs linked yet</div>
          ) : docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => openDoc(doc.id, doc.title)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <FileText size={15} className="text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                <p className="text-[11px] text-gray-400 uppercase">{doc.doc_type} · {doc.reference_no ?? "No ref"}</p>
              </div>
              <ExternalLink size={13} className="text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
