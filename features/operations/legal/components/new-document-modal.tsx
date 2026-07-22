"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AlertCircle, FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { legalApi } from "@/lib/api";
import type { DocType, LegalDocCreate, LegalDocument } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";
import { DOC_TYPE_LABELS } from "./legal-status";
import { DOC_TEMPLATES } from "../lib/doc-templates";

// Tiptap is loaded only while the create/edit dialog is in use.
const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
    ),
  },
);

export function NewDocModal({
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
