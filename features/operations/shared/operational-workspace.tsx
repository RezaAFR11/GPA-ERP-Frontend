"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Clock3, History, Plus, Search } from "lucide-react";
import { operationsApi, projectsApi } from "@/lib/api";
import type {
  OperationalAttachment, OperationalPriority, OperationalRecord, OperationalRecordInput,
} from "@/lib/types";
import { openAuthenticatedFile } from "@/lib/authenticated-files";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
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
  SummaryTile,
} from "./operational-workspace-parts";
import {
  CLIENT_PO_TYPE, isCommercialType, type PendingCommercialFile,
  ClientPODetailPanel,
  clientPOEditorFromDetail,
  clientPOToInput,
  emptyClientPOEditor,
  type ClientPOEditorState,
} from "./client-po-editor";


import { CommercialInput, COMMERCIAL_STEPS, commercialWarnings } from "./commercial-input";
import { WorkflowGuide, WorkflowRouting, nextProcessor } from "./workflow-guide";
import { OperationalRecordList, type OperationalSortKey } from "./operational-record-list";

interface OperationalWorkspaceProps {
  moduleKey: string;
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
  const [projectFilter, setProjectFilter] = useState(searchParams.get("project") ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OperationalRecord | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [clientPO, setClientPO] = useState<ClientPOEditorState>(() => emptyClientPOEditor());
  const [pendingAttachments, setPendingAttachments] = useState<PendingCommercialFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<OperationalAttachment[]>([]);
  const [formStep, setFormStep] = useState(0);
  const [sourceSelection, setSourceSelection] = useState<number[]>([]);
  const [clientPOLoading, setClientPOLoading] = useState(false);
  const [viewing, setViewing] = useState<OperationalRecord | null>(null);
  const [transition, setTransition] = useState<{ record: OperationalRecord; action: string } | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [routingRecord, setRoutingRecord] = useState<OperationalRecord | null>(null);
  const [routingDetails, setRoutingDetails] = useState<Record<string, string>>({});
  const [routingOwner, setRoutingOwner] = useState("");
  const [routingNote, setRoutingNote] = useState("");
  const [deleting, setDeleting] = useState<OperationalRecord | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<OperationalAttachment | null>(null);
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
  const viewingClientPOQuery = useQuery({
    queryKey: ["client-po-detail", moduleKey, viewing?.id],
    queryFn: () => operationsApi.clientPoDetail(moduleKey, viewing!.id).then(response => response.data),
    enabled: isCommercialType(viewing?.record_type),
  });

  const assigneesQuery = useQuery({
    queryKey: ["operational-assignees", moduleKey],
    queryFn: () => operationsApi.assignees(moduleKey).then(response => response.data), enabled: !!module,
  });
  const relatedQuery = useQuery({
    queryKey: ["commercial-related", form.project_id],
    queryFn: () => operationsApi.list("contract_management", { project_id: Number(form.project_id), limit: 500 }).then(r => r.data.items),
    enabled: moduleKey === "contract_management" && !!form.project_id && formOpen,
  });
  const sourceQuery = useQuery({
    queryKey: ["commercial-source", form.details.source_record_id],
    queryFn: () => operationsApi.clientPoDetail("contract_management", Number(form.details.source_record_id)).then(r => r.data),
    enabled: moduleKey === "contract_management" && !!form.details.source_record_id && formOpen,
  });
  const projects = projectsQuery.data ?? [];
  const projectMap = useMemo(
    () => new Map(projects.map(project => [project.id, `${project.code} - ${project.name}`])),
    [projects],
  );

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["operational-records", moduleKey] }),
    queryClient.invalidateQueries({ queryKey: ["operational-summary", moduleKey] }),
    queryClient.invalidateQueries({ queryKey: ["operational-action-queue"] }),
    queryClient.invalidateQueries({ queryKey: ["client-po-detail"] }),
    queryClient.invalidateQueries({ queryKey: ["commercial-related"] }),
    queryClient.invalidateQueries({ queryKey: ["project-workspace"] }),
    queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] }),
  ]);

  const saveMutation = useMutation({
    mutationFn: async (payload: OperationalRecordInput) => {
      const response = editing
        ? await operationsApi.update(moduleKey, editing.id, payload)
        : await operationsApi.create(moduleKey, payload);
      const failedFiles: PendingCommercialFile[] = [];
      for (const { file, doc_type } of isCommercialType(payload.record_type) ? pendingAttachments : []) {
        try {
          await operationsApi.uploadAttachment(moduleKey, response.data.id, file, {
            title: file.name,
            doc_type,
            reference_no: response.data.reference_no,
            is_confidential: true,
          });
        } catch {
          failedFiles.push({ file, doc_type });
        }
      }
      return { response, failedFiles };
    },
    onSuccess: async ({ response, failedFiles }) => {
      const data = response.data;
      await invalidate();
      if (failedFiles.length) {
        setEditing(data);
        setForm(formFromRecord(data));
        setPendingAttachments(failedFiles);
        setFormStep(4);
        try {
          const detail = await operationsApi.clientPoDetail(moduleKey, data.id).then(r => r.data);
          setExistingAttachments(detail.attachments);
        } catch { /* The saved record can still be retried without creating a duplicate. */ }
        toastError("Draf tersimpan; sebagian lampiran gagal", `${failedFiles.map(entry => entry.file.name).join(", ")}. Klik Simpan draf untuk mencoba unggah kembali.`);
        return;
      }
      setFormOpen(false);
      setEditing(null);
      setPendingAttachments([]);
      setViewing(data);
      toastSuccess(editing ? "Record updated" : "Record created", `${data.reference_no} tersimpan. ${data.workflow?.instruction ?? "Buka detail untuk langkah berikutnya"}`);
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
      toastSuccess("Workflow updated", `${STATUS_LABEL[data.status]} → ${nextProcessor(data)}`);
    },
    onError: error => toastError("Workflow action failed", getErrorMessage(error)),
  });
  const routingMutation = useMutation({
    mutationFn: () => operationsApi.reassign(moduleKey, routingRecord!.id, {
      owner_id: Number(routingOwner), reviewer_id: Number(routingDetails.workflow_reviewer_id),
      executor_id: Number(routingDetails.workflow_executor_id), closer_id: Number(routingDetails.workflow_closer_id), note: routingNote.trim(),
    }),
    onSuccess: async ({ data }) => { await invalidate(); setRoutingRecord(null); setViewing(data); toastSuccess("Penanggung jawab diperbarui", nextProcessor(data)); },
    onError: error => toastError("Gagal menyerahkan pekerjaan", getErrorMessage(error)),
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
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachment: OperationalAttachment) => {
      if (!editing) throw new Error("No Client PO is being edited");
      return operationsApi.deleteAttachment(moduleKey, editing.id, attachment.id);
    },
    onSuccess: async (_, attachment) => {
      setExistingAttachments(current => current.filter(item => item.id !== attachment.id));
      setDeletingAttachment(null);
      await queryClient.invalidateQueries({ queryKey: ["client-po-detail", moduleKey] });
      toastSuccess("Document deleted", attachment.original_filename);
    },
    onError: error => toastError("Unable to delete document", getErrorMessage(error)),
  });

  function openCreate() {
    if (!module) return;
    setEditing(null);
    setClientPOLoading(false);
    setFormStep(0);
    setSourceSelection([]);
    setForm({ ...emptyForm(module), project_id: projectFilter, owner_id: String(user?.id ?? ""),
      ...(moduleKey === "contract_management" ? { record_type: CLIENT_PO_TYPE, details: { guided_contract_version: "1", work_type: "mixed" } } : {}) });
    setClientPO(emptyClientPOEditor());
    setPendingAttachments([]);
    setExistingAttachments([]);
    setFormOpen(true);
  }

  async function openEdit(record: OperationalRecord) {
    setFormStep(0);
    setSourceSelection([]);
    setEditing(record);
    setClientPOLoading(isCommercialType(record.record_type));
    setForm(formFromRecord(record));
    setClientPO(emptyClientPOEditor());
    setPendingAttachments([]);
    setExistingAttachments([]);
    setFormOpen(true);
    if (!isCommercialType(record.record_type)) return;
    try {
      const detail = await operationsApi.clientPoDetail(moduleKey, record.id).then(response => response.data);
      setClientPO(clientPOEditorFromDetail(detail));
      setExistingAttachments(detail.attachments);
    } catch (error) {
      toastError("Unable to load Client PO details", getErrorMessage(error));
      setFormOpen(false);
      setEditing(null);
    } finally {
      setClientPOLoading(false);
    }
  }

  function openAttachment(recordId: number, attachment: OperationalAttachment) {
    openAuthenticatedFile(operationsApi.attachmentUrl(moduleKey, recordId, attachment.id)).catch(error => {
      toastError("Unable to open document", getErrorMessage(error));
    });
  }

  function startRevision(record: OperationalRecord) {
    if (!viewingClientPOQuery.data) return;
    const details = formFromRecord(record).details;
    delete details.superseded_by_id;
    delete details.actual_start_date;
    delete details.actual_completion_date;
    delete details.warranty_start_date;
    const number = (Number(String(details.revision_number ?? "0").replace(/\D/g, "")) || 0) + 1;
    setForm({ ...formFromRecord(record), reference_no: `${record.reference_no.slice(0, 78)} / REV ${number}`,
      progress: "0", owner_id: String(user?.id ?? record.owner_id),
      details: { ...details, guided_contract_version: "1", revision_of_id: String(record.id), revision_number: String(number), revision_reason: "" } });
    const editor = clientPOEditorFromDetail(viewingClientPOQuery.data);
    setClientPO({ ...editor, paymentTerms: editor.paymentTerms.map(term => ({ ...term, status: "planned", invoice_no: "" })) });
    setPendingAttachments([]); setExistingAttachments([]); setEditing(null); setClientPOLoading(false);
    setFormStep(0); setSourceSelection([]); setViewing(null); setFormOpen(true);
  }

  function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (clientPOLoading) {
      toastError("Client PO details are still loading", "Wait for the BOQ and payment schedule to finish loading");
      return;
    }
    if (!form.title.trim() || !form.record_type) {
      toastError("Required fields are missing", "Type and title must be completed");
      setFormStep(0);
      return;
    }
    const payload = toPayload(form);
    if (lockedEdit) {
      const details = isCommercialType(form.record_type) ? {
        ...editing!.details,
        ...Object.fromEntries(["actual_start_date", "actual_completion_date", "warranty_start_date"].map(key => [key, form.details[key] || null])),
      } : { ...editing!.details, ...payload.details };
      saveMutation.mutate({ ...payload, owner_id: editing!.owner_id, details, client_po: undefined });
      return;
    }
    if (!payload.owner_id) payload.owner_id = user?.id ?? null;
    if (isCommercialType(form.record_type) && (!form.project_id || !form.partner_name.trim())) {
      toastError("Identitas belum lengkap", "Pilih proyek dan isi nama pelanggan sebelum menyimpan draf."); setFormStep(0); return;
    }
    if (isCommercialType(form.record_type) && clientPO.lineItems.some(item => !item.item_no.trim() || !item.description.trim() || !item.uom.trim() || Number(item.quantity) <= 0)) {
      toastError("Lengkapi item BOQ", "Isi nomor, deskripsi, jumlah, dan satuan; atau hapus baris yang kosong."); setFormStep(1); return;
    }
    if (isCommercialType(form.record_type) && clientPO.paymentTerms.some(term => !term.trigger.trim() || Number(term.percentage) <= 0)) {
      toastError("Lengkapi termin", "Isi persentase dan kondisi pembayaran; atau hapus termin yang kosong."); setFormStep(2); return;
    }
    if (isCommercialType(form.record_type)) {
      const dppAmount = Number(form.amount || 0);
      const taxAmount = Number(form.details.tax_amount || 0);
      payload.details = {
        ...payload.details,
        tax_amount: taxAmount,
        grand_total: dppAmount + taxAmount,
        net_amount: dppAmount + taxAmount - Number(form.details.withholding_amount || 0),
      };
      if (!lockedEdit) {
        payload.client_po = clientPOToInput(clientPO, dppAmount, taxAmount);
      }
    }
    saveMutation.mutate(payload);
  }

  const records = recordsQuery.data?.items ?? [];
  useEffect(() => {
    const requestedId = searchParams.get("record");
    if (!module || !requestedId || openedRecordRef.current === requestedId) return;
    let cancelled = false;
    operationsApi.get(moduleKey, Number(requestedId)).then(({ data }) => {
      if (!cancelled) { openedRecordRef.current = requestedId; setViewing(data); }
    }).catch(error => { if (!cancelled) toastError("Unable to open record", getErrorMessage(error)); });
    return () => { cancelled = true; };
  }, [module, moduleKey, searchParams]);


  if (modulesQuery.isLoading || !module) {
    if (modulesQuery.isError) {
      return <p className="text-sm text-red-600">{getErrorMessage(modulesQuery.error)}</p>;
    }
    return <TableSkeleton rows={6} cols={7} />;
  }

  const summary = summaryQuery.data;
  const lockedEdit = !!editing && !["draft", "rejected"].includes(editing.status);
  const isClientPOForm = isCommercialType(form.record_type);

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
        <SummaryTile label={moduleKey === "contract_management" ? "Approved contract value (DPP)" : "Total Value"} value={Object.entries(summary?.amounts_by_currency ?? { IDR: summary?.total_amount ?? 0 }).map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") || "IDR 0"} className="col-span-2 lg:col-span-1" />
      </div>

      {moduleKey === "contract_management" && <p className="text-xs text-slate-600">Nilai ringkasan hanya kontrak/PO utama yang disetujui. Proposal, award, draf, dokumen pendukung, dan versi yang digantikan tidak dijumlahkan sebagai kontrak baru.</p>}
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
          <TableSkeleton rows={6} cols={6} />
        ) : recordsQuery.isError ? (
          <div className="p-8 text-center text-sm text-red-600">{getErrorMessage(recordsQuery.error)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center">
            <History size={30} className="mx-auto text-[#C4C0B6] mb-3" />
            <p className="text-sm font-semibold text-[#33445A]">No records found</p>
            <p className="text-xs text-[#94A3B8] mt-1">Create the first {presentation.singular.toLowerCase()} or adjust the filters.</p>
          </div>
        ) : (
          <OperationalRecordList
            records={records}
            module={module}
            projectMap={projectMap}
            currentUserId={user?.id ?? null}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
            onView={setViewing}
            onEdit={openEdit}
            onTransition={(record, action) => { setTransition({ record, action }); setTransitionNote(""); }}
            onDelete={setDeleting}
          />
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => { if (!saveMutation.isPending) setFormOpen(false); }}
        title={editing ? `Edit ${presentation.singular}` : `New ${presentation.singular}`}
        subtitle={lockedEdit ? "Identitas dan nilai dikunci; perubahan komersial menggunakan revisi" : "Simpan draf kapan saja; ajukan setelah data dan penanggung jawab lengkap"}
        size={isClientPOForm ? "xl" : "lg"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
            {isClientPOForm && formStep > 0 && <Button variant="secondary" onClick={() => setFormStep(formStep - 1)}>Sebelumnya</Button>}
            {isClientPOForm && formStep < 5 && <Button variant="secondary" onClick={() => setFormStep(formStep + 1)}>Lanjut → {COMMERCIAL_STEPS[formStep + 1]}</Button>}
            <Button variant="primary" loading={saveMutation.isPending || clientPOLoading} onClick={() => document.getElementById("operational-record-submit")?.click()}>
              {lockedEdit ? "Simpan progres" : "Simpan draf"}
            </Button>
          </>
        }
      >
        <form noValidate onSubmit={submitForm} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isClientPOForm && <nav aria-label="Langkah input" className="sm:col-span-2 flex flex-wrap gap-2">{COMMERCIAL_STEPS.map((step, index) => <button key={step} type="button" aria-current={index === formStep ? "step" : undefined} onClick={() => setFormStep(index)} className={`px-3 py-2 rounded-lg text-xs border ${index === formStep ? "bg-teal-700 text-white border-teal-700" : "bg-white text-slate-600"}`}>{index + 1}. {step}</button>)}</nav>}
          <div className={`${!isClientPOForm || formStep === 0 ? "contents" : "hidden"}`}>
          <button id="operational-record-submit" type="submit" className="hidden" />
          <Select label="Record Type" value={form.record_type} disabled={lockedEdit || !!editing} onChange={event => {
            const recordType = event.target.value;
            setForm({ ...form, record_type: recordType, details: isCommercialType(recordType) ? { guided_contract_version: "1", work_type: "mixed" } : {} });
            setClientPO(emptyClientPOEditor());
            setPendingAttachments([]);
            setExistingAttachments([]);
          }}>
            {Object.entries(module.record_types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input label="Reference Number" placeholder="Nomor dokumen asli; otomatis jika masih draf" value={form.reference_no} disabled={lockedEdit} onChange={event => setForm({ ...form, reference_no: event.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Title" required value={form.title} disabled={lockedEdit} onChange={event => setForm({ ...form, title: event.target.value })} />
          </div>
          <Select label="Project" value={form.project_id} disabled={lockedEdit} onChange={event => { setSourceSelection([]); setForm({ ...form, project_id: event.target.value, details: { ...form.details, source_record_id: "", revision_of_id: "", revision_reason: "" } }); }} placeholder="No project">
            {projects.map(project => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
          </Select>
          <Input label={presentation.partnerLabel} value={form.partner_name} disabled={lockedEdit} onChange={event => setForm({ ...form, partner_name: event.target.value })} />
          <Input label={isClientPOForm ? "Nilai sebelum PPN (dapat diisi pada langkah 3)" : presentation.amountLabel} type="number" min="0" step="0.01" value={form.amount} disabled={lockedEdit} onChange={event => setForm({ ...form, amount: event.target.value })} />
          <Select label="Currency" value={form.currency} disabled={lockedEdit} onChange={event => setForm({ ...form, currency: event.target.value })}>
            <option value="IDR">IDR</option><option value="USD">USD</option><option value="SGD">SGD</option>
          </Select>
          <Input label="Progress (%)" type="number" min="0" max="100" step="0.01" value={form.progress} onChange={event => setForm({ ...form, progress: event.target.value })} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} />
          <Select label="Priority" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as OperationalPriority })}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
          </Select>
          {!isClientPOForm && detailFields.map(field => (
            <Input
              key={field.key}
              label={field.label}
              type={field.type ?? "text"}
              value={form.details[field.key] ?? ""}
              onChange={event => setForm({ ...form, details: { ...form.details, [field.key]: event.target.value } })}
            />
          ))}
          {isClientPOForm && <>
            {["client_contract", "client_purchase_order"].includes(form.record_type) && <Select label="Perhitungan nilai kontrak" value={form.details.value_role ?? "primary"} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, value_role: e.target.value } })}><option value="primary">Dokumen utama — dihitung dalam ringkasan nilai</option><option value="supporting">Dokumen pendukung — nilai sudah dicatat pada PO / kontrak lain</option></Select>}
            <p className="sm:col-span-2 text-xs text-slate-500">Untuk satu paket pekerjaan, pilih satu PO atau kontrak sebagai acuan nilai. Perjanjian pendamping dapat diunggah sebagai lampiran atau dicatat sebagai dokumen pendukung.</p>
            <Select label="Jenis pekerjaan" value={form.details.work_type ?? "mixed"} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, work_type: e.target.value } })}><option value="goods">Barang / pengadaan</option><option value="services">Jasa / repair</option><option value="mixed">Campuran barang & jasa</option></Select>
            <Input label="Tanggal PO / kontrak / proposal" type="date" value={form.details.po_date ?? ""} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, po_date: e.target.value } })} />
            <Input label="Requisition number" value={form.details.requisition_no ?? ""} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, requisition_no: e.target.value } })} />
            <Input label="Revisi dokumen" value={form.details.revision_number ?? ""} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, revision_number: e.target.value } })} />
            <Input label="Referensi proposal / bagian yang dipesan" placeholder="Misalnya Rev 9 A — jasa saja" value={form.details.quotation_reference ?? ""} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, quotation_reference: e.target.value } })} />
            <Select label="Hubungkan proposal / award yang sudah tersimpan" value={form.details.source_record_id ?? ""} disabled={lockedEdit} onChange={e => { setSourceSelection([]); setForm({ ...form, details: { ...form.details, source_record_id: e.target.value } }); }}>
              <option value="">Belum ada / gunakan referensi dokumen</option>
              {(relatedQuery.data ?? []).filter(r => r.id !== editing?.id && ["client_quotation", "contract_award"].includes(r.record_type)).map(r => <option value={r.id} key={r.id}>{r.reference_no} · {r.title}</option>)}
            </Select>
            <Select label="Revisi atas kontrak / PO sebelumnya (opsional)" value={form.details.revision_of_id ?? ""} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, revision_of_id: e.target.value } })}>
              <option value="">Dokumen baru</option>
              {(relatedQuery.data ?? []).filter(r => r.id !== editing?.id && r.record_type === form.record_type && ["approved", "active", "completed"].includes(r.status) && !r.details.superseded_by_id).map(r => <option value={r.id} key={r.id}>{r.reference_no} · {r.title}</option>)}
            </Select>
            {form.details.revision_of_id && <Input label="Alasan revisi" value={form.details.revision_reason ?? ""} disabled={lockedEdit} onChange={e => setForm({ ...form, details: { ...form.details, revision_reason: e.target.value } })} />}
          </>}
          </div>
          {isClientPOForm && <CommercialInput step={formStep} details={form.details} dppAmount={Number(form.amount || 0)} currency={form.currency} value={clientPO}
            onDetailsChange={details => setForm({ ...form, details })} onChange={setClientPO} onDppChange={amount => setForm({ ...form, amount })}
            pendingFiles={pendingAttachments} onPendingFilesChange={setPendingAttachments} existingAttachments={existingAttachments}
            onOpenAttachment={attachment => editing && openAttachment(editing.id, attachment)} onDeleteAttachment={setDeletingAttachment}
            disabled={lockedEdit || clientPOLoading} />}
          {isClientPOForm && formStep === 1 && form.details.source_record_id && !lockedEdit && <div className="sm:col-span-2 border rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold">Pilih item proposal yang benar-benar dipesan</p>
            <p className="text-xs text-slate-600">Periksa kembali jumlah dan harga terhadap PO. Pengambilan item hanya tersedia saat BOQ tujuan masih kosong.</p>
            {sourceQuery.isLoading && <p className="text-xs">Memuat BOQ sumber...</p>}
            {sourceQuery.isError && <p className="text-xs text-red-600">{getErrorMessage(sourceQuery.error)}</p>}
            {sourceQuery.data?.line_items.map(item => <label key={item.id} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={sourceSelection.includes(item.id)} onChange={e => setSourceSelection(e.target.checked ? [...sourceSelection, item.id] : sourceSelection.filter(id => id !== item.id))} />{item.item_no} · {item.description} · {formatMoney(item.line_total, form.currency)}</label>)}
            <Button type="button" size="sm" variant="secondary" disabled={!sourceSelection.length || !!clientPO.lineItems.length} onClick={() => {
              if (!sourceQuery.data) return;
              const selected = sourceQuery.data.line_items.filter(item => sourceSelection.includes(item.id));
              const imported = clientPOEditorFromDetail({ ...sourceQuery.data, line_items: selected, payment_terms: [] });
              setClientPO({ ...clientPO, lineItems: imported.lineItems });
              setForm({ ...form, amount: String(selected.reduce((sum, item) => sum + Number(item.line_total), 0)) });
            }}>Ambil item terpilih</Button>
          </div>}
          {(!isClientPOForm || formStep === 5) && <>
            <WorkflowRouting users={assigneesQuery.data ?? []} details={form.details} ownerId={form.owner_id} onOwnerChange={owner_id => setForm({ ...form, owner_id })} onChange={details => setForm({ ...form, details })} disabled={lockedEdit} />
            {assigneesQuery.isError && <p className="sm:col-span-2 text-xs text-red-600">Gagal memuat penanggung jawab: {getErrorMessage(assigneesQuery.error)}</p>}
            {isClientPOForm && <div className="sm:col-span-2 rounded-lg border p-4 space-y-2 text-sm"><p className="font-semibold">{form.title || "Judul belum diisi"}</p><p>{clientPO.lineItems.length} item BOQ · {clientPO.paymentTerms.length} termin · {existingAttachments.length + pendingAttachments.length} dokumen</p><p>Nilai sebelum PPN: {formatMoney(Number(form.amount || 0), form.currency)}</p>{commercialWarnings(form.details, clientPO, Number(form.amount || 0), form.record_type).map(warning => <p key={warning} className="text-xs text-amber-800">• {warning}</p>)}<p className="text-xs text-slate-600">Simpan draf untuk melanjutkan nanti. Setelah lengkap, buka detail dan pilih Submit agar pemeriksa menerima notifikasi.</p></div>}
            <div className="sm:col-span-2"><Textarea label="Catatan / lingkup yang perlu dikonfirmasi" rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></div>
          </>}

        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.reference_no ?? "Record Details"}
        subtitle={viewing ? module.record_types[viewing.record_type] ?? viewing.record_type : undefined}
        size={isCommercialType(viewing?.record_type) ? "xl" : "lg"}
        footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <div className="space-y-5">
            <WorkflowGuide record={viewing} onAction={action => { setTransition({ record: viewing, action }); setTransitionNote(""); }} onEdit={module.can_approve || viewing.owner_id === user?.id || viewing.created_by === user?.id ? () => { setViewing(null); void openEdit(viewing); } : undefined} />
            <div className="flex flex-wrap gap-2">
              {module.can_approve && !["closed", "cancelled"].includes(viewing.status) && !viewing.details.superseded_by_id && <Button size="sm" onClick={() => {
                setRoutingRecord(viewing); setRoutingDetails(formFromRecord(viewing).details); setRoutingOwner(String(viewing.owner_id ?? viewing.created_by)); setRoutingNote(""); setViewing(null);
              }}>Ganti penanggung jawab</Button>}
              {isCommercialType(viewing.record_type) && ["approved", "active", "completed"].includes(viewing.status) && !viewing.details.superseded_by_id && (module.can_approve || viewing.owner_id === user?.id || viewing.created_by === user?.id) && <Button size="sm" disabled={!viewingClientPOQuery.data || viewingClientPOQuery.isFetching} onClick={() => startRevision(viewing)}>Buat revisi dari dokumen ini</Button>}
              {Number(viewing.details.revision_of_id) > 0 && <Button size="sm" variant="ghost" onClick={() => operationsApi.get(moduleKey, Number(viewing.details.revision_of_id)).then(({ data }) => setViewing(data)).catch(error => toastError("Gagal membuka versi sebelumnya", getErrorMessage(error)))}>Lihat versi sebelumnya</Button>}
              {Number(viewing.details.superseded_by_id) > 0 && <Button size="sm" onClick={() => operationsApi.get(moduleKey, Number(viewing.details.superseded_by_id)).then(({ data }) => setViewing(data)).catch(error => toastError("Gagal membuka revisi terbaru", getErrorMessage(error)))}>Buka revisi terbaru</Button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailValue label="Status"><Badge dot className={STATUS_STYLE[viewing.status]}>{STATUS_LABEL[viewing.status]}</Badge></DetailValue>
              <DetailValue label="Project">{viewing.project_id ? projectMap.get(viewing.project_id) ?? `#${viewing.project_id}` : "-"}</DetailValue>
              <DetailValue label={presentation.partnerLabel}>{viewing.partner_name || "-"}</DetailValue>
              <DetailValue label={presentation.amountLabel}>{formatMoney(viewing.amount, viewing.currency)}</DetailValue>
              <DetailValue label="Progress">{Number(viewing.progress).toFixed(1)}%</DetailValue>
              <DetailValue label="Due Date">{formatDate(viewing.due_date)}</DetailValue>
              <DetailValue label="Priority"><span className={`capitalize ${PRIORITY_STYLE[viewing.priority]}`}>{viewing.priority}</span></DetailValue>
              <DetailValue label="Owner">{viewing.workflow?.owner_name ?? (viewing.owner_id ? `User #${viewing.owner_id}` : "-")}</DetailValue>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] mb-1.5">Title</p>
              <p className="text-sm font-semibold text-[#0C2138]">{viewing.title}</p>
              {viewing.description && <p className="text-[12px] text-[#5E7186] leading-relaxed mt-2 whitespace-pre-wrap">{viewing.description}</p>}
            </div>
            {isCommercialType(viewing.record_type) ? (
              <div>
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] mb-2">Rincian komersial & dokumen</p>
                {viewingClientPOQuery.isError ? (
                  <p className="text-[12px] text-red-600">{getErrorMessage(viewingClientPOQuery.error)}</p>
                ) : (
                  <ClientPODetailPanel
                    detail={viewingClientPOQuery.data}
                    details={viewing.details}
                    currency={viewing.currency}
                    onOpenAttachment={attachment => openAttachment(viewing.id, attachment)}
                  />
                )}
              </div>
            ) : Object.keys(viewing.details).length > 0 && (
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
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{assigneesQuery.data?.find(person => person.id === event.user_id)?.name ?? `User #${event.user_id}`} · {new Date(event.timestamp).toLocaleString("id-ID")}</p>
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
                if ((transition.action === "reject" || (transition.record.details.guided_contract_version && ["complete", "close"].includes(transition.action))) && !transitionNote.trim()) {
                  toastError("Catatan diperlukan", "Jelaskan alasan atau bukti penyelesaian dan tindak lanjutnya.");
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
          Proses <strong>{transition?.record.title}</strong>? Penanggung jawab tahap berikutnya akan menerima notifikasi setelah perubahan disimpan.
        </p>
        <Textarea
          label={transition && (transition.action === "reject" || (transition.record.details.guided_contract_version && ["complete", "close"].includes(transition.action))) ? "Catatan / bukti penyelesaian dan tindak lanjut (wajib)" : "Catatan serah terima (opsional)"}
          value={transitionNote}
          onChange={event => setTransitionNote(event.target.value)}
        />
      </Modal>

      <Modal open={!!routingRecord} onClose={() => { if (!routingMutation.isPending) setRoutingRecord(null); }} title="Serahkan tanggung jawab" subtitle={routingRecord?.reference_no} size="lg"
        footer={<><Button disabled={routingMutation.isPending} onClick={() => setRoutingRecord(null)}>Batal</Button><Button loading={routingMutation.isPending} disabled={!routingOwner || !routingDetails.workflow_reviewer_id || !routingDetails.workflow_executor_id || !routingDetails.workflow_closer_id || routingNote.trim().length < 3} onClick={() => routingMutation.mutate()}>Simpan & beri tahu</Button></>}>
        <WorkflowRouting users={assigneesQuery.data ?? []} details={routingDetails} ownerId={routingOwner} onOwnerChange={setRoutingOwner} onChange={setRoutingDetails} disabled={routingMutation.isPending} />
        <div className="mt-4"><Textarea label="Alasan pergantian penanggung jawab" value={routingNote} onChange={e => setRoutingNote(e.target.value)} /></div>
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
      <ConfirmDialog
        open={!!deletingAttachment}
        onClose={() => setDeletingAttachment(null)}
        onConfirm={() => { if (deletingAttachment) deleteAttachmentMutation.mutate(deletingAttachment); }}
        title="Delete Document"
        message={`Delete ${deletingAttachment?.original_filename ?? "this document"}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteAttachmentMutation.isPending}
      />
    </div>
  );
}
