"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Plus, Search,
  ChevronLeft, ChevronRight, ClipboardList, FileSpreadsheet, Receipt,
} from "lucide-react";
import { expensesApi, pettyCashReportsApi, projectsApi } from "@/lib/api";
import {
  formatCurrency, fmtDateTime, EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_COLORS, getErrorMessage,
} from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ExpenseStatusBadge, ApproverPill } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { ActionMenu } from "./components/expense-action-menu";
import { ExpenseTypeBadge } from "./components/expense-type-badge";
import ExpenseVoucherModal from "./components/expense-voucher-modal";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth, useRole } from "@/lib/auth-context";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { Expense, ExpenseStatus } from "@/lib/types";

// Form-heavy dialogs are split from the spending table and loaded on demand.
const NewExpenseModal = dynamic(() => import("@/components/spending/new-expense-modal"), {
  ssr: false,
});
const PettyCashReportModal = dynamic(() => import("./components/petty-cash-report-modal"), {
  ssr: false,
});

type SortKey = "id" | "expense_type" | "project" | "description" | "cost_code" | "amount" | "status" | "created_at" | "approver";
const PAGE_SIZE = 10;

const STATUS_OPTIONS: { label: string; value: ExpenseStatus | "" }[] = [
  { label: "All Statuses",  value: "" },
  { label: "Draft",         value: "draft" },
  { label: "Submitted",     value: "submitted" },
  { label: "Verified",      value: "verified" },
  { label: "Approved",      value: "approved" },
  { label: "Paid",          value: "paid" },
  { label: "Rejected",      value: "rejected" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SpendingPage() {
  const qc           = useQueryClient();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, canAccessMenu } = useAuth();
  const { isSelfService, role } = useRole();
  const canPettyCash = canAccessMenu("petty_cash");
  const [newOpen,       setNewOpen]      = useState(false);
  const [pettyOpen,     setPettyOpen]    = useState(false);
  const [voucherExpense,setVoucherExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [search,        setSearch]       = useState("");
  const [statusFilter,  setStatus]       = useState<ExpenseStatus | "">("");
  const [projectFilter, setProject]      = useState<number | "">("");
  const [page,          setPage]         = useState(1);
  const { sortKey, sortDirection, toggleSort: toggleTableSort } = useTableSort<SortKey>("id", "desc");

  // Auto-open new expense modal when navigated via FAB (?new=1)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewOpen(true);
      router.replace("/spending");
    }
  }, [searchParams, router]);

  const duplicateMutation = useMutation({
    mutationFn: (expense: Expense) =>
      expensesApi.create({
        expense_type:   expense.expense_type ?? "regular",
        project_id:     expense.project_id ?? undefined,
        cost_code_id:   expense.cost_code_id,
        cost_centre_id: expense.cost_centre_id ?? undefined,
        amount:         expense.amount,
        description:    expense.description,
        vendor_name:    expense.vendor_name ?? undefined,
        reference_no:   expense.reference_no ?? undefined,
        receipt_url:    expense.receipt_url ?? undefined,
      }),
    onSuccess: () => {
      toastSuccess("Duplicated successfully");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e) => toastError("Duplicate failed", getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (expense: Expense) => expensesApi.delete(expense.id),
    onSuccess: (_, expense) => {
      toastSuccess("Expense deleted", `#${expense.id}`);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-stats"] });
      setDeletingExpense(null);
    },
    onError: (e) => toastError("Delete failed", getErrorMessage(e)),
  });

  const { data: allExpenses = [], isLoading, refetch } = useQuery({
    queryKey: ["expenses", statusFilter, projectFilter],
    queryFn: () =>
      expensesApi.list({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(projectFilter ? { project_id: Number(projectFilter) } : {}),
        limit: 200,
      }).then((r) => r.data.items),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn:  () => projectsApi.list({ limit: 500 }).then((r) => r.data.items),
    enabled:  !isSelfService,   // STAFF/WORKER have no project_command access
  });
  const projectCodeById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.code])),
    [projects],
  );

  const { data: pettyReports = [] } = useQuery({
    queryKey: ["petty-cash-reports", projectFilter],
    queryFn: () =>
      pettyCashReportsApi.list({
        ...(projectFilter ? { project_id: Number(projectFilter) } : {}),
        limit: 20,
      }).then((r) => r.data),
    enabled: !isSelfService && canPettyCash,
  });

  const { data: stats } = useQuery({
    queryKey: ["expenses-stats", projectFilter],
    queryFn: () =>
      expensesApi.stats(projectFilter ? { project_id: Number(projectFilter) } : undefined)
        .then((r) => r.data),
    enabled: !isSelfService,
  });

  // Client-side sort + search
  const filtered = useMemo(() => {
    let rows = allExpenses.filter((e) =>
      !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      String(e.id).includes(search) ||
      (e.cost_code?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    return sortTableRows(rows, sortKey, sortDirection, {
      id: (expense) => expense.id,
      expense_type: (expense) => expense.expense_type,
      project: (expense) => expense.project_id ? projectCodeById.get(expense.project_id) : null,
      description: (expense) => expense.description,
      cost_code: (expense) => expense.cost_code?.code,
      amount: (expense) => expense.amount,
      status: (expense) => expense.status,
      created_at: (expense) => expense.created_at,
      approver: (expense) => expense.current_approver_role,
    });
  }, [allExpenses, projectCodeById, search, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    toggleTableSort(key);
    setPage(1);
  }

  // Summary stats — sourced from server aggregation (no pagination limit)
  const pendingCount  = allExpenses.filter((e) =>
    ["submitted","verified"].includes(e.status)
  ).length;
  const pettyTotal = pettyReports.reduce((s, report) => s + Number(report.total_amount), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isSelfService ? "Reimbursement Saya" : "Spending"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isSelfService
              ? `${allExpenses.length} pengajuan reimbursement`
              : `Expenses & Petty Cash · ${allExpenses.length} records`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isSelfService && canPettyCash && (
            <Button
              variant="secondary"
              icon={<ClipboardList size={13} />}
              onClick={() => setPettyOpen(true)}
            >
              Petty Cash Report
            </Button>
          )}
          <Button
            variant="primary"
            icon={isSelfService ? <Receipt size={13} /> : <Plus size={13} />}
            onClick={() => setNewOpen(true)}
          >
            {isSelfService ? "Ajukan Reimbursement" : "New Expense"}
          </Button>
        </div>
      </div>

      {/* ── Self-service info banner ───────────────────────────────────────── */}
      {isSelfService && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
          <Receipt size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-semibold mb-0.5">Hanya pengajuan kamu yang ditampilkan</p>
            <p className="text-amber-700">
              Alur persetujuan: Kamu submit → GA verifikasi bukti → Cost Control → Finance setujui &amp; bayar
            </p>
          </div>
        </div>
      )}

      {/* ── Summary strip (not shown for self-service) ────────────────────── */}
      {!isSelfService && (
        <div className={cn("grid gap-3", canPettyCash ? "grid-cols-3" : "grid-cols-2")}>
          {[
            { label: "Total Logged",       value: formatCurrency(stats?.total_logged ?? 0),   color: "text-gray-900" },
            { label: "Approved / Paid",     value: formatCurrency(stats?.total_approved ?? 0), color: "text-green-600" },
            ...(canPettyCash ? [
              { label: "Petty Cash Batches", value: `${pettyReports.length} · ${formatCurrency(pettyTotal)}`, color: "text-blue-600" },
            ] : []),
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-card">
              <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{s.label}</p>
              <p className={`num text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {!isSelfService && canPettyCash && pettyReports.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900">Petty Cash Reports</h2>
            </div>
            <span className="text-xs text-gray-400">{pendingCount} expense{pendingCount !== 1 ? "s" : ""} awaiting approval</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {pettyReports.slice(0, 6).map((report) => (
              <div key={report.id} className="rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{report.report_no}</p>
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">{report.status}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>{report.month} · {report.lines.length} lines</span>
                  <span className="num font-semibold text-gray-700">{formatCurrency(Number(report.total_amount))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search description, ID…"
            className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white w-56 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value as ExpenseStatus | ""); setPage(1); }}
          className="text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-gray-600"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Project filter — hidden for self-service (they have no projects) */}
        {!isSelfService && (
          <select
            value={projectFilter}
            onChange={(e) => { setProject(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
            className="text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-gray-600 max-w-[180px]"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
        )}

        <div className="ml-auto text-xs text-gray-400 num">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Card padding={false}>
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableTableHeader label="#" column="id" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                  {!isSelfService && <SortableTableHeader label="Type" column="expense_type" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />}
                  {!isSelfService && <SortableTableHeader label="Project" column="project" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />}
                  <SortableTableHeader label="Description" column="description" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                  <SortableTableHeader label="Cost Code" column="cost_code" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
                  <SortableTableHeader label="Amount" column="amount" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
                  <SortableTableHeader label="Status" column="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                  <SortableTableHeader label="Date" column="created_at" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                  {!isSelfService && <SortableTableHeader label="Approver" column="approver" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />}
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={isSelfService ? 7 : 9} className="td text-center text-gray-400 py-14">
                      {isSelfService
                        ? "Belum ada pengajuan reimbursement"
                        : "No expenses match your filters"
                      }
                    </td>
                  </tr>
                ) : (
                  pageRows.map((exp) => (
                    <tr
                      key={exp.id}
                      className={cn(
                        "hover:bg-gray-50/60 transition-colors",
                        exp.status === "rejected" && "bg-red-50/30"
                      )}
                    >
                      <td className="td num text-gray-400 text-xs">#{exp.id}</td>
                      {!isSelfService && (
                        <td className="td">
                          <ExpenseTypeBadge type={exp.expense_type} />
                        </td>
                      )}
                      {!isSelfService && (
                        <td className="td">
                          <span className="num text-xs font-semibold text-gray-500">
                            {projects.find((p) => p.id === exp.project_id)?.code ?? "—"}
                          </span>
                        </td>
                      )}
                      <td className="td max-w-[180px]">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {exp.description}
                        </p>
                      </td>
                      <td className="td hidden md:table-cell">
                        <span className="text-xs text-gray-400 num">
                          {exp.cost_code?.code ?? "—"}
                        </span>
                      </td>
                      <td className="td text-right">
                        <span className="num font-semibold text-gray-900 text-sm">
                          {formatCurrency(exp.amount)}
                        </span>
                      </td>
                      <td className="td">
                        <ExpenseStatusBadge status={exp.status} />
                      </td>
                      <td className="td text-xs text-gray-400 hidden md:table-cell num whitespace-nowrap">
                        {fmtDateTime(exp.created_at)}
                      </td>
                      {!isSelfService && (
                        <td className="td hidden lg:table-cell">
                          {exp.current_approver_role ? (
                            <ApproverPill role={exp.current_approver_role} />
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="td">
                        <ActionMenu
                          expense={exp}
                          isSelfService={isSelfService}
                          role={role}
                          userId={user?.id ?? null}
                          canDuplicate={
                            exp.project_id == null ||
                            projects.some((project) =>
                              project.id === exp.project_id && project.status === "active" && !project.is_archived
                            )
                          }
                          onRefresh={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
                          onDuplicate={(e) => duplicateMutation.mutate(e)}
                          onPrintVoucher={(e) => setVoucherExpense(e)}
                          onDelete={(e) => setDeletingExpense(e)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 num">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const n = i + 1;
                    return (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={cn(
                          "w-7 h-7 text-xs rounded-md transition-all",
                          page === n
                            ? "bg-gray-900 text-white font-semibold"
                            : "text-gray-500 hover:bg-gray-50 border border-gray-200"
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* FAB (mobile) */}
      <button
        onClick={() => setNewOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 sm:hidden z-30"
      >
        {isSelfService ? <Receipt size={18} /> : <Plus size={20} />}
      </button>

      {newOpen && <NewExpenseModal open onClose={() => setNewOpen(false)} />}
      {!isSelfService && canPettyCash && pettyOpen && (
        <PettyCashReportModal open onClose={() => setPettyOpen(false)} />
      )}
      <ExpenseVoucherModal
        open={!!voucherExpense}
        onClose={() => setVoucherExpense(null)}
        expense={voucherExpense}
      />
      <Modal
        open={!!deletingExpense}
        onClose={() => {
          if (!deleteMutation.isPending) setDeletingExpense(null);
        }}
        title="Delete Expense"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={deleteMutation.isPending}
              onClick={() => setDeletingExpense(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deletingExpense) deleteMutation.mutate(deletingExpense);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete expense #{deletingExpense?.id}?
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Only draft or rejected expenses can be deleted.
        </p>
      </Modal>
    </div>
  );
}
