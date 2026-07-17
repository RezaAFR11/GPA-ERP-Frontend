"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, Clock3, Eye,
  History, MoreHorizontal, Pencil, Play, Plus, RotateCcw, Search,
  Send, Trash2, XCircle,
} from "lucide-react";
import { operationsApi, projectsApi } from "@/lib/api";
import type {
  OperationalModule, OperationalPriority, OperationalRecord,
  OperationalRecordInput, OperationalStatus,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FloatingActionMenu } from "@/components/ui/floating-action-menu";
import { TableSkeleton } from "@/components/ui/skeleton";


interface OperationalWorkspaceProps {
  moduleKey: string;
}

interface ModulePresentation {
  singular: string;
  partnerLabel: string;
  amountLabel: string;
}

interface DetailField {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
}

interface FormState {
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


const PRESENTATION: Record<string, ModulePresentation> = {
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

const DETAIL_FIELDS: Record<string, DetailField[]> = {
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

const STATUS_LABEL: Record<OperationalStatus, string> = {
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

const STATUS_STYLE: Record<OperationalStatus, string> = {
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

const PRIORITY_STYLE: Record<OperationalPriority, string> = {
  low: "text-slate-500",
  normal: "text-[#33445A]",
  high: "text-amber-700",
  critical: "text-red-600",
};

const WORKFLOW_ACTIONS: Record<OperationalStatus, string[]> = {
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

const APPROVER_ACTIONS = new Set(["review", "approve", "reject", "activate", "complete", "close"]);

const ACTION_META: Record<string, { label: string; icon: React.ElementType; danger?: boolean }> = {
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


function emptyForm(module?: OperationalModule): FormState {
  return {
    record_type: Object.keys(module?.record_types ?? {})[0] ?? "",
    reference_no: "",
    title: "",
    description: "",
    priority: "normal",
    project_id: "",
    partner_name: "",
    amount: "0",
    currency: "IDR",
    progress: "0",
    due_date: "",
    owner_id: "",
    details: {},
  };
}

function formFromRecord(record: OperationalRecord): FormState {
  return {
    record_type: record.record_type,
    reference_no: record.reference_no,
    title: record.title,
    description: record.description ?? "",
    priority: record.priority,
    project_id: record.project_id?.toString() ?? "",
    partner_name: record.partner_name ?? "",
    amount: String(record.amount),
    currency: record.currency,
    progress: String(record.progress),
    due_date: record.due_date ?? "",
    owner_id: record.owner_id?.toString() ?? "",
    details: Object.fromEntries(
      Object.entries(record.details ?? {}).map(([key, value]) => [key, value == null ? "" : String(value)]),
    ),
  };
}

function toPayload(form: FormState): OperationalRecordInput {
  const details = Object.fromEntries(
    Object.entries(form.details).filter(([, value]) => value !== ""),
  );
  return {
    record_type: form.record_type,
    ...(form.reference_no.trim() ? { reference_no: form.reference_no.trim() } : {}),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    priority: form.priority,
    project_id: form.project_id ? Number(form.project_id) : null,
    partner_name: form.partner_name.trim() || undefined,
    amount: Number(form.amount || 0),
    currency: form.currency.toUpperCase(),
    progress: Number(form.progress || 0),
    due_date: form.due_date || null,
    owner_id: form.owner_id ? Number(form.owner_id) : null,
    details,
  };
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}


function RowActionMenu({
  record,
  module,
  currentUserId,
  onView,
  onEdit,
  onTransition,
  onDelete,
}: {
  record: OperationalRecord;
  module: OperationalModule;
  currentUserId: number | null;
  onView: () => void;
  onEdit: () => void;
  onTransition: (action: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const canManage = module.can_approve || record.created_by === currentUserId || record.owner_id === currentUserId;
  const actions = WORKFLOW_ACTIONS[record.status].filter(
    action => !APPROVER_ACTIONS.has(action) || module.can_approve,
  );
  const deletable = canManage && ["draft", "rejected", "cancelled"].includes(record.status);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        className="p-2 rounded-lg text-[#94A3B8] hover:text-[#0C2138] hover:bg-[#F8FAF9] transition-colors"
        aria-label={`Actions for ${record.reference_no}`}
      >
        <MoreHorizontal size={16} />
      </button>
      <FloatingActionMenu open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} widthClass="w-52">
        <MenuButton icon={Eye} label="View Details" onClick={() => { setOpen(false); onView(); }} />
        {canManage && record.status !== "closed" && (
          <MenuButton icon={Pencil} label={record.status === "draft" || record.status === "rejected" ? "Edit" : "Update Progress"} onClick={() => { setOpen(false); onEdit(); }} />
        )}
        {actions.map(action => {
          const meta = ACTION_META[action];
          return (
            <MenuButton
              key={action}
              icon={meta.icon}
              label={meta.label}
              danger={meta.danger}
              onClick={() => { setOpen(false); onTransition(action); }}
            />
          );
        })}
        {deletable && (
          <MenuButton icon={Trash2} label="Delete" danger onClick={() => { setOpen(false); onDelete(); }} />
        )}
      </FloatingActionMenu>
    </>
  );
}

function MenuButton({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-[#33445A] hover:bg-[#F8FAF9]"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}


export function OperationalWorkspace({ moduleKey }: OperationalWorkspaceProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const openedRecordRef = useRef<string | null>(null);
  const { user } = useAuth();
  const presentation = PRESENTATION[moduleKey] ?? {
    singular: "Record", partnerLabel: "Partner", amountLabel: "Value",
  };
  const detailFields = DETAIL_FIELDS[moduleKey] ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OperationalRecord | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [viewing, setViewing] = useState<OperationalRecord | null>(null);
  const [transition, setTransition] = useState<{ record: OperationalRecord; action: string } | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [deleting, setDeleting] = useState<OperationalRecord | null>(null);

  const modulesQuery = useQuery({
    queryKey: ["operational-modules"],
    queryFn: () => operationsApi.modules().then(response => response.data),
    staleTime: 5 * 60_000,
  });
  const module = modulesQuery.data?.find(item => item.key === moduleKey);

  const recordsQuery = useQuery({
    queryKey: ["operational-records", moduleKey, search, statusFilter, typeFilter, projectFilter],
    queryFn: () => operationsApi.list(moduleKey, {
      search: search || undefined,
      status: statusFilter || undefined,
      record_type: typeFilter || undefined,
      project_id: projectFilter ? Number(projectFilter) : undefined,
      limit: 500,
    }).then(response => response.data),
    enabled: !!module,
  });
  const summaryQuery = useQuery({
    queryKey: ["operational-summary", moduleKey],
    queryFn: () => operationsApi.summary(moduleKey).then(response => response.data),
    enabled: !!module,
  });
  const projectsQuery = useQuery({
    queryKey: ["projects", "operational-workspace"],
    queryFn: () => projectsApi.list({ include_archived: false, limit: 500 }).then(response => response.data.items),
    staleTime: 60_000,
  });

  const projects = projectsQuery.data ?? [];
  const projectMap = useMemo(
    () => new Map(projects.map(project => [project.id, `${project.code} - ${project.name}`])),
    [projects],
  );

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["operational-records", moduleKey] }),
    queryClient.invalidateQueries({ queryKey: ["operational-summary", moduleKey] }),
    queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] }),
  ]);

  const saveMutation = useMutation({
    mutationFn: (payload: OperationalRecordInput) => editing
      ? operationsApi.update(moduleKey, editing.id, payload)
      : operationsApi.create(moduleKey, payload),
    onSuccess: async ({ data }) => {
      await invalidate();
      setFormOpen(false);
      setEditing(null);
      toastSuccess(editing ? "Record updated" : "Record created", `${data.reference_no} saved successfully`);
    },
    onError: error => toastError("Unable to save record", getErrorMessage(error)),
  });
  const transitionMutation = useMutation({
    mutationFn: ({ record, action, note }: { record: OperationalRecord; action: string; note?: string }) =>
      operationsApi.transition(moduleKey, record.id, action, note),
    onSuccess: async ({ data }) => {
      await invalidate();
      setTransition(null);
      setTransitionNote("");
      setViewing(current => current?.id === data.id ? data : current);
      toastSuccess("Workflow updated", `${data.reference_no} is now ${STATUS_LABEL[data.status]}`);
    },
    onError: error => toastError("Workflow action failed", getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (record: OperationalRecord) => operationsApi.delete(moduleKey, record.id),
    onSuccess: async () => {
      await invalidate();
      setDeleting(null);
      toastSuccess("Record deleted", "The draft record was removed");
    },
    onError: error => toastError("Unable to delete record", getErrorMessage(error)),
  });

  function openCreate() {
    if (!module) return;
    setEditing(null);
    setForm(emptyForm(module));
    setFormOpen(true);
  }

  function openEdit(record: OperationalRecord) {
    setEditing(record);
    setForm(formFromRecord(record));
    setFormOpen(true);
  }

  function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.record_type) {
      toastError("Required fields are missing", "Type and title must be completed");
      return;
    }
    saveMutation.mutate(toPayload(form));
  }

  const records = recordsQuery.data?.items ?? [];
  useEffect(() => {
    const requestedId = searchParams.get("record");
    if (!requestedId || openedRecordRef.current === requestedId) return;
    const requestedRecord = records.find(record => record.id === Number(requestedId));
    if (requestedRecord) {
      openedRecordRef.current = requestedId;
      setViewing(requestedRecord);
    }
  }, [records, searchParams]);

  if (modulesQuery.isLoading || !module) {
    if (modulesQuery.isError) {
      return <p className="text-sm text-red-600">{getErrorMessage(modulesQuery.error)}</p>;
    }
    return <TableSkeleton rows={6} cols={7} />;
  }

  const summary = summaryQuery.data;
  const lockedEdit = !!editing && !["draft", "rejected"].includes(editing.status);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0C2138]">{module.label}</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">{module.description}</p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={openCreate}>
          New {presentation.singular}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryTile label="Total Records" value={String(summary?.total ?? 0)} />
        <SummaryTile label="In Progress" value={String((summary?.by_status.active ?? 0) + (summary?.by_status.in_review ?? 0))} />
        <SummaryTile label="Due in 30 Days" value={String(summary?.due_soon ?? 0)} />
        <SummaryTile label="Overdue" value={String(summary?.overdue ?? 0)} danger={(summary?.overdue ?? 0) > 0} />
        <SummaryTile label="Total Value" value={formatMoney(summary?.total_amount ?? 0, "IDR")} className="col-span-2 lg:col-span-1" />
      </div>

      <div className="flex flex-col lg:flex-row gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search reference, title, partner..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E7E5DF] bg-white text-[12px] text-[#0C2138] outline-none focus:border-[#0A3A63]"
          />
        </div>
        <FilterSelect value={typeFilter} onChange={setTypeFilter} label="All Types">
          {Object.entries(module.record_types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="All Statuses">
          {module.statuses.map(value => <option key={value} value={value}>{STATUS_LABEL[value]}</option>)}
        </FilterSelect>
        <FilterSelect value={projectFilter} onChange={setProjectFilter} label="All Projects">
          {projects.map(project => <option key={project.id} value={project.id}>{project.code}</option>)}
        </FilterSelect>
      </div>

      <Card padding={false}>
        {recordsQuery.isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : recordsQuery.isError ? (
          <div className="p-8 text-center text-sm text-red-600">{getErrorMessage(recordsQuery.error)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center">
            <History size={30} className="mx-auto text-[#C4C0B6] mb-3" />
            <p className="text-sm font-semibold text-[#33445A]">No records found</p>
            <p className="text-xs text-[#94A3B8] mt-1">Create the first {presentation.singular.toLowerCase()} or adjust the filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed">
              <thead>
                <tr className="border-b border-[#E7E5DF]">
                  <th className="th w-[140px]">Reference</th>
                  <th className="th w-[160px]">Type</th>
                  <th className="th w-[250px]">Title</th>
                  <th className="th w-[180px]">Project / Partner</th>
                  <th className="th w-[135px] text-right">Value</th>
                  <th className="th w-[120px]">Progress</th>
                  <th className="th w-[110px]">Due</th>
                  <th className="th w-[110px]">Status</th>
                  <th className="th w-[64px] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA]">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="td font-mono text-[11px] font-semibold text-[#33445A] truncate">{record.reference_no}</td>
                    <td className="td text-[11px] text-[#5E7186] truncate">{module.record_types[record.record_type] ?? record.record_type}</td>
                    <td className="td">
                      <p className="text-[12.5px] font-semibold text-[#0C2138] truncate">{record.title}</p>
                      <p className={`text-[10px] capitalize mt-0.5 ${PRIORITY_STYLE[record.priority]}`}>{record.priority} priority</p>
                    </td>
                    <td className="td">
                      <p className="text-[11px] text-[#33445A] truncate">{record.project_id ? projectMap.get(record.project_id) ?? `Project #${record.project_id}` : "No project"}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">{record.partner_name || "-"}</p>
                    </td>
                    <td className="td text-right font-mono text-[11px] font-semibold text-[#0C2138]">{formatMoney(record.amount, record.currency)}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-[#EEF0F2] overflow-hidden">
                          <div className="h-full bg-[#0D9488]" style={{ width: `${Math.min(100, Number(record.progress))}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-[#5E7186] w-8 text-right">{Number(record.progress).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="td text-[11px] text-[#5E7186]">{formatDate(record.due_date)}</td>
                    <td className="td"><Badge dot className={STATUS_STYLE[record.status]}>{STATUS_LABEL[record.status]}</Badge></td>
                    <td className="td text-center">
                      <RowActionMenu
                        record={record}
                        module={module}
                        currentUserId={user?.id ?? null}
                        onView={() => setViewing(record)}
                        onEdit={() => openEdit(record)}
                        onTransition={action => { setTransition({ record, action }); setTransitionNote(""); }}
                        onDelete={() => setDeleting(record)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => { if (!saveMutation.isPending) setFormOpen(false); }}
        title={editing ? `Edit ${presentation.singular}` : `New ${presentation.singular}`}
        subtitle={lockedEdit ? "Identity and financial fields are locked after submission" : "Complete the operational record details"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button variant="primary" loading={saveMutation.isPending} onClick={() => document.getElementById("operational-record-submit")?.click()}>
              {editing ? "Save Changes" : "Create Record"}
            </Button>
          </>
        }
      >
        <form onSubmit={submitForm} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button id="operational-record-submit" type="submit" className="hidden" />
          <Select label="Record Type" value={form.record_type} disabled={lockedEdit} onChange={event => setForm({ ...form, record_type: event.target.value })}>
            {Object.entries(module.record_types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input label="Reference Number" placeholder="Generated automatically if blank" value={form.reference_no} disabled={lockedEdit} onChange={event => setForm({ ...form, reference_no: event.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Title" required value={form.title} disabled={lockedEdit} onChange={event => setForm({ ...form, title: event.target.value })} />
          </div>
          <Select label="Project" value={form.project_id} disabled={lockedEdit} onChange={event => setForm({ ...form, project_id: event.target.value })} placeholder="No project">
            {projects.map(project => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
          </Select>
          <Input label={presentation.partnerLabel} value={form.partner_name} disabled={lockedEdit} onChange={event => setForm({ ...form, partner_name: event.target.value })} />
          <Input label={presentation.amountLabel} type="number" min="0" step="0.01" value={form.amount} disabled={lockedEdit} onChange={event => setForm({ ...form, amount: event.target.value })} />
          <Select label="Currency" value={form.currency} disabled={lockedEdit} onChange={event => setForm({ ...form, currency: event.target.value })}>
            <option value="IDR">IDR</option><option value="USD">USD</option><option value="SGD">SGD</option>
          </Select>
          <Input label="Progress (%)" type="number" min="0" max="100" step="0.01" value={form.progress} onChange={event => setForm({ ...form, progress: event.target.value })} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} />
          <Select label="Priority" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as OperationalPriority })}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
          </Select>
          {detailFields.map(field => (
            <Input
              key={field.key}
              label={field.label}
              type={field.type ?? "text"}
              value={form.details[field.key] ?? ""}
              onChange={event => setForm({ ...form, details: { ...form.details, [field.key]: event.target.value } })}
            />
          ))}
          <div className="sm:col-span-2">
            <Textarea label="Description / Notes" rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.reference_no ?? "Record Details"}
        subtitle={viewing ? module.record_types[viewing.record_type] ?? viewing.record_type : undefined}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailValue label="Status"><Badge dot className={STATUS_STYLE[viewing.status]}>{STATUS_LABEL[viewing.status]}</Badge></DetailValue>
              <DetailValue label="Project">{viewing.project_id ? projectMap.get(viewing.project_id) ?? `#${viewing.project_id}` : "-"}</DetailValue>
              <DetailValue label={presentation.partnerLabel}>{viewing.partner_name || "-"}</DetailValue>
              <DetailValue label={presentation.amountLabel}>{formatMoney(viewing.amount, viewing.currency)}</DetailValue>
              <DetailValue label="Progress">{Number(viewing.progress).toFixed(1)}%</DetailValue>
              <DetailValue label="Due Date">{formatDate(viewing.due_date)}</DetailValue>
              <DetailValue label="Priority"><span className={`capitalize ${PRIORITY_STYLE[viewing.priority]}`}>{viewing.priority}</span></DetailValue>
              <DetailValue label="Owner">{viewing.owner_id ? `User #${viewing.owner_id}` : "-"}</DetailValue>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] mb-1.5">Title</p>
              <p className="text-sm font-semibold text-[#0C2138]">{viewing.title}</p>
              {viewing.description && <p className="text-[12px] text-[#5E7186] leading-relaxed mt-2 whitespace-pre-wrap">{viewing.description}</p>}
            </div>
            {Object.keys(viewing.details).length > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] mb-2">Domain Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-[#E7E5DF] p-4">
                  {Object.entries(viewing.details).map(([key, value]) => (
                    <DetailValue key={key} label={key.replaceAll("_", " ")}>{String(value)}</DetailValue>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] mb-2">Workflow History</p>
              <div className="divide-y divide-[#F0EFEA] border border-[#E7E5DF] rounded-lg overflow-hidden">
                {[...viewing.workflow_history].reverse().map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="flex items-start gap-3 px-4 py-3">
                    <Clock3 size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#33445A] capitalize">{event.action.replaceAll("_", " ")} · {event.to_status.replaceAll("_", " ")}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">User #{event.user_id} · {new Date(event.timestamp).toLocaleString("id-ID")}</p>
                      {event.note && <p className="text-[11px] text-[#5E7186] mt-1">{event.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!transition}
        onClose={() => { if (!transitionMutation.isPending) setTransition(null); }}
        title={transition ? `${ACTION_META[transition.action].label} Record` : "Update Workflow"}
        subtitle={transition?.record.reference_no}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransition(null)} disabled={transitionMutation.isPending}>Cancel</Button>
            <Button
              variant={transition && ACTION_META[transition.action].danger ? "danger" : "primary"}
              loading={transitionMutation.isPending}
              onClick={() => {
                if (!transition) return;
                if (transition.action === "reject" && !transitionNote.trim()) {
                  toastError("Rejection note required", "Explain why this record is rejected");
                  return;
                }
                transitionMutation.mutate({ record: transition.record, action: transition.action, note: transitionNote || undefined });
              }}
            >
              {transition ? ACTION_META[transition.action].label : "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-[#33445A] text-center mb-4">
          Confirm this workflow action for <strong>{transition?.record.title}</strong>?
        </p>
        <Textarea
          label={transition?.action === "reject" ? "Reason (required)" : "Note (optional)"}
          value={transitionNote}
          onChange={event => setTransitionNote(event.target.value)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting); }}
        title="Delete Record"
        message={`Delete ${deleting?.reference_no ?? "this draft record"}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}


function SummaryTile({
  label,
  value,
  danger = false,
  className = "",
}: {
  label: string;
  value: string;
  danger?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-[#E7E5DF] rounded-lg px-4 py-3 shadow-xs min-w-0 ${className}`}>
      <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] truncate">{label}</p>
      <p className={`font-mono text-[17px] font-bold mt-1 truncate ${danger ? "text-red-600" : "text-[#0C2138]"}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-10 rounded-lg border border-[#E7E5DF] bg-white px-3 text-[12px] text-[#33445A] outline-none focus:border-[#0A3A63] min-w-[145px]"
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}

function DetailValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#94A3B8] truncate">{label}</p>
      <div className="text-[12px] font-medium text-[#33445A] mt-1 truncate">{children}</div>
    </div>
  );
}
