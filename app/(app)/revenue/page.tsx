"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, ReceiptText, WalletCards, AlertCircle, Percent, Pencil, Search, Trash2, X, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { receivablesApi, projectsApi } from "@/lib/api";
import { formatCurrency, fmtDate, getErrorMessage, getCurrencySymbol } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ARStatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import { useRole } from "@/lib/auth-context";
import type { AccountReceivable } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  project_id: z.coerce.number().min(1, "Select a project"),
  amount: z.coerce.number().min(0.01, "Must be > 0"),
  actual_payment: z.coerce.number().min(0).optional(),
  invoice_no: z.string().optional(),
  customer_name: z.string().optional(),
  due_date: z.string().optional(),
  description: z.string().min(3, "At least 3 characters"),
});
type FormData = z.infer<typeof schema>;
type PaymentFilter = "all" | "paid" | "partial" | "open";
const PAGE_SIZE = 20;

function paidAmount(ar: AccountReceivable) {
  if (ar.actual_payment != null) return ar.actual_payment;
  return ar.status === "confirmed" ? ar.amount : 0;
}

function remainingAmount(ar: AccountReceivable) {
  if (ar.remaining_amount != null) return Math.max(ar.remaining_amount, 0);
  return Math.max(ar.amount - paidAmount(ar), 0);
}

function paymentState(ar: AccountReceivable) {
  const paid = paidAmount(ar);
  const remaining = remainingAmount(ar);
  if (paid > 0 && remaining <= 1) return "paid";
  if (paid > 0) return "partial";
  return "open";
}

function invoiceLabel(ar: AccountReceivable) {
  if (ar.invoice_no) return ar.invoice_no;
  const match = ar.description.match(/Invoice:\s*([^\n]+)/i);
  return match?.[1]?.trim() || `AR-${ar.id}`;
}

function descriptionSummary(ar: AccountReceivable) {
  const match = ar.description.match(/Description:\s*([^\n]+)/i);
  return (match?.[1] || ar.description).replace(/\n/g, " ").trim();
}

function RevenueActionMenu({
  ar,
  canConfirm,
  isConfirming,
  isDeleting,
  onEdit,
  onConfirm,
  onDelete,
}: {
  ar: AccountReceivable;
  canConfirm: boolean;
  isConfirming: boolean;
  isDeleting: boolean;
  onEdit: (ar: AccountReceivable) => void;
  onConfirm: (ar: AccountReceivable) => void;
  onDelete: (ar: AccountReceivable) => void;
}) {
  const [open, setOpen] = useState(false);
  const isConfirmed = ar.status === "confirmed";
  const confirmDisabled = isConfirmed || !canConfirm || isConfirming;
  const deleteDisabled = isConfirmed || isDeleting;

  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Invoice actions"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 rounded-xl shadow-modal w-44 py-1 overflow-hidden text-left">
            <button
              type="button"
              onClick={() => { onEdit(ar); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={12} className="text-primary" /> Edit
            </button>
            {!isConfirmed && (
              <button
                type="button"
                disabled={confirmDisabled}
                title={!canConfirm ? "Only MD or Super Admin can confirm revenue" : undefined}
                onClick={() => {
                  if (confirmDisabled) return;
                  onConfirm(ar);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={12} className="text-green-600" /> Confirm
              </button>
            )}
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              disabled={deleteDisabled}
              onClick={() => {
                if (deleteDisabled) return;
                onDelete(ar);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} className="text-red-500" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function RevenuePage() {
  const qc = useQueryClient();
  const { isMD } = useRole();
  const [newOpen, setNew] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AccountReceivable | null>(null);
  const [deleting, setDeleting] = useState<AccountReceivable | null>(null);
  const [amtDisp, setAmtD] = useState("");
  const [paidDisp, setPaidD] = useState("");
  const [editAmounts, setEditAmounts] = useState({ amount: "", paid: "", remaining: "" });

  const receivableFilters = useMemo(() => ({
    ...(paymentFilter !== "all" ? { payment_state: paymentFilter } : {}),
    ...(search ? { search } : {}),
  }), [paymentFilter, search]);

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["receivables", "cash-collection", paymentFilter, search, page],
    queryFn: () => receivablesApi.list({
      ...receivableFilters,
      skip:  (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    }).then((r) => r.data),
  });
  const ars = revenueData?.items ?? [];
  const totalPages = Math.ceil((revenueData?.total ?? 0) / PAGE_SIZE);
  const rows = ars;

  const { data: summary } = useQuery({
    queryKey: ["receivables", "summary", paymentFilter, search],
    queryFn: () => receivablesApi.summary(receivableFilters).then((r) => r.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "active-for-revenue"],
    queryFn: () => projectsApi.list({ limit: 200 }).then((r) => r.data.items),
  });

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const totalInvoiced = Number(summary?.total_invoiced ?? 0);
  const totalPaid = Number(summary?.total_paid ?? 0);
  const totalOutstanding = Number(summary?.total_outstanding ?? 0);
  const collectionRate = Number(summary?.collection_rate ?? 0);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { actual_payment: 0 },
    });

  const createMut = useMutation({
    mutationFn: (d: FormData) => receivablesApi.create({
      ...d,
      actual_payment: d.actual_payment || undefined,
      remaining_amount: Math.max(d.amount - (d.actual_payment || 0), 0),
      due_date: d.due_date ? new Date(d.due_date).toISOString() : undefined,
    }),
    onSuccess: (r) => {
      toastSuccess("Invoice created", `${invoiceLabel(r.data)} - ${formatCurrency(r.data.amount)}`);
      qc.invalidateQueries({ queryKey: ["receivables"] });
      reset(); setAmtD(""); setPaidD(""); setNew(false);
    },
    onError: (e) => toastError("Failed", getErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData & { remaining_amount?: number }) => {
      if (!editing) throw new Error("No invoice selected");
      return receivablesApi.update(editing.id, {
        invoice_no: d.invoice_no || null,
        customer_name: d.customer_name || null,
        description: d.description,
        amount: d.amount,
        actual_payment: d.actual_payment || null,
        remaining_amount: d.remaining_amount ?? Math.max(d.amount - (d.actual_payment || 0), 0),
        due_date: d.due_date ? new Date(d.due_date).toISOString() : null,
      });
    },
    onSuccess: () => {
      toastSuccess("Invoice updated", "Payment values refreshed");
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditing(null);
      reset();
    },
    onError: (e) => toastError("Update failed", getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => receivablesApi.delete(id),
    onSuccess: () => {
      toastSuccess("Invoice deleted", "The invoice has been removed");
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDeleting(null);
    },
    onError: (e) => toastError("Delete failed", getErrorMessage(e)),
  });

  const confirmMut = useMutation({
    mutationFn: (id: number) => receivablesApi.confirm(id),
    onSuccess: () => {
      toastSuccess("Payment confirmed", "Client payment is now reflected in revenue");
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => toastError("Confirmation failed", getErrorMessage(e)),
  });

  function moneyInput(
    setter: (value: string) => void,
    field: "amount" | "actual_payment",
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      setter(raw.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      setValue(field, parseFloat(raw) || 0, { shouldValidate: true });
    };
  }

  function cleanDate(value: string | null | undefined) {
    if (!value) return "-";
    const year = new Date(value).getFullYear();
    return year <= 1901 ? "-" : fmtDate(value);
  }

  function compactMoney(value: number) {
    return formatCurrency(value, undefined, 0);
  }

  function openEdit(ar: AccountReceivable) {
    setEditing(ar);
    const due = ar.due_date && new Date(ar.due_date).getFullYear() > 1901
      ? new Date(ar.due_date).toISOString().slice(0, 10)
      : "";
    reset({
      project_id: ar.project_id,
      amount: ar.amount,
      actual_payment: paidAmount(ar),
      invoice_no: invoiceLabel(ar),
      customer_name: ar.customer_name || "",
      due_date: due,
      description: descriptionSummary(ar),
    });
    setEditAmounts({
      amount: ar.amount.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      paid: paidAmount(ar).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      remaining: remainingAmount(ar).toLocaleString("en-US", { maximumFractionDigits: 0 }),
    });
  }

  function deleteInvoice(ar: AccountReceivable) {
    if (ar.status === "confirmed") {
      toastError("Cannot delete", "Confirmed invoices cannot be deleted");
      return;
    }

    setDeleting(ar);
  }

  function editMoneyInput(field: "amount" | "actual_payment" | "remaining") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setEditAmounts((current) => ({ ...current, [field === "actual_payment" ? "paid" : field]: formatted }));
      if (field !== "remaining") {
        setValue(field, parseFloat(raw) || 0, { shouldValidate: true });
      }
    };
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-400 mt-0.5">Client payments, invoices, and outstanding AR</p>
        </div>
        <Button variant="primary" icon={<Plus size={13} />} onClick={() => setNew(true)}>
          New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: ReceiptText, color: "text-primary", bg: "bg-primary-50" },
          { label: "Payments Received", value: formatCurrency(totalPaid), icon: WalletCards, color: "text-green-600", bg: "bg-green-50" },
          { label: "Outstanding AR", value: formatCurrency(totalOutstanding), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%`, icon: Percent, color: "text-gray-900", bg: "bg-gray-50" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`num text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          ["all", "All"],
          ["paid", "Paid"],
          ["partial", "Partial"],
          ["open", "Open"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => { setPaymentFilter(value as PaymentFilter); setPage(1); }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              paymentFilter === value
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            )}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search invoice, client, project…"
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 w-64"
          />
        </div>
      </div>

      <Card padding={false} className="overflow-hidden">
        {isLoading ? <TableSkeleton rows={7} cols={9} /> : (
          <div className="w-full overflow-x-auto">

            <table className="w-full min-w-[1040px] table-fixed">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="th w-[170px]">Invoice</th>
                  <th className="th w-[130px]">Project</th>
                  <th className="th w-[170px]">Client</th>
                  <th className="th w-[250px]">Description</th>
                  <th className="th w-[125px] text-right border-l border-gray-100">Invoiced</th>
                  <th className="th w-[125px] text-right border-l border-gray-100">Paid</th>
                  <th className="th w-[135px] text-right border-l border-gray-100">Outstanding</th>
                  <th className="th w-[95px]">Due</th>
                  <th className="th w-[110px]">State</th>
                  <th className="th w-[90px] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr><td colSpan={10} className="td text-center text-gray-400 py-12">No invoices found</td></tr>
                ) : rows.map((ar) => {
                  const project = projectById.get(ar.project_id);
                  const state = paymentState(ar);
                  return (
                    <tr key={ar.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="td num text-xs font-semibold text-gray-600 truncate" title={invoiceLabel(ar)}>{invoiceLabel(ar)}</td>
                      <td className="td num text-xs font-semibold text-gray-500 truncate">{project?.code ?? "-"}</td>
                      <td className="td text-xs text-gray-500 truncate" title={ar.customer_name || ""}>{ar.customer_name || "-"}</td>
                      <td className="td">
                        <p className="text-sm text-gray-900 truncate" title={descriptionSummary(ar)}>{descriptionSummary(ar)}</p>
                      </td>
                      <td className="td text-right num text-xs font-bold text-gray-900 whitespace-nowrap border-l border-gray-100">{compactMoney(ar.amount)}</td>
                      <td className="td text-right num text-xs font-bold text-green-700 whitespace-nowrap border-l border-gray-100">{compactMoney(paidAmount(ar))}</td>
                      <td className="td text-right num text-xs font-semibold text-amber-700 whitespace-nowrap border-l border-gray-100">{compactMoney(remainingAmount(ar))}</td>
                      <td className="td text-xs text-gray-400 num whitespace-nowrap">{cleanDate(ar.due_date || ar.invoice_date || ar.created_at)}</td>
                      <td className="td">
                        {state === "paid" ? <ARStatusBadge status="confirmed" /> : (
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            state === "partial" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {state}
                          </span>
                        )}
                      </td>
                      <td className="td text-center">
                        <RevenueActionMenu
                          ar={ar}
                          canConfirm={isMD}
                          isConfirming={confirmMut.isPending}
                          isDeleting={deleteMut.isPending}
                          onEdit={openEdit}
                          onConfirm={(invoice) => confirmMut.mutate(invoice.id)}
                          onDelete={deleteInvoice}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && totalPages > 1 && (
          <div className="px-4 pb-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={revenueData?.total}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </Card>

      <Modal
        open={newOpen}
        onClose={() => { reset(); setAmtD(""); setPaidD(""); setNew(false); }}
        title="New Invoice"
        subtitle="Track what was billed and how much the client has paid"
        footer={
          <>
            <Button variant="ghost" onClick={() => { reset(); setAmtD(""); setPaidD(""); setNew(false); }}>Cancel</Button>
            <Button variant="primary" loading={isSubmitting || createMut.isPending}
              onClick={handleSubmit((d) => createMut.mutate(d))}>
              Create Invoice
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Select label="Project" placeholder="Select project..." error={errors.project_id?.message} {...register("project_id")}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Invoice No" placeholder="INV.GPA..." {...register("invoice_no")} />
            <Input label="Client" placeholder="Client name" {...register("customer_name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Invoice Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{getCurrencySymbol()}</span>
                <input type="text" inputMode="decimal" value={amtDisp} onChange={moneyInput(setAmtD, "amount")}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50" />
              </div>
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Payment Received</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{getCurrencySymbol()}</span>
                <input type="text" inputMode="decimal" value={paidDisp} onChange={moneyInput(setPaidD, "actual_payment")}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50" />
              </div>
            </div>
          </div>
          <Input type="date" label="Due Date" {...register("due_date")} />
          <Textarea label="Description" placeholder="Work package, milestone, or invoice notes" error={errors.description?.message} {...register("description")} />
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => { setEditing(null); reset(); }}
        title="Update Invoice"
        subtitle="Edit invoice amount, client payment, and outstanding AR"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setEditing(null); reset(); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={isSubmitting || updateMut.isPending}
              onClick={handleSubmit((d) => updateMut.mutate({
                ...d,
                remaining_amount: parseFloat(editAmounts.remaining.replace(/,/g, "")) || 0,
              }))}
            >
              Save Updates
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Select label="Project" placeholder="Select project..." error={errors.project_id?.message} {...register("project_id")}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Invoice No" placeholder="INV.GPA..." {...register("invoice_no")} />
            <Input label="Client" placeholder="Client name" {...register("customer_name")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Invoiced</label>
              <input
                type="text"
                inputMode="decimal"
                value={editAmounts.amount}
                onChange={editMoneyInput("amount")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Paid</label>
              <input
                type="text"
                inputMode="decimal"
                value={editAmounts.paid}
                onChange={editMoneyInput("actual_payment")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Outstanding</label>
              <input
                type="text"
                inputMode="decimal"
                value={editAmounts.remaining}
                onChange={editMoneyInput("remaining")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
          </div>
          <Input type="date" label="Due Date" {...register("due_date")} />
          <Textarea label="Description" placeholder="Work package, milestone, or invoice notes" error={errors.description?.message} {...register("description")} />
        </form>
      </Modal>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[rgba(15,23,42,0.42)] modal-backdrop animate-fade-in"
            onClick={() => {
              if (!deleteMut.isPending) setDeleting(null);
            }}
          />

          <div className="relative w-full max-w-[300px] bg-white rounded-xl shadow-modal animate-slide-up overflow-hidden">
            <div className="relative px-[22px] pt-5 pb-4 border-b border-[#E7E5DF]">
              <div className="w-full text-center">
                <h2 className="text-[16px] font-bold text-[#0C2138]">
                  Delete Invoice
                </h2>
              </div>

              <button
                onClick={() => {
                  if (!deleteMut.isPending) setDeleting(null);
                }}
                className="absolute right-[22px] top-5 p-1.5 rounded-lg hover:bg-[#F8FAF9] text-[#94A3B8] hover:text-[#0C2138] transition-colors"
                disabled={deleteMut.isPending}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-[22px] py-7 text-center">
              <p className="text-[13px] text-[#33445A]">
                Delete invoice {invoiceLabel(deleting)}?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 px-[22px] py-5 border-t border-[#E7E5DF] bg-[#F8FAF9]">
              <Button
                variant="secondary"
                onClick={() => setDeleting(null)}
                disabled={deleteMut.isPending}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                loading={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleting.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
