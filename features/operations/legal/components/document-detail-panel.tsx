"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, PenLine, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { legalApi } from "@/lib/api";
import { useAuth, useRole } from "@/lib/auth-context";
import type { LegalDocument } from "@/lib/types";
import { fmtDate, formatCurrency, getErrorMessage } from "@/lib/utils";
import { DOC_TYPE_LABELS, StatusBadge } from "./legal-status";
import { NewDocModal } from "./new-document-modal";

export function DetailPanel({
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
