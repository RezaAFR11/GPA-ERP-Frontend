import type React from "react";
import {
  Check,
  CheckCircle2,
  Eye,
  Play,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";

import type { OperationalPriority, OperationalStatus } from "@/lib/types";

export interface ModulePresentation {
  singular: string;
  partnerLabel: string;
  amountLabel: string;
}

export interface DetailField {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
}

export interface FormState {
  record_type: string;
  reference_no: string;
  title: string;
  description: string;
  priority: OperationalPriority;
  project_id: string;
  partner_name: string;
  amount: string;
  currency: string;
  progress: string;
  due_date: string;
  owner_id: string;
  details: Record<string, string>;
}


export const PRESENTATION: Record<string, ModulePresentation> = {
  procurement: { singular: "Procurement Record", partnerLabel: "Vendor", amountLabel: "Procurement Value" },
  accounts_payable: { singular: "Payable Record", partnerLabel: "Vendor", amountLabel: "Invoice Amount" },
  accounting_tax: { singular: "Accounting Record", partnerLabel: "Counterparty", amountLabel: "Transaction Value" },
  project_execution: { singular: "Execution Record", partnerLabel: "Contractor / Client", amountLabel: "Planned Value" },
  engineering_documents: { singular: "Engineering Document", partnerLabel: "Originator", amountLabel: "Document Value" },
  quality_control: { singular: "Quality Record", partnerLabel: "Inspector / Contractor", amountLabel: "Impact Value" },
  hse: { singular: "HSE Record", partnerLabel: "Responsible Party", amountLabel: "Impact Value" },
  warehouse_logistics: { singular: "Logistics Record", partnerLabel: "Carrier / Vendor", amountLabel: "Movement Value" },
  equipment_assets: { singular: "Asset Record", partnerLabel: "Supplier / Custodian", amountLabel: "Asset Value" },
  contract_management: { singular: "Contract Record", partnerLabel: "Contract Party", amountLabel: "Contract Value" },
  crm_tender: { singular: "Commercial Record", partnerLabel: "Customer", amountLabel: "Opportunity Value" },
  manpower_operations: { singular: "Manpower Record", partnerLabel: "Employee / Agency", amountLabel: "Assignment Cost" },
  budget_bi: { singular: "Planning Record", partnerLabel: "Business Unit", amountLabel: "Budget / Forecast" },
};

export const DETAIL_FIELDS: Record<string, DetailField[]> = {
  procurement: [
    { key: "source_reference", label: "Source PR / RFQ / PO" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "delivery_date", label: "Delivery Date", type: "date" },
  ],
  accounts_payable: [
    { key: "po_reference", label: "PO Reference" },
    { key: "grn_reference", label: "Goods Receipt Reference" },
    { key: "invoice_date", label: "Invoice Date", type: "date" },
  ],
  accounting_tax: [
    { key: "account_code", label: "Account / Tax Code" },
    { key: "debit_total", label: "Debit Total", type: "number" },
    { key: "credit_total", label: "Credit Total", type: "number" },
  ],
  project_execution: [
    { key: "baseline_date", label: "Baseline Date", type: "date" },
    { key: "actual_date", label: "Actual Date", type: "date" },
    { key: "wbs_code", label: "WBS Code" },
  ],
  engineering_documents: [
    { key: "document_number", label: "Document Number" },
    { key: "revision", label: "Revision" },
    { key: "discipline", label: "Discipline" },
  ],
  quality_control: [
    { key: "inspection_date", label: "Inspection Date", type: "date" },
    { key: "location", label: "Inspection Location" },
    { key: "finding_count", label: "Finding Count", type: "number" },
  ],
  hse: [
    { key: "event_date", label: "Event / Inspection Date", type: "date" },
    { key: "location", label: "Location" },
    { key: "lost_time_days", label: "Lost Time Days", type: "number" },
  ],
  warehouse_logistics: [
    { key: "source_location", label: "Source Location" },
    { key: "destination_location", label: "Destination Location" },
    { key: "quantity", label: "Quantity", type: "number" },
  ],
  equipment_assets: [
    { key: "asset_tag", label: "Asset Tag" },
    { key: "serial_number", label: "Serial Number" },
    { key: "next_service_date", label: "Next Service / Calibration", type: "date" },
  ],
  contract_management: [
    { key: "effective_date", label: "Effective Date", type: "date" },
    { key: "expiry_date", label: "Expiry Date", type: "date" },
    { key: "retention_percent", label: "Retention %", type: "number" },
  ],
  crm_tender: [
    { key: "probability", label: "Probability %", type: "number" },
    { key: "submission_date", label: "Submission Date", type: "date" },
    { key: "expected_award_date", label: "Expected Award Date", type: "date" },
  ],
  manpower_operations: [
    { key: "employee_no", label: "Employee Number" },
    { key: "mobilisation_date", label: "Mobilisation Date", type: "date" },
    { key: "certificate_expiry", label: "Certificate / Medical Expiry", type: "date" },
  ],
  budget_bi: [
    { key: "fiscal_year", label: "Fiscal Year", type: "number" },
    { key: "forecast_amount", label: "Forecast Amount", type: "number" },
    { key: "scenario", label: "Scenario" },
  ],
};

export const STATUS_LABEL: Record<OperationalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  active: "Active",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
  closed: "Closed",
};

export const STATUS_STYLE: Record<OperationalStatus, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  in_review: "bg-cyan-50 text-cyan-700 border-cyan-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-teal-50 text-teal-700 border-teal-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  closed: "bg-slate-900 text-white border-slate-900",
};

export const PRIORITY_STYLE: Record<OperationalPriority, string> = {
  low: "text-slate-500",
  normal: "text-[#33445A]",
  high: "text-amber-700",
  critical: "text-red-600",
};

export const WORKFLOW_ACTIONS: Record<OperationalStatus, string[]> = {
  draft: ["submit", "cancel"],
  submitted: ["review", "approve", "reject", "cancel"],
  in_review: ["approve", "reject", "cancel"],
  approved: ["activate", "complete", "close"],
  active: ["complete", "close"],
  rejected: ["reopen", "cancel"],
  completed: ["close", "reopen"],
  cancelled: ["reopen"],
  closed: [],
};

export const APPROVER_ACTIONS = new Set(["review", "approve", "reject", "activate", "complete", "close"]);

export const ACTION_META: Record<string, { label: string; icon: React.ElementType; danger?: boolean }> = {
  submit: { label: "Submit", icon: Send },
  review: { label: "Start Review", icon: Eye },
  approve: { label: "Approve", icon: CheckCircle2 },
  reject: { label: "Reject", icon: XCircle, danger: true },
  activate: { label: "Activate", icon: Play },
  complete: { label: "Complete", icon: Check },
  close: { label: "Close", icon: CheckCircle2 },
  cancel: { label: "Cancel", icon: XCircle, danger: true },
  reopen: { label: "Reopen", icon: RotateCcw },
};
