"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulingApi, scheduleTime, clarificationLabels, type Clarification } from "@/lib/api/scheduling";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ClarificationPanel() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Clarification | null>(null);
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState("");
  const query = useQuery({ queryKey: ["attendance-clarifications"], queryFn: () => schedulingApi.clarifications().then(r => r.data) });
  const review = useMutation({ mutationFn: () => schedulingApi.review(selected!.id, approve, note.trim()), onSuccess: () => {
    setSelected(null); void qc.invalidateQueries({ queryKey: ["attendance-clarifications"] });
    void qc.invalidateQueries({ queryKey: ["hris"] }); void qc.invalidateQueries({ queryKey: ["my-schedule"] });
  } });
  return <div className="space-y-3">
    <h2 className="font-semibold">Klarifikasi absensi</h2>
    {query.isLoading && <p>Memuat klarifikasi…</p>}
    {query.error && <p role="alert" className="text-red-600">{getErrorMessage(query.error)}</p>}
    {query.data?.length === 0 && <p className="text-sm text-gray-500">Belum ada pengajuan klarifikasi.</p>}
    {query.data?.map(c => <div key={c.id} className="border rounded-xl bg-white p-4 text-sm space-y-2">
      <p className="font-semibold">{c.employee_name} · {c.attendance_date}</p>
      <p>{c.reason === "overtime" ? "Lembur" : c.reason === "forgot" ? "Lupa absen pulang" : "Lainnya"} · {clarificationLabels[c.status]}</p>
      <p>Masuk: {scheduleTime(c.clock_in, c.schedule?.timezone)}<br />Pulang yang diajukan: {scheduleTime(c.actual_clock_out, c.schedule?.timezone)} ({c.schedule?.timezone})</p>
      {c.schedule && <p>Jadwal pulang: {scheduleTime(c.schedule.ends_at, c.schedule.timezone)}</p>}
      <p className="whitespace-pre-wrap">{c.note}</p>{c.review_note && <p>Keputusan HR: {c.review_note}</p>}
      {c.status === "pending" && <Button size="sm" onClick={() => { setSelected(c); setApprove(true); setNote(""); review.reset(); }}>Tinjau</Button>}
    </div>)}
    <Modal open={!!selected} onClose={() => !review.isPending && setSelected(null)} title="Tinjau klarifikasi">
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); review.mutate(); }}>
        <p className="text-sm">{selected?.employee_name} · {selected?.attendance_date}</p>
        {selected?.reason === "overtime" && <p className="text-sm text-amber-700">Persetujuan ini juga menyetujui lembur berdasarkan waktu pulang yang diajukan.</p>}
        <label className="block text-sm">Keputusan<select className="w-full border rounded p-2" value={approve ? "yes" : "no"} onChange={e => setApprove(e.target.value === "yes")}><option value="yes">Setujui</option><option value="no">Tolak, minta perbaikan</option></select></label>
        <label className="block text-sm">Catatan keputusan<textarea required minLength={3} maxLength={2000} className="w-full border rounded p-2" value={note} onChange={e => setNote(e.target.value)} /></label>
        {review.error && <p role="alert" className="text-sm text-red-600">{getErrorMessage(review.error)}</p>}
        <Button type="submit" loading={review.isPending}>Simpan keputusan</Button>
      </form>
    </Modal>
  </div>;
}
