"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, User, FileText, Clock, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hrisEmployeesApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { cn, fmtDate } from "@/lib/utils";
import type { Employee, EmpDocType } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000";

const TIPE_COLORS: Record<string, string> = {
  Tetap:     "bg-teal-50 text-teal-700 border-teal-200",
  PKWT:      "bg-blue-50 text-blue-700 border-blue-200",
  Outsource: "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_COLORS: Record<string, string> = {
  active:     "bg-green-50 text-green-700 border-green-200",
  probation:  "bg-amber-50 text-amber-700 border-amber-200",
  leave:      "bg-blue-50 text-blue-700 border-blue-200",
  terminated: "bg-red-50 text-red-700 border-red-200",
};

const DOC_TYPES: { value: EmpDocType; label: string }[] = [
  { value: "KTP",      label: "KTP" },
  { value: "NPWP",     label: "NPWP" },
  { value: "BPJS_TK",  label: "BPJS Ketenagakerjaan" },
  { value: "BPJS_KES", label: "BPJS Kesehatan" },
  { value: "IJAZAH",   label: "Ijazah" },
  { value: "SKCK",     label: "SKCK" },
  { value: "OTHER",    label: "Lainnya" },
];

type Tab = "profile" | "documents";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  );
}

export default function EmployeeDetailModal({ open, onClose, employee: emp }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [docType, setDocType] = useState<EmpDocType>("KTP");
  const qc = useQueryClient();

  // Re-fetch fresh detail (includes documents)
  const { data: detail, isLoading } = useQuery({
    queryKey: ["hris", "employee", emp.id],
    queryFn:  () => hrisEmployeesApi.get(emp.id).then((r) => r.data),
    enabled:  open,
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ file }: { file: File }) =>
      hrisEmployeesApi.uploadDocument(emp.id, docType, file),
    onSuccess: () => {
      toastSuccess("Dokumen berhasil diunggah");
      qc.invalidateQueries({ queryKey: ["hris", "employee", emp.id] });
      qc.invalidateQueries({ queryKey: ["hris", "employees"] });
    },
    onError: (e: unknown) =>
      toastError((e as any)?.response?.data?.detail ?? "Gagal mengunggah dokumen"),
  });

  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadDocMutation.mutate({ file });
    e.target.value = "";
  }

  const d = detail ?? emp;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile",   label: "Profil",   icon: User },
    { key: "documents", label: "Dokumen",  icon: FileText },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={d.full_name}
      subtitle={`${d.employee_no} · ${d.department?.name ?? "Tidak ada departemen"}`}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className={cn(TIPE_COLORS[d.tipe])}>{d.tipe}</Badge>
        <Badge className={cn(STATUS_COLORS[d.status])}>
          {d.status === "active" ? "Aktif" :
           d.status === "probation" ? "Probasi" :
           d.status === "leave" ? "Cuti Panjang" : "Berhenti"}
        </Badge>
        {d.grade && (
          <span className="text-xs text-gray-400">{d.grade.name} (L{d.grade.level})</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit mb-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="space-y-0">
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2">
            Data Pribadi
          </p>
          <InfoRow label="NIK" value={d.nik} />
          <InfoRow label="NPWP" value={d.npwp} />
          <InfoRow label="Email" value={d.email} />
          <InfoRow label="Telepon" value={d.phone} />
          <InfoRow label="Site" value={d.site} />

          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">
            Kepegawaian
          </p>
          <InfoRow label="Tanggal Masuk" value={d.join_date ? fmtDate(d.join_date) : null} />
          <InfoRow label="Tanggal Selesai" value={d.end_date ? fmtDate(d.end_date) : null} />
          <InfoRow label="Departemen" value={d.department?.name} />
          <InfoRow label="Grade" value={d.grade ? `${d.grade.name} (Level ${d.grade.level})` : null} />
          <InfoRow label="Akun Sistem" value={d.user?.full_name} />

          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">
            BPJS & Bank
          </p>
          <InfoRow label="BPJS TK No." value={d.bpjs_tk_no} />
          <InfoRow label="BPJS Kes No." value={d.bpjs_kes_no} />
          <InfoRow label="Bank" value={d.bank_name} />
          <InfoRow label="No. Rekening" value={d.bank_account} />
        </div>
      )}

      {/* ── Documents tab ───────────────────────────────────────────────────── */}
      {tab === "documents" && (
        <div className="space-y-4">
          {/* Upload form */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-3">Unggah Dokumen Baru</p>
            <div className="flex gap-3 items-center flex-wrap">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as EmpDocType)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              <label className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-all",
                "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
                uploadDocMutation.isPending && "opacity-50 pointer-events-none"
              )}>
                <Upload size={12} />
                {uploadDocMutation.isPending ? "Mengunggah…" : "Pilih File"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleDocUpload}
                />
              </label>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Format: PDF, JPG, PNG · Maks 10MB</p>
          </div>

          {/* Document list */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !d.documents?.length ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Belum ada dokumen yang diunggah
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {d.documents.map((doc) => {
                const label = DOC_TYPES.find((dt) => dt.value === doc.doc_type)?.label ?? doc.doc_type;
                return (
                  <div key={doc.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <a
                      href={`${BASE_URL}${doc.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Buka
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
