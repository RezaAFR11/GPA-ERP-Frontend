"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Download, Send, CheckCircle2, XCircle,
  Clock, PenLine, Trash2, Eye, AlertCircle, RefreshCw, Search,
} from "lucide-react";
import { legalApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { Pagination } from "@/components/ui/pagination";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { DOC_TEMPLATES } from "@/lib/doc-templates";
import { cn, fmtDate, formatCurrency, getErrorMessage } from "@/lib/utils";
import { useAuth, useRole } from "@/lib/auth-context";
import type { DocStatus, DocType, LegalDocument, LegalDocCreate } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocType, string> = {
  proposal:     "Surat Penawaran",
  berita_acara: "Berita Acara",
  surat_jalan:  "Surat Jalan",
  other:        "Surat Lainnya",
};

const STATUS_CONFIG: Record<DocStatus, { label: string; icon: React.ElementType; cls: string }> = {
  draft:     { label: "Draft",     icon: PenLine,      cls: "bg-gray-100 text-gray-600 border-gray-200" },
  submitted: { label: "Menunggu",  icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200" },
  signed:    { label: "Ditandatangani", icon: CheckCircle2, cls: "bg-green-50 text-green-700 border-green-200" },
  rejected:  { label: "Ditolak",   icon: XCircle,      cls: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DocStatus }) {
  const cfg  = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
      cfg.cls
    )}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in",
      ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {msg}
    </div>
  );
}

// ─── New Document Modal ───────────────────────────────────────────────────────
function NewDocModal({
  doc, onClose, onSaved,
}: { doc?: LegalDocument; onClose: () => void; onSaved: (saved: LegalDocument) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<LegalDocCreate>({
    doc_number:        doc?.doc_number ?? "",
    reference_number:  doc?.reference_number ?? "",
    doc_type:          doc?.doc_type ?? "proposal",
    title:             doc?.title ?? "",
    subject:           doc?.subject ?? "",
    body:              doc?.body ?? DOC_TEMPLATES["proposal"],
    recipient_name:    doc?.recipient_name ?? "",
    recipient_company: doc?.recipient_company ?? "",
    recipient_address: doc?.recipient_address ?? "",
    closing:           doc?.closing ?? "",
    quoted_amount:     doc?.quoted_amount ?? undefined,
    project_id:        doc?.project_id ?? undefined,
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => doc ? legalApi.update(doc.id, form) : legalApi.create(form),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ["legal"] });
      onSaved(data);
    },
    onError:   (e) => setError(getErrorMessage(e)),
  });

  function set(k: keyof LegalDocCreate, v: string | number | undefined) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function changeDocType(type: DocType) {
    setForm((f) => ({ ...f, doc_type: type, body: DOC_TEMPLATES[type] }));
  }

  function resetTemplate() {
    setForm((f) => ({ ...f, body: DOC_TEMPLATES[f.doc_type] }));
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText size={15} className="text-primary" />
            </div>
            <h2 className="text-base font-bold text-gray-900">{doc ? "Edit Draft Dokumen" : "Buat Dokumen Baru"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Row 1: Type + Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Jenis Dokumen</label>
              <select
                value={form.doc_type}
                onChange={(e) => changeDocType(e.target.value as DocType)}
                className={inputCls}
              >
                {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Judul Dokumen</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)}
                placeholder="Penawaran Jasa Pemasangan..." className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nomor Surat</label>
              <input value={form.doc_number ?? ""} onChange={(e) => set("doc_number", e.target.value)}
                placeholder="Auto jika dikosongkan" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reference Number</label>
              <input value={form.reference_number ?? ""} onChange={(e) => set("reference_number", e.target.value)}
                placeholder="PO / RFQ / ref klien" className={inputCls} />
            </div>
          </div>

          {/* Row 2: Subject */}
          <div>
            <label className={labelCls}>Perihal (Subject)</label>
            <input value={form.subject} onChange={(e) => set("subject", e.target.value)}
              placeholder="Penawaran Harga Pekerjaan..." className={inputCls} />
          </div>

          {/* Row 3: Recipient */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Kepada (Nama)</label>
              <input value={form.recipient_name ?? ""} onChange={(e) => set("recipient_name", e.target.value)}
                placeholder="Bpk. / Ibu. ..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Perusahaan / Instansi</label>
              <input value={form.recipient_company ?? ""} onChange={(e) => set("recipient_company", e.target.value)}
                placeholder="PT ..." className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Alamat Penerima</label>
            <input value={form.recipient_address ?? ""} onChange={(e) => set("recipient_address", e.target.value)}
              placeholder="Jl. ..." className={inputCls} />
          </div>

          {/* Rich text body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls + " mb-0"}>Isi Surat</label>
              <button
                type="button"
                onClick={resetTemplate}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition-colors"
                title="Reset ke template awal"
              >
                <RefreshCw size={11} /> Reset template
              </button>
            </div>
            <RichTextEditor
              content={form.body}
              onChange={(html) => set("body", html)}
              placeholder="Tulis isi surat di sini..."
              minHeight="220px"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Ganti teks dalam <span className="font-mono bg-gray-100 px-1 rounded">[kurung kotak]</span> dengan isi yang sebenarnya.
            </p>
          </div>

          {/* Quoted amount */}
          {form.doc_type === "proposal" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nilai Penawaran (Rp)</label>
                <input
                  type="number"
                  value={form.quoted_amount ?? ""}
                  onChange={(e) => set("quoted_amount", e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Batal</Button>
          <Button
            size="sm"
            icon={<Plus size={13} />}
            disabled={save.isPending || !form.title || !form.subject || !form.body}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Menyimpan..." : "Simpan Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  doc, onClose, onUpdated, showToast,
}: {
  doc: LegalDocument;
  onClose: () => void;
  onUpdated: (updated: LegalDocument) => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { canSign } = useRole();
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);

  function refreshLegalQueries() {
    qc.invalidateQueries({ queryKey: ["legal"] });
    qc.invalidateQueries({ queryKey: ["legal-pending-count"] });
  }

  const submit = useMutation({
    mutationFn: () => legalApi.submit(doc.id),
    onSuccess: ({ data }) => {
      refreshLegalQueries();
      onUpdated(data);
      showToast("Dokumen dikirim untuk ditandatangani", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const sign = useMutation({
    mutationFn: () => legalApi.sign(doc.id),
    onSuccess: ({ data }) => {
      refreshLegalQueries();
      onUpdated(data);
      showToast("Dokumen ditandatangani", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const reject = useMutation({
    mutationFn: () => legalApi.reject(doc.id, rejectNote),
    onSuccess: ({ data }) => {
      refreshLegalQueries();
      onUpdated(data);
      showToast("Dokumen ditolak", true);
      setShowRejectInput(false);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const del = useMutation({
    mutationFn: () => legalApi.delete(doc.id),
    onSuccess: () => { refreshLegalQueries(); onClose(); showToast("Dokumen dihapus", true); },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  function downloadPdf() {
    legalApi.downloadPdf(doc.id)
      .then(({ data: blob }) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${(doc.doc_number ?? `doc-${doc.id}`).replace(/\//g, "-")}.pdf`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((err) => showToast(getErrorMessage(err), false));
  }

  const isOwner   = user?.id === doc.created_by;
  const isDraft   = doc.status === "draft";
  const isPending = doc.status === "submitted";
  const isSigned  = doc.status === "signed";
  const isRejected = doc.status === "rejected";
  const canManageDocument = isOwner || user?.role.name === "SUPER_ADMIN" || user?.role.name === "MD";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <ConfirmActionModal
        open={showDeleteConfirm}
        title="Delete Document"
        message={`Delete document ${doc.doc_number || doc.title}?`}
        confirmLabel="Delete"
        pending={del.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => del.mutate()}
      />
      {editing && (
        <NewDocModal
          doc={doc}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
            showToast("Draft diperbarui", true);
          }}
        />
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                {DOC_TYPE_LABELS[doc.doc_type]}
              </span>
              <StatusBadge status={doc.status} />
            </div>
            <p className="text-sm font-bold text-gray-900">{doc.title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{doc.doc_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {/* Rejection note */}
          {doc.rejection_note && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
              <XCircle size={13} className="mt-0.5 shrink-0" />
              <div><span className="font-semibold">Alasan penolakan: </span>{doc.rejection_note}</div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <p><span className="text-gray-400">Nomor:</span> <span className="font-mono font-medium">{doc.doc_number || "—"}</span></p>
              {doc.reference_number && <p><span className="text-gray-400">Ref:</span> <span className="font-mono font-medium">{doc.reference_number}</span></p>}
              <p><span className="text-gray-400">Perihal:</span> <span className="font-medium">{doc.subject}</span></p>
              {doc.recipient_name && <p><span className="text-gray-400">Kepada:</span> <span className="font-medium">{doc.recipient_name}</span></p>}
              {doc.recipient_company && <p><span className="text-gray-400">Instansi:</span> <span className="font-medium">{doc.recipient_company}</span></p>}
            </div>
            <div className="space-y-1.5">
              <p><span className="text-gray-400">Dibuat:</span> <span className="font-medium">{fmtDate(doc.created_at)}</span></p>
              <p><span className="text-gray-400">Oleh:</span> <span className="font-medium">{doc.creator?.full_name ?? "—"}</span></p>
              {doc.quoted_amount && <p><span className="text-gray-400">Nilai:</span> <span className="font-semibold text-primary">{formatCurrency(doc.quoted_amount, "Rp ")}</span></p>}
              {isSigned && doc.signer && <p><span className="text-gray-400">Ditandatangani:</span> <span className="font-semibold text-green-700">{doc.signer.full_name}</span></p>}
            </div>
          </div>

          {/* Body preview */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Isi Surat</p>
            <div
              className="text-xs text-gray-700 leading-relaxed prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_h2]:font-bold [&_h3]:font-semibold [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: doc.body }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          {/* Reject input */}
          {showRejectInput && (
            <div className="flex gap-2">
              <input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Alasan penolakan..."
                className="flex-1 border border-red-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-200"
              />
              <Button size="sm" variant="danger"
                disabled={rejectNote.length < 5 || reject.isPending}
                onClick={() => reject.mutate()}>
                Tolak
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download PDF — always visible */}
            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={downloadPdf}>
              {isSigned ? "Unduh PDF Resmi" : "Unduh Draft PDF"}
            </Button>

            {(isDraft || isRejected) && canManageDocument && (
              <Button size="sm" variant="secondary" icon={<PenLine size={13} />} onClick={() => setEditing(true)}>
                {isRejected ? "Revisi Dokumen" : "Edit Draft"}
              </Button>
            )}

            {/* Staff/creator: submit */}
            {isDraft && (isOwner || user?.role.name === "SUPER_ADMIN") && (
              <Button size="sm" icon={<Send size={13} />}
                disabled={submit.isPending}
                onClick={() => submit.mutate()}>
                Kirim untuk Ditandatangani
              </Button>
            )}

            {/* MD/PM: sign or reject */}
            {isPending && canSign && (
              <>
                <Button size="sm" icon={<CheckCircle2 size={13} />}
                  disabled={sign.isPending}
                  onClick={() => sign.mutate()}>
                  Tandatangani
                </Button>
                <Button size="sm" variant="danger" icon={<XCircle size={13} />}
                  onClick={() => setShowRejectInput((v) => !v)}>
                  Tolak
                </Button>
              </>
            )}

            {/* Delete draft or rejected document */}
            {(isDraft || isRejected) && canManageDocument && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-auto text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} /> Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LegalPage() {
  const [showNew,  setShowNew]  = useState(false);
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  const [filter,   setFilter]   = useState<DocStatus | "all">("all");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const { data: legalData, isLoading } = useQuery({
    queryKey: ["legal", filter, search, page],
    queryFn:  () => legalApi.list({
      ...(filter !== "all" ? { status: filter } : {}),
      ...(search ? { search } : {}),
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    }).then((r) => r.data),
  });
  const docs       = legalData?.items ?? [];
  const totalPages = Math.ceil((legalData?.total ?? 0) / PAGE_SIZE);
  const paged      = docs;

  // Separate lightweight query for the pending badge count (all statuses)
  const { data: pendingData } = useQuery({
    queryKey: ["legal-pending-count"],
    queryFn:  () => legalApi.list({ status: "submitted", limit: 1 }).then((r) => r.data.total),
    staleTime: 60_000,
  });
  const pendingCount = pendingData ?? 0;

  const { canSign } = useRole();

  return (
    <div className="space-y-5 animate-fade-in">
      {toast    && <Toast {...toast} />}
      {showNew  && <NewDocModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); showToast("Draft berhasil disimpan", true); }} />}
      {selected && <DetailPanel doc={selected} onClose={() => setSelected(null)} onUpdated={setSelected} showToast={showToast} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Legal &amp; Proposals</h1>
          <p className="text-sm text-gray-400 mt-0.5">Surat penawaran, berita acara &amp; dokumen resmi</p>
        </div>
        <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>
          Buat Dokumen
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nomor, judul, instansi…"
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 w-60"
          />
        </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {([
          { key: "all",       label: "Semua",           count: filter === "all" ? (legalData?.total ?? 0) : 0 },
          { key: "draft",     label: "Draft",           count: filter === "draft" ? (legalData?.total ?? 0) : 0 },
          { key: "submitted", label: "Menunggu",        count: pendingCount },
          { key: "signed",    label: "Ditandatangani",  count: filter === "signed" ? (legalData?.total ?? 0) : 0 },
          { key: "rejected",  label: "Ditolak",         count: filter === "rejected" ? (legalData?.total ?? 0) : 0 },
        ] as { key: DocStatus | "all"; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              filter === key ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none",
                filter === key
                  ? (key === "submitted" ? "bg-amber-400 text-gray-900" : "bg-white/20 text-white")
                  : "bg-gray-100 text-gray-500"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>

      {/* MD/PM action prompt */}
      {canSign && pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{pendingCount} dokumen</span> menunggu tanda tangan Anda.
          </p>
          <button
            onClick={() => { setFilter("submitted"); setPage(1); }}
            className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse h-[72px]"><span /></Card>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <Card className="py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600">Belum ada dokumen</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {search ? "Tidak ada dokumen yang cocok dengan pencarian." : filter === "all" ? 'Klik "Buat Dokumen" untuk membuat surat pertama.' : "Tidak ada dokumen dengan status ini."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {paged.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              className="w-full text-left bg-white rounded-xl border border-gray-200 px-4 py-3.5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  doc.status === "signed"    ? "bg-green-50"  :
                  doc.status === "submitted" ? "bg-amber-50"  :
                  doc.status === "rejected"  ? "bg-red-50"    : "bg-gray-100"
                )}>
                  <FileText size={15} className={cn(
                    doc.status === "signed"    ? "text-green-600" :
                    doc.status === "submitted" ? "text-amber-600" :
                    doc.status === "rejected"  ? "text-red-500"   : "text-gray-400"
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono">{doc.doc_number}</span>
                    {doc.recipient_company && <span> · {doc.recipient_company}</span>}
                    <span> · {fmtDate(doc.created_at)}</span>
                    {doc.creator && <span> · {doc.creator.full_name}</span>}
                  </p>
                </div>

                {/* Amount */}
                {doc.quoted_amount != null && (
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Nilai</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(doc.quoted_amount, "Rp ")}</p>
                  </div>
                )}

                <Eye size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0 ml-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={legalData?.total}
          pageSize={PAGE_SIZE}
        />
      )}
    </div>
  );
}
