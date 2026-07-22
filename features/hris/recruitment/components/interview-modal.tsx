"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { hrisRecruitmentApi } from "@/lib/api";
import type { Applicant, InterviewResult } from "@/lib/types";

function defaultInterviewTime(): string {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function InterviewModal({
  applicant, onClose, onUpdated,
}: {
  applicant: Applicant | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(defaultInterviewTime);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["hris", "interviews", applicant?.id],
    queryFn: () => hrisRecruitmentApi.listInterviews(applicant!.id).then(r => r.data),
    enabled: !!applicant && applicant.stage === "INTERVIEW",
  });
  const pending = interviews.find(interview => interview.result === "PENDING");
  const needsSchedule = applicant?.stage === "SCREENING" ||
    (applicant?.stage === "INTERVIEW" && !pending && !isLoading);

  function close() {
    setErr(null);
    setNotes("");
    onClose();
  }

  async function schedule() {
    if (!applicant || !scheduledAt) return;
    setSaving(true);
    setErr(null);
    try {
      await hrisRecruitmentApi.createInterview({
        applicant_id: applicant.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes || undefined,
      });
      onUpdated();
      close();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menjadwalkan wawancara");
    } finally {
      setSaving(false);
    }
  }

  async function recordResult(result: Exclude<InterviewResult, "PENDING">) {
    if (!pending) return;
    setSaving(true);
    setErr(null);
    try {
      await hrisRecruitmentApi.updateInterview(pending.id, result, notes || undefined);
      onUpdated();
      close();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan hasil wawancara");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!applicant}
      onClose={close}
      title={needsSchedule ? "Jadwalkan Wawancara" : "Hasil Wawancara"}
      subtitle={applicant?.full_name}
      size="sm"
    >
      <div className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : needsSchedule ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal dan Waktu</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="ghost" onClick={close}>Batal</Button>
              <Button onClick={schedule} disabled={saving || !scheduledAt}
                className="bg-green-700 hover:bg-green-800 text-white">
                <CalendarClock size={14} className="mr-1.5" />
                {saving ? "Menyimpan…" : "Jadwalkan"}
              </Button>
            </div>
          </>
        ) : pending ? (
          <>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Jadwal</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {new Date(pending.scheduled_at).toLocaleString("id-ID")}
              </p>
              {pending.notes && <p className="text-xs text-gray-500 mt-1">{pending.notes}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Hasil</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => recordResult("HOLD")} disabled={saving}>Tunda</Button>
              <Button onClick={() => recordResult("FAIL")} disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white">Tidak Lulus</Button>
              <Button onClick={() => recordResult("PASS")} disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white">Lulus</Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Tidak ada wawancara yang menunggu hasil.</p>
        )}
      </div>
    </Modal>
  );
}
