"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  descriptionSummary,
  invoiceLabel,
  paidAmount,
  remainingAmount,
} from "../lib/revenue-calculations";
import { getCurrencySymbol } from "@/lib/utils";
import type { AccountReceivable, ProjectLookup } from "@/lib/types";

const invoiceSchema = z.object({
  project_id: z.coerce.number().min(1, "Select a project"),
  amount: z.coerce.number().min(0.01, "Must be > 0"),
  actual_payment: z.coerce.number().min(0).optional(),
  invoice_no: z.string().optional(),
  customer_name: z.string().optional(),
  due_date: z.string().optional(),
  description: z.string().min(3, "At least 3 characters"),
}).refine((data) => (data.actual_payment ?? 0) <= data.amount, {
  path: ["actual_payment"],
  message: "Payment cannot exceed invoice amount",
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormModalProps {
  mode: "create" | "edit";
  invoice?: AccountReceivable;
  projects: ProjectLookup[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
}

function formattedAmount(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function editableDueDate(invoice?: AccountReceivable): string {
  if (!invoice?.due_date || new Date(invoice.due_date).getFullYear() <= 1901) return "";
  return new Date(invoice.due_date).toISOString().slice(0, 10);
}

/** Shared create/edit form. The two layouts remain intentionally identical to the original dialogs. */
export default function InvoiceFormModal({
  mode,
  invoice,
  projects,
  pending,
  onClose,
  onSubmit,
}: InvoiceFormModalProps) {
  const isEdit = mode === "edit";
  const [amountDisplay, setAmountDisplay] = useState(
    invoice ? formattedAmount(invoice.amount) : "",
  );
  const [paidDisplay, setPaidDisplay] = useState(
    invoice ? formattedAmount(paidAmount(invoice)) : "",
  );
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          project_id: invoice.project_id,
          amount: invoice.amount,
          actual_payment: paidAmount(invoice),
          invoice_no: invoiceLabel(invoice),
          customer_name: invoice.customer_name || "",
          due_date: editableDueDate(invoice),
          description: descriptionSummary(invoice),
        }
      : { actual_payment: 0 },
  });

  function updateMoney(
    field: "amount" | "actual_payment",
    setter: (value: string) => void,
  ) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.replace(/[^0-9.]/g, "");
      setter(raw.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      setValue(field, parseFloat(raw) || 0, { shouldValidate: true });
    };
  }

  const numericAmount = parseFloat(amountDisplay.replace(/,/g, "")) || 0;
  const numericPaid = parseFloat(paidDisplay.replace(/,/g, "")) || 0;
  const outstandingDisplay = formattedAmount(Math.max(numericAmount - numericPaid, 0));

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Update Invoice" : "New Invoice"}
      subtitle={isEdit
        ? "Edit invoice amount, client payment, and outstanding AR"
        : "Track what was billed and how much the client has paid"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={isSubmitting || pending}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? "Save Updates" : "Create Invoice"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Select
          label="Project"
          placeholder="Select project..."
          error={errors.project_id?.message}
          {...register("project_id")}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice No" placeholder="INV.GPA..." {...register("invoice_no")} />
          <Input label="Client" placeholder="Client name" {...register("customer_name")} />
        </div>

        {isEdit ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Invoiced</label>
              <input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={updateMoney("amount", setAmountDisplay)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Paid</label>
              <input
                type="text"
                inputMode="decimal"
                value={paidDisplay}
                onChange={updateMoney("actual_payment", setPaidDisplay)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Outstanding</label>
              <input
                type="text"
                inputMode="decimal"
                value={outstandingDisplay}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Invoice Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {getCurrencySymbol()}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountDisplay}
                  onChange={updateMoney("amount", setAmountDisplay)}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Payment Received</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {getCurrencySymbol()}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidDisplay}
                  onChange={updateMoney("actual_payment", setPaidDisplay)}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
              </div>
            </div>
          </div>
        )}

        <Input type="date" label="Due Date" {...register("due_date")} />
        <Textarea
          label="Description"
          placeholder="Work package, milestone, or invoice notes"
          error={errors.description?.message}
          {...register("description")}
        />
      </form>
    </Modal>
  );
}
