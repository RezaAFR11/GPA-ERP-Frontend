"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, ChevronLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { hrisMeApi, hrisOvertimeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn, fmtDate, toLocalDateInputValue } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";

const STATUS_LABEL: Record<string, string> = {
  draft:     "Draft",
  submitted: "Diajukan",
  approved:  "Disetujui",
  rejected:  "Ditolak",
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-teal-50 text-teal-700 border-teal-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
};

function NewOvertimeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = toLocalDateInputValue();
  const [form, setForm] = useState({ date: today, planned_hours: "2", reason: "" });
  const plannedHours = Number(form.planned_hours);
  const canSubmit = Boolean(
    form.date
    && form.reason.trim()
    && Number.isFinite(plannedHours)
    && plannedHours > 0
    && plannedHours <= 12
  );

  const submitMut = useMutation({
    mutationFn: () => hrisOvertimeApi.submit({
      date: form.date,
      planned_hours: parseFloat(form.planned_hours),
      reason: form.reason,
    }),
    onSuccess: () => {
      toastSuccess("Pengajuan lembur berhasil dikirim");
      qc.invalidateQueries({ queryKey: ["hris", "me", "overtime"] });
      onClose();
      setForm({ date: today, planned_hours: "2", reason: "" });
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Lembur">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Lembur</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rencana Jam Lembur</label>
            <input type="number" min={0.5} max={12} step={0.5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.planned_hours} onChange={e => setForm(f => ({ ...f, planned_hours: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Alasan / Pekerjaan yang Dilakukan</label>
          <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            maxLength={1000}
            placeholder="Jelaskan pekerjaan yang akan/telah dilakukan saat lembur..." />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <strong>Catatan:</strong> Pengajuan lembur perlu disetujui GA/HR. Lembur yang dikerjakan tanpa persetujuan tidak dapat diklaim.
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" loading={submitMut.isPending}
            className="bg-teal-700 hover:bg-teal-600 border-teal-700"
            disabled={!canSubmit || submitMut.isPending}
            onClick={() => submitMut.mutate()}>Kirim Pengajuan</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MyOvertimePage() {
  const [showNew, setShowNew] = useState(false);

  const { data: requests = [], error, isError, isLoading, refetch } = useQuery({
    queryKey: ["hris", "me", "overtime"],
    queryFn: () => hrisMeApi.getOvertimeRequests().then((r) => r.data),
  });

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {/* Back link */}
      <Link href="/hris/me" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit">
        <ChevronLeft size={15} />
        Kembali ke Portal
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengajuan Lembur</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ajukan dan pantau status permohonan lembur Anda</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          onClick={() => setShowNew(true)}>
          Ajukan Lembur
        </Button>
      </div>

      {/* List */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : isError ? (
          <div className="p-4">
            <QueryErrorState error={error} onRetry={() => refetch()} compact />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Belum ada pengajuan lembur</p>
            <button onClick={() => setShowNew(true)}
              className="mt-3 text-sm text-teal-600 hover:underline">
              Ajukan lembur pertama Anda →
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {requests.map((req) => (
              <li key={req.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{fmtDate(req.date)}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-sm text-gray-600">{req.planned_hours} jam</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.reason}</p>
                    {req.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <XCircle size={11} />
                        {req.rejection_reason}
                      </p>
                    )}
                    {req.status === "approved" && req.approved_at && (
                      <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={11} />
                        Disetujui {fmtDate(req.approved_at)}
                      </p>
                    )}
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", STATUS_COLORS[req.status])}>
                    {STATUS_LABEL[req.status] ?? req.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NewOvertimeModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
