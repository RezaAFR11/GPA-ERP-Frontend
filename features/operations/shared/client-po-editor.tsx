"use client";

import { ExternalLink, FileText, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type {
  ClientPODataInput,
  ClientPODetail,
  OperationalAttachment,
} from "@/lib/types";

import { DetailValue } from "./operational-workspace-parts";


export const CLIENT_PO_TYPE = "client_purchase_order";

export interface ClientPOLineEditor {
  sequence: number;
  item_no: string;
  description: string;
  manufacturer: string;
  model: string;
  quantity: string;
  uom: string;
  unit_price: string;
  technical_specs: string;
}

export interface ClientPOPaymentEditor {
  sequence: number;
  percentage: string;
  trigger: string;
  calculation_basis: "dpp" | "grand_total";
  due_date: string;
  status: "planned" | "invoiced" | "paid" | "cancelled";
  invoice_no: string;
}

export interface ClientPOEditorState {
  lineItems: ClientPOLineEditor[];
  paymentTerms: ClientPOPaymentEditor[];
}

export function emptyClientPOEditor(): ClientPOEditorState {
  return { lineItems: [], paymentTerms: [] };
}

export function clientPOEditorFromDetail(detail: ClientPODetail): ClientPOEditorState {
  return {
    lineItems: detail.line_items.map(item => ({
      sequence: item.sequence,
      item_no: item.item_no,
      description: item.description,
      manufacturer: item.manufacturer ?? "",
      model: item.model ?? "",
      quantity: String(item.quantity),
      uom: item.uom,
      unit_price: String(item.unit_price),
      technical_specs: String(item.technical_specs?.notes ?? ""),
    })),
    paymentTerms: detail.payment_terms.map(term => ({
      sequence: term.sequence,
      percentage: String(term.percentage),
      trigger: term.trigger,
      calculation_basis: term.calculation_basis,
      due_date: term.due_date ?? "",
      status: term.status,
      invoice_no: term.invoice_no ?? "",
    })),
  };
}

function roundedShare(total: number, percentage: number): number {
  return Math.round(total * percentage / 100 * 100) / 100;
}

export function clientPOToInput(
  editor: ClientPOEditorState,
  dppAmount: number,
  taxAmount: number,
): ClientPODataInput {
  const lineItems = editor.lineItems.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    return {
      sequence: index + 1,
      item_no: item.item_no.trim(),
      description: item.description.trim(),
      manufacturer: item.manufacturer.trim() || undefined,
      model: item.model.trim() || undefined,
      quantity,
      uom: item.uom.trim(),
      unit_price: unitPrice,
      line_total: Math.round(quantity * unitPrice * 100) / 100,
      technical_specs: item.technical_specs.trim() ? { notes: item.technical_specs.trim() } : {},
    };
  });

  let allocatedDpp = 0;
  let allocatedTax = 0;
  const paymentTerms = editor.paymentTerms.map((term, index) => {
    const percentage = Number(term.percentage || 0);
    const isLast = index === editor.paymentTerms.length - 1;
    const dpp = isLast ? dppAmount - allocatedDpp : roundedShare(dppAmount, percentage);
    const tax = isLast ? taxAmount - allocatedTax : roundedShare(taxAmount, percentage);
    allocatedDpp += dpp;
    allocatedTax += tax;
    return {
      sequence: index + 1,
      percentage,
      trigger: term.trigger.trim(),
      calculation_basis: term.calculation_basis,
      dpp_amount: Math.round(dpp * 100) / 100,
      tax_amount: Math.round(tax * 100) / 100,
      gross_amount: Math.round((dpp + tax) * 100) / 100,
      due_date: term.due_date || null,
      status: term.status,
      invoice_no: term.invoice_no.trim() || undefined,
    };
  });

  return { line_items: lineItems, payment_terms: paymentTerms };
}

function nextSequence(items: Array<{ sequence: number }>): number {
  return Math.max(0, ...items.map(item => item.sequence)) + 1;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="sm:col-span-2 pt-2 border-t border-[#E7E5DF] text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8]">
      {children}
    </p>
  );
}

export function ClientPOEditor({
  details,
  dppAmount,
  currency,
  value,
  onDetailsChange,
  onChange,
  pendingFiles,
  onPendingFilesChange,
  existingAttachments,
  onOpenAttachment,
  onDeleteAttachment,
  disabled = false,
}: {
  details: Record<string, string>;
  dppAmount: number;
  currency: string;
  value: ClientPOEditorState;
  onDetailsChange: (details: Record<string, string>) => void;
  onChange: (value: ClientPOEditorState) => void;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  existingAttachments: OperationalAttachment[];
  onOpenAttachment: (attachment: OperationalAttachment) => void;
  onDeleteAttachment: (attachment: OperationalAttachment) => void;
  disabled?: boolean;
}) {
  const taxAmount = Number(details.tax_amount || 0);
  const grandTotal = dppAmount + taxAmount;
  const updateDetail = (key: string, nextValue: string) => {
    onDetailsChange({ ...details, [key]: nextValue });
  };
  const updateLine = (index: number, patch: Partial<ClientPOLineEditor>) => {
    onChange({
      ...value,
      lineItems: value.lineItems.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
    });
  };
  const updateTerm = (index: number, patch: Partial<ClientPOPaymentEditor>) => {
    onChange({
      ...value,
      paymentTerms: value.paymentTerms.map((term, termIndex) => termIndex === index ? { ...term, ...patch } : term),
    });
  };

  return (
    <>
      <SectionTitle>Client PO Identification</SectionTitle>
      <Input label="PO Date" type="date" value={details.po_date ?? ""} disabled={disabled} onChange={event => updateDetail("po_date", event.target.value)} />
      <Input label="Requisition Number" value={details.requisition_no ?? ""} disabled={disabled} onChange={event => updateDetail("requisition_no", event.target.value)} />
      <Input label="Source Form Number" value={details.form_no ?? ""} disabled={disabled} onChange={event => updateDetail("form_no", event.target.value)} />
      <Input label="Scope Code" value={details.scope_code ?? ""} disabled={disabled} onChange={event => updateDetail("scope_code", event.target.value)} />
      <Input label="Quotation Reference" value={details.quotation_reference ?? ""} disabled={disabled} onChange={event => updateDetail("quotation_reference", event.target.value)} />
      <Input label="Quotation Date" type="date" value={details.quotation_date ?? ""} disabled={disabled} onChange={event => updateDetail("quotation_date", event.target.value)} />
      <Input label="Client Prepared By" value={details.source_created_by ?? ""} disabled={disabled} onChange={event => updateDetail("source_created_by", event.target.value)} />

      <SectionTitle>Commercial Summary</SectionTitle>
      <Input label="Tax / PPN Amount" type="number" min="0" step="0.01" value={details.tax_amount ?? "0"} disabled={disabled} onChange={event => updateDetail("tax_amount", event.target.value)} />
      <Input label="Grand Total" value={money(grandTotal, currency)} readOnly disabled />

      <SectionTitle>Delivery and Warranty</SectionTitle>
      <Input label="Delivery Term" placeholder="e.g. DDP" value={details.delivery_term ?? ""} disabled={disabled} onChange={event => updateDetail("delivery_term", event.target.value)} />
      <Input label="Ship-to Location" value={details.ship_to_location ?? ""} disabled={disabled} onChange={event => updateDetail("ship_to_location", event.target.value)} />
      <Input label="Delivery Contact" value={details.delivery_contact ?? ""} disabled={disabled} onChange={event => updateDetail("delivery_contact", event.target.value)} />
      <Input label="Work Duration (Months)" type="number" min="0" value={details.work_duration_months ?? ""} disabled={disabled} onChange={event => updateDetail("work_duration_months", event.target.value)} />
      <Input label="Target Completion Date" type="date" value={details.target_completion_date ?? ""} disabled={disabled} onChange={event => updateDetail("target_completion_date", event.target.value)} />
      <Input label="Warranty (Months)" type="number" min="0" value={details.warranty_months ?? ""} disabled={disabled} onChange={event => updateDetail("warranty_months", event.target.value)} />
      <Input label="Warranty Starts From" placeholder="e.g. Commissioning" value={details.warranty_start_event ?? ""} disabled={disabled} onChange={event => updateDetail("warranty_start_event", event.target.value)} />
      <Input label="Billing Contact" value={details.billing_contact ?? ""} disabled={disabled} onChange={event => updateDetail("billing_contact", event.target.value)} />
      <div className="sm:col-span-2">
        <Textarea label="Billing Address" rows={2} value={details.billing_address ?? ""} disabled={disabled} onChange={event => updateDetail("billing_address", event.target.value)} />
      </div>

      <div className="sm:col-span-2 pt-2 border-t border-[#E7E5DF] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8]">BOQ / Line Items</p>
          {!disabled && (
            <Button
              type="button"
              size="xs"
              icon={<Plus size={13} />}
              onClick={() => onChange({
                ...value,
                lineItems: [...value.lineItems, {
                  sequence: nextSequence(value.lineItems), item_no: "", description: "",
                  manufacturer: "", model: "", quantity: "1", uom: "EA",
                  unit_price: "0", technical_specs: "",
                }],
              })}
            >
              Add Item
            </Button>
          )}
        </div>
        <div className="overflow-x-auto border border-[#E7E5DF] rounded-lg">
          <table className="w-full min-w-[980px] text-[11px]">
            <thead className="bg-[#F8FAF9] text-[#94A3B8] uppercase tracking-[0.08em]">
              <tr>
                <th className="px-2 py-2 text-left w-16">Item</th><th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-left w-28">Manufacturer</th><th className="px-2 py-2 text-left w-28">Model</th>
                <th className="px-2 py-2 text-left w-20">Qty</th><th className="px-2 py-2 text-left w-20">UOM</th>
                <th className="px-2 py-2 text-left w-32">Unit Price</th><th className="px-2 py-2 text-right w-32">Total</th>
                {!disabled && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFEA]">
              {value.lineItems.map((item, index) => (
                <tr key={item.sequence}>
                  <td className="p-1.5"><Input value={item.item_no} disabled={disabled} onChange={event => updateLine(index, { item_no: event.target.value })} /></td>
                  <td className="p-1.5">
                    <Input value={item.description} disabled={disabled} onChange={event => updateLine(index, { description: event.target.value })} />
                    <Input className="mt-1" placeholder="Technical specification" value={item.technical_specs} disabled={disabled} onChange={event => updateLine(index, { technical_specs: event.target.value })} />
                  </td>
                  <td className="p-1.5"><Input value={item.manufacturer} disabled={disabled} onChange={event => updateLine(index, { manufacturer: event.target.value })} /></td>
                  <td className="p-1.5"><Input value={item.model} disabled={disabled} onChange={event => updateLine(index, { model: event.target.value })} /></td>
                  <td className="p-1.5"><Input type="number" min="0" step="0.0001" value={item.quantity} disabled={disabled} onChange={event => updateLine(index, { quantity: event.target.value })} /></td>
                  <td className="p-1.5"><Input value={item.uom} disabled={disabled} onChange={event => updateLine(index, { uom: event.target.value })} /></td>
                  <td className="p-1.5"><Input type="number" min="0" step="0.01" value={item.unit_price} disabled={disabled} onChange={event => updateLine(index, { unit_price: event.target.value })} /></td>
                  <td className="px-2 py-2 text-right font-mono text-[#33445A]">{money(Number(item.quantity || 0) * Number(item.unit_price || 0), currency)}</td>
                  {!disabled && (
                    <td className="px-1 text-center">
                      <button type="button" title="Remove item" className="p-1.5 text-red-500 hover:bg-red-50 rounded" onClick={() => onChange({ ...value, lineItems: value.lineItems.filter((_, itemIndex) => itemIndex !== index) })}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!value.lineItems.length && <tr><td colSpan={9} className="px-3 py-5 text-center text-[#94A3B8]">No BOQ items added</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:col-span-2 pt-2 border-t border-[#E7E5DF] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8]">Payment Schedule</p>
          {!disabled && (
            <Button
              type="button"
              size="xs"
              icon={<Plus size={13} />}
              onClick={() => onChange({
                ...value,
                paymentTerms: [...value.paymentTerms, {
                  sequence: nextSequence(value.paymentTerms), percentage: "0", trigger: "",
                  calculation_basis: "grand_total", due_date: "", status: "planned", invoice_no: "",
                }],
              })}
            >
              Add Term
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {value.paymentTerms.map((term, index) => {
            const percentage = Number(term.percentage || 0);
            return (
              <div key={term.sequence} className="grid grid-cols-1 sm:grid-cols-[90px_minmax(180px,1fr)_150px_130px_36px] gap-2 items-end border-b border-[#F0EFEA] pb-2">
                <Input label="Percent" type="number" min="0" max="100" step="0.01" value={term.percentage} disabled={disabled} onChange={event => updateTerm(index, { percentage: event.target.value })} />
                <Input label="Payment Trigger" value={term.trigger} disabled={disabled} onChange={event => updateTerm(index, { trigger: event.target.value })} />
                <Input label="Calculated Gross" value={money(roundedShare(grandTotal, percentage), currency)} readOnly disabled />
                <Input label="Due Date" type="date" value={term.due_date} disabled={disabled} onChange={event => updateTerm(index, { due_date: event.target.value })} />
                {!disabled && (
                  <button type="button" title="Remove term" className="mb-1 p-2 text-red-500 hover:bg-red-50 rounded" onClick={() => onChange({ ...value, paymentTerms: value.paymentTerms.filter((_, termIndex) => termIndex !== index) })}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {!value.paymentTerms.length && <p className="text-[11px] text-center text-[#94A3B8] py-3">No payment terms added</p>}
        </div>
      </div>

      <div className="sm:col-span-2 pt-2 border-t border-[#E7E5DF] space-y-3">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8]">Protected Source Documents</p>
        {!disabled && (
          <label className="flex items-center justify-center gap-2 min-h-10 border border-dashed border-[#C4C0B6] rounded-lg text-[12px] font-semibold text-[#33445A] cursor-pointer hover:bg-[#F8FAF9]">
            <Upload size={14} /> Add PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={event => {
                const files = Array.from(event.target.files ?? []);
                onPendingFilesChange([...pendingFiles, ...files]);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {[...existingAttachments.map(attachment => ({ attachment })), ...pendingFiles.map(file => ({ file }))].map((entry, index) => {
          const attachment = "attachment" in entry ? entry.attachment : null;
          const file = "file" in entry ? entry.file : null;
          return (
            <div key={attachment?.id ?? `${file?.name}-${index}`} className="flex items-center gap-2 px-3 py-2 border border-[#E7E5DF] rounded-lg">
              <FileText size={14} className="text-[#5E7186] shrink-0" />
              <span className="flex-1 min-w-0 truncate text-[12px] text-[#33445A]">{attachment?.original_filename ?? file?.name}</span>
              {attachment && (
                <button type="button" title="Open PDF" className="p-1.5 text-[#5E7186] hover:bg-[#F8FAF9] rounded" onClick={() => onOpenAttachment(attachment)}>
                  <ExternalLink size={13} />
                </button>
              )}
              {!disabled && (
                <button
                  type="button"
                  title="Remove document"
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  onClick={() => attachment
                    ? onDeleteAttachment(attachment)
                    : onPendingFilesChange(pendingFiles.filter(candidate => candidate !== file))}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
        {!existingAttachments.length && !pendingFiles.length && <p className="text-[11px] text-[#94A3B8]">No source document attached</p>}
      </div>
    </>
  );
}


export function ClientPODetailPanel({
  detail,
  details,
  currency,
  onOpenAttachment,
}: {
  detail: ClientPODetail | undefined;
  details: Record<string, unknown>;
  currency: string;
  onOpenAttachment: (attachment: OperationalAttachment) => void;
}) {
  if (!detail) return <p className="text-[12px] text-[#94A3B8]">Loading Client PO details...</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-[#E7E5DF] rounded-lg p-4">
        <DetailValue label="PO Date">{String(details.po_date ?? "-")}</DetailValue>
        <DetailValue label="Tax / PPN">{money(Number(details.tax_amount ?? 0), currency)}</DetailValue>
        <DetailValue label="Grand Total">{money(Number(details.grand_total ?? 0), currency)}</DetailValue>
        <DetailValue label="Delivery Term">{String(details.delivery_term ?? "-")}</DetailValue>
        <DetailValue label="Ship-to">{String(details.ship_to_location ?? "-")}</DetailValue>
        <DetailValue label="Warranty">{details.warranty_months ? `${String(details.warranty_months)} months` : "-"}</DetailValue>
        <DetailValue label="Quotation">{String(details.quotation_reference ?? "-")}</DetailValue>
        <DetailValue label="Scope">{String(details.scope_code ?? "-")}</DetailValue>
      </div>
      <div className="overflow-x-auto border border-[#E7E5DF] rounded-lg">
        <table className="w-full min-w-[720px] text-[11px]">
          <thead className="bg-[#F8FAF9] text-[#94A3B8] uppercase tracking-[0.08em]"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit Price</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-[#F0EFEA]">
            {detail.line_items.map(item => <tr key={item.id}><td className="px-3 py-2">{item.item_no}</td><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2 text-right">{item.quantity} {item.uom}</td><td className="px-3 py-2 text-right font-mono">{money(item.unit_price, currency)}</td><td className="px-3 py-2 text-right font-mono">{money(item.line_total, currency)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        {detail.payment_terms.map(term => <div key={term.id} className="flex items-start justify-between gap-4 px-3 py-2 border-b border-[#F0EFEA] text-[12px]"><div><p className="font-semibold text-[#33445A]">{term.percentage}% - {term.trigger}</p><p className="text-[10px] text-[#94A3B8] capitalize">{term.status}</p></div><span className="font-mono text-[#0C2138]">{money(term.gross_amount, currency)}</span></div>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {detail.attachments.map(attachment => (
          <button key={attachment.id} type="button" onClick={() => onOpenAttachment(attachment)} className="inline-flex items-center gap-2 px-3 py-2 border border-[#E7E5DF] rounded-lg text-[11px] text-[#33445A] hover:bg-[#F8FAF9]">
            <FileText size={13} /> {attachment.original_filename} <ExternalLink size={12} />
          </button>
        ))}
        {!detail.attachments.length && <p className="text-[11px] text-[#94A3B8]">No source document available</p>}
      </div>
    </div>
  );
}
