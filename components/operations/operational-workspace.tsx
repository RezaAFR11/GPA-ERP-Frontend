"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Clock3, History, Plus, Search } from "lucide-react";
import { operationsApi, projectsApi } from "@/lib/api";
import type {
  OperationalPriority, OperationalRecord, OperationalRecordInput,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { useTableSort } from "@/lib/table-sort";
import {
  ACTION_META,
  DETAIL_FIELDS,
  PRESENTATION,
  PRIORITY_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
  type FormState,
} from "./operational-workspace-config";
import {
  emptyForm,
  formatDate,
  formatMoney,
  formFromRecord,
  toPayload,
} from "./operational-workspace-helpers";
import {
  DetailValue,
  FilterSelect,
  RowActionMenu,
  SummaryTile,
} from "./operational-workspace-parts";


interface OperationalWorkspaceProps {
  moduleKey: string;
}

type OperationalSortKey = "id" | "reference_no" | "record_type" | "title" | "project_partner" | "amount" | "progress" | "due_date" | "status";



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
  const { sortKey, sortDirection, toggleSort } = useTableSort<OperationalSortKey>("id", "desc");

  const modulesQuery = useQuery({
    queryKey: ["operational-modules"],
    queryFn: () => operationsApi.modules().then(response => response.data),
    staleTime: 5 * 60_000,
  });
  const module = modulesQuery.data?.find(item => item.key === moduleKey);

  const recordsQuery = useQuery({
    queryKey: ["operational-records", moduleKey, search, statusFilter, typeFilter, projectFilter, sortKey, sortDirection],
    queryFn: () => operationsApi.list(moduleKey, {
      search: search || undefined,
      status: statusFilter || undefined,
      record_type: typeFilter || undefined,
      project_id: projectFilter ? Number(projectFilter) : undefined,
      sort_by: sortKey,
      sort_dir: sortDirection,
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
                  <SortableTableHeader label="Reference" column="reference_no" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[140px]" />
                  <SortableTableHeader label="Type" column="record_type" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[160px]" />
                  <SortableTableHeader label="Title" column="title" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[250px]" />
                  <SortableTableHeader label="Project / Partner" column="project_partner" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[180px]" />
                  <SortableTableHeader label="Value" column="amount" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" className="w-[135px]" />
                  <SortableTableHeader label="Progress" column="progress" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[120px]" />
                  <SortableTableHeader label="Due" column="due_date" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[110px]" />
                  <SortableTableHeader label="Status" column="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-[110px]" />
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
