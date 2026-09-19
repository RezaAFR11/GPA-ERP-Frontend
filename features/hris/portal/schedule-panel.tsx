"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulingApi, scheduleTime, clarificationLabels, type UnresolvedAttendance } from "@/lib/api/scheduling";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getErrorMessage } from "@/lib/utils";
import { PushReminderButton } from "./push-reminder-button";

const reasons: Record<string, string> = { forgot: "Lupa absen pulang", overtime: "Lembur", other: "Lainnya" };
const input = "w-full border rounded-lg px-3 py-2 text-sm bg-white";
const offsets: Record<string, string> = { "Asia/Jakarta": "+07:00", "Asia/Makassar": "+08:00", "Asia/Jayapura": "+09:00" };

export function SchedulePanel() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<UnresolvedAttendance | null>(null);
  const [reason, setReason] = useState("forgot");
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["my-schedule"], queryFn: () => schedulingApi.mine().then(r => r.data), refetchInterval: 30000 });
  const submit = useMutation({ mutationFn: () => {
    if (!selected || !actual) throw new Error("Isi tanggal dan jam pulang sebenarnya.");
    const offset = offsets[selected.schedule_snapshot.timezone];
    if (!offset) throw new Error("Zona waktu tidak didukung. Hubungi HR.");
    return schedulingApi.clarify(selected.id, { reason, note: note.trim(), actual_clock_out: `${actual}:00${offset}` });
  }, onSuccess: () => { setSelected(null); void qc.invalidateQueries({ queryKey: ["my-schedule"] });
    void qc.invalidateQueries({ queryKey: ["hris-me-attendance"] });
  }, onError: e => setError(getErrorMessage(e)) });
  if (query.isLoading) return <p className="text-sm">Memuat jadwal kerja…</p>;
  if (query.error) return <div className="text-sm text-red-600">{getErrorMessage(query.error)} <Button size="sm" onClick={() => query.refetch()}>Coba lagi</Button></div>;
  const data = query.data;
  const current = data?.current;
  return <section className="border rounded-xl bg-white p-4 space-y-3">
    <h2 className="font-semibold">Jadwal kerja Anda</h2>
    {current ? <div className="text-sm space-y-1"><p>{current.shift_name} · {current.location_name}</p>
      <p>{scheduleTime(current.starts_at, current.timezone)} → {scheduleTime(current.ends_at, current.timezone)}</p>
      <p className="text-xs text-gray-500">{current.timezone} · toleransi {current.grace_minutes} menit · istirahat {scheduleTime(current.break_starts_at, current.timezone)}–{scheduleTime(current.break_ends_at, current.timezone)}</p>
    </div> : <p className="text-sm text-amber-700">Tidak ada shift yang sedang dibuka. Lihat jadwal berikutnya atau hubungi HR. Absen masuk dibuka 2 jam sebelum shift.</p>}
    <PushReminderButton />
    <details className="text-sm"><summary className="cursor-pointer">Jadwal 31 hari ke depan</summary><div className="space-y-2 mt-2">
      {data?.upcoming.map(s => <p key={s.starts_at}>{s.shift_name} · {s.location_name}<br />{scheduleTime(s.starts_at, s.timezone)} → {scheduleTime(s.ends_at, s.timezone)} <span className="text-xs">({s.timezone})</span></p>)}
      {!data?.upcoming.length && <p>Belum ada jadwal. Hubungi HR.</p>}
    </div></details>
    {!!data?.unresolved.length && <div className="rounded-lg bg-amber-50 p-3 space-y-3">
      <h3 className="text-sm font-semibold">Klarifikasi absensi wajib dilengkapi</h3>
      {data.unresolved.map(r => <div key={r.id} className="text-sm border-t border-amber-200 pt-2">
        <p>{r.date} · {r.schedule_snapshot.shift_name}</p><p>{clarificationLabels[r.clarification_status]}</p>
        {r.clarification_status !== "pending" && <Button size="sm" onClick={() => { setSelected(r); setReason("forgot"); setActual(""); setNote(""); setError(""); }}>Kirim klarifikasi</Button>}
      </div>)}
    </div>}
    {!!data?.clarifications.length && <details className="text-sm"><summary>Riwayat klarifikasi</summary>{data.clarifications.map(c => <div key={c.id} className="border-t py-2"><p>{reasons[c.reason]} · {clarificationLabels[c.status]}</p><p>{c.note}</p>{c.review_note && <p className="text-gray-500">Catatan HR: {c.review_note}</p>}</div>)}</details>}
    <Modal open={!!selected} onClose={() => !submit.isPending && setSelected(null)} title="Klarifikasi absen pulang">
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit.mutate(); }}>
        <p className="text-sm">Isi waktu pulang sebenarnya sesuai zona waktu <strong>{selected?.schedule_snapshot.timezone}</strong>. Penutupan otomatis bukan bukti waktu pulang.</p>
        <label className="block text-sm">Alasan<select className={input} value={reason} onChange={e => setReason(e.target.value)}>{Object.entries(reasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block text-sm">Tanggal dan jam pulang sebenarnya<input type="datetime-local" required className={input} value={actual} onChange={e => setActual(e.target.value)} /></label>
        <label className="block text-sm">Catatan penjelasan<textarea required minLength={5} maxLength={2000} className={input} value={note} onChange={e => setNote(e.target.value)} /></label>
        <p className="text-xs text-gray-500">Koreksi dan lembur baru diterapkan setelah disetujui HR atau Super Admin. Pengajuan yang ditolak dapat diperbaiki dan dikirim ulang.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={submit.isPending}>Kirim ke HR</Button>
      </form>
    </Modal>
  </section>;
}
