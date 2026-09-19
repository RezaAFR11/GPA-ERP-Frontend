"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hrisEmployeesApi, hrisWorkGroupsApi, hrisWorkLocationApi } from "@/lib/api";
import { schedulingApi, scheduleTime, type Shift } from "@/lib/api/scheduling";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const input = "w-full border rounded-lg px-3 py-2 text-sm bg-white";
const defaults = { name: "", start_time: "08:00", break_start_minutes: 240, grace_minutes: 15, reminder_minutes: 10, is_active: true };
const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
function minutes(value: string) { const [h, m] = value.split(":").map(Number); return (h || 0) * 60 + (m || 0); }
function clockAfter(start: string, delta: number) {
  const total = (minutes(start) + delta) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
const entityLabels: Record<string, string> = { WorkShift: "Template shift", ShiftAssignment: "Penugasan jadwal", WeeklySchedule: "Jadwal mingguan", AttendanceClarification: "Klarifikasi", AttendanceRecord: "Absensi", WorkLocation: "Lokasi kerja" };
const actionLabels: Record<string, string> = { DEACTIVATE: "Dinonaktifkan", CREATE: "Dibuat", UPDATE: "Diubah", DELETE: "Dibatalkan", SUBMIT: "Diajukan", REVIEW: "Ditinjau", AUTO_CLOSE: "Ditutup otomatis", CLOCK_IN: "Absen masuk", CLOCK_OUT: "Absen pulang", CLARIFICATION_REVIEW: "Keputusan klarifikasi" };
function auditDetails(value: unknown) {
  if (!value || typeof value !== "object") return "—";
  const data = value as Record<string, unknown>;
  const snapshot = (data.snapshot ?? data.schedule_snapshot) as Record<string, unknown> | undefined;
  const labels: Record<string, string> = { name: "Nama", date: "Tanggal", start_time: "Jam masuk", grace_minutes: "Toleransi (menit)", reminder_minutes: "Pengingat (menit)", break_start_minutes: "Mulai istirahat (menit setelah masuk)", is_active: "Aktif", note: "Catatan", review_note: "Catatan HR", reason: "Alasan", status: "Status", actual_clock_out: "Pulang sebenarnya", clock_in: "Masuk", clock_out: "Pulang", deadline: "Batas penutupan", processed_at: "Diproses", clarification_status: "Status klarifikasi" };
  const values = Object.entries(labels).filter(([key]) => data[key] != null).map(([key, label]) => `${label}: ${String(data[key])}`);
  if (Array.isArray(data.weekdays)) values.push(`Hari kerja: ${data.weekdays.map(day => days[Number(day)]).join(", ")}`);
  if (data.effective_from) values.push(`Berlaku sejak: ${String(data.effective_from)}`);
  if (snapshot) values.push(`Shift: ${snapshot.shift_name}`, `Lokasi: ${snapshot.location_name}`, `Zona waktu: ${snapshot.timezone}`);
  return values.join("\n") || "Perubahan tercatat";
}

export function WorkSchedulesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState(defaults);
  const [editId, setEditId] = useState<number>();
  const [feedback, setFeedback] = useState<{ success: boolean; title: string; message: string } | null>(null);
  function failed(e: unknown) { setFeedback({ success: false, title: "Gagal menyimpan", message: getErrorMessage(e) }); }
  const [target, setTarget] = useState("employee");
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [group, setGroup] = useState("");
  const [shift, setShift] = useState("");
  const [location, setLocation] = useState("");
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4]);
  const [showHistory, setShowHistory] = useState(false);
  const shifts = useQuery({ queryKey: ["work-shifts"], queryFn: () => schedulingApi.shifts().then(r => r.data) });
  const employees = useQuery({ queryKey: ["schedule-employees"], queryFn: () => hrisEmployeesApi.list({ limit: 500 }).then(r => r.data.items) });
  const groups = useQuery({ queryKey: ["schedule-groups"], queryFn: () => hrisWorkGroupsApi.list().then(r => r.data) });
  const locations = useQuery({ queryKey: ["schedule-locations"], queryFn: () => hrisWorkLocationApi.list().then(r => r.data) });
  const assignments = useQuery({ queryKey: ["weekly-schedules"], queryFn: () => schedulingApi.assignments().then(r => r.data) });
  const history = useQuery({ queryKey: ["schedule-history"], enabled: showHistory, queryFn: () => schedulingApi.history().then(r => r.data) });
  function refresh() {
    void qc.invalidateQueries({ queryKey: ["weekly-schedules"] });
    void qc.invalidateQueries({ queryKey: ["schedule-history"] });
    void qc.invalidateQueries({ queryKey: ["my-schedule"] });
  }
  const save = useMutation({ mutationFn: () => schedulingApi.saveShift(form, editId), onSuccess: () => {
    void qc.invalidateQueries({ queryKey: ["work-shifts"] }); refresh(); setForm(defaults); setEditId(undefined);
    setFeedback({ success: true, title: "Shift berhasil disimpan", message: "Tetapkan shift ini ke karyawan atau grup agar digunakan untuk absensi. Perubahan template tidak mengubah jadwal karyawan sampai ditetapkan ulang." });
  }, onError: failed });
  const assign = useMutation({ mutationFn: () => schedulingApi.assign({ employee_ids: target === "employee" ? employeeIds : [],
    work_group_id: target === "group" ? Number(group) : undefined, shift_id: Number(shift), work_location_id: Number(location),
    weekdays }),
    onSuccess: r => { refresh(); setFeedback({ success: true, title: "Jadwal berhasil ditetapkan", message: `Jadwal mingguan berhasil ditetapkan untuk ${r.data.assigned} karyawan dan akan berulang sampai diubah atau dinonaktifkan.${r.data.preserved_sessions ? ` ${r.data.preserved_sessions} karyawan sudah memiliki absensi; sesi tersebut tetap memakai jadwal lama dan perubahan berlaku pada shift berikutnya.` : " Jadwal dapat digunakan hari ini pada hari kerja yang dipilih selama shift belum berakhir. Keterlambatan tetap dihitung dari jam masuk."}` }); }, onError: failed });
  const cancel = useMutation({ mutationFn: schedulingApi.cancel, onSuccess: () => { refresh(); setFeedback({ success: true, title: "Jadwal dinonaktifkan", message: "Pengulangan jadwal dihentikan. Sesi yang sudah absen tetap tersimpan." }); }, onError: failed });
  function edit(row: Shift) { setEditId(row.id); setForm({ ...row }); }
  const queryError = shifts.error || employees.error || groups.error || locations.error || assignments.error || history.error;
  return <div className="space-y-6">
    <p className="text-sm text-gray-500">8 jam bekerja + 1 jam istirahat. Sesi yang belum ditutup akan ditutup otomatis 5 jam setelah jadwal pulang. Absen masuk dibuka 2 jam sebelum shift.</p>
    {queryError && <p role="alert" className="text-sm text-red-600">{getErrorMessage(queryError)}</p>}
    <form className="space-y-3 border rounded-xl p-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
      <h3 className="font-semibold">{editId ? "Edit template shift" : "Tambah template shift"}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Nama shift<input required maxLength={100} className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm">Jam masuk lokal<input required type="time" className={input} value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></label>
        <label className="text-sm">Jam pulang otomatis<input readOnly className={input} value={`${clockAfter(form.start_time, 540)}${minutes(form.start_time) + 540 >= 1440 ? " (hari berikutnya)" : ""}`} /></label>
        <label className="text-sm">Jam mulai istirahat<input type="time" required className={input} value={clockAfter(form.start_time, form.break_start_minutes)} onChange={e => setForm({ ...form, break_start_minutes: (minutes(e.target.value) - minutes(form.start_time) + 1440) % 1440 })} /><span className="text-xs text-gray-500">Istirahat 1 jam, selesai {clockAfter(form.start_time, form.break_start_minutes + 60)}. Harus berada di dalam shift.</span></label>
        <label className="text-sm">Toleransi terlambat (menit)<input type="number" min={0} max={120} required className={input} value={form.grace_minutes} onChange={e => setForm({ ...form, grace_minutes: Number(e.target.value) })} /></label>
        <label className="text-sm">Pengingat, menit sebelum pulang<input type="number" min={0} max={120} required className={input} value={form.reminder_minutes} onChange={e => setForm({ ...form, reminder_minutes: Number(e.target.value) })} /><span className="text-xs text-gray-500">0 = tanpa pengingat sebelum pulang</span></label>
        <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />Template aktif</label>
      </div>
      {form.break_start_minutes > 480 && <p role="alert" className="text-sm text-red-600">Jam istirahat harus berada di dalam jadwal shift.</p>}
      <Button type="submit" loading={save.isPending} disabled={form.break_start_minutes > 480}>Simpan shift</Button>
      {editId && <Button type="button" onClick={() => { setEditId(undefined); setForm(defaults); }}>Batal edit</Button>}
      <div className="flex flex-wrap gap-2">{shifts.data?.map(s => <button type="button" className="border rounded px-2 py-1 text-sm" key={s.id} onClick={() => edit(s)}>{s.name} · {s.start_time}{!s.is_active && " (nonaktif)"}</button>)}</div>
    </form>
    <form className="border rounded-xl p-4 space-y-3" onSubmit={e => { e.preventDefault(); assign.mutate(); }}>
      <h3 className="font-semibold">Tetapkan jadwal mingguan</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Target<select className={input} value={target} onChange={e => setTarget(e.target.value)}><option value="employee">Karyawan</option><option value="group">Grup kerja</option></select></label>
        {target === "employee" ? <label className="text-sm">Karyawan (bisa lebih dari satu)<select multiple required className={input} value={employeeIds.map(String)} onChange={e => setEmployeeIds(Array.from(e.target.selectedOptions, o => Number(o.value)))}>{employees.data?.map(e => <option key={e.id} value={e.id}>{e.employee_no} — {e.full_name}</option>)}</select></label>
          : <label className="text-sm">Grup kerja<select required className={input} value={group} onChange={e => setGroup(e.target.value)}><option value="">Pilih grup</option>{groups.data?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
        <label className="text-sm">Shift<select required className={input} value={shift} onChange={e => setShift(e.target.value)}><option value="">Pilih shift</option>{shifts.data?.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name} · {s.start_time}</option>)}</select></label>
        <label className="text-sm">Lokasi penugasan / zona waktu<select required className={input} value={location} onChange={e => setLocation(e.target.value)}><option value="">Pilih lokasi</option>{locations.data?.map(l => <option key={l.id} value={l.id}>{l.name} · {l.timezone_name}</option>)}</select></label>
      </div>
      <div className="flex gap-3 flex-wrap">{days.map((name, i) => <label key={i} className="text-sm flex gap-1"><input type="checkbox" checked={weekdays.includes(i)} onChange={e => setWeekdays(e.target.checked ? [...weekdays, i] : weekdays.filter(d => d !== i))} />{name}</label>)}</div>
      <p className="text-xs text-gray-500">Jadwal berulang setiap minggu tanpa tanggal akhir. Menyimpan akan mengganti jadwal mingguan karyawan terpilih, termasuk hari kerjanya. Sesi yang sudah absen tetap memakai jadwal sebelumnya. Lokasi menentukan zona waktu, bukan membatasi radius absensi.</p>
      <Button type="submit" loading={assign.isPending} disabled={!weekdays.length}>Tetapkan jadwal</Button>
    </form>
    <h3 className="font-semibold">Jadwal mingguan karyawan</h3>
    <p className="text-xs text-gray-500">Template shift saja belum mengaktifkan jadwal karyawan. Tetapkan jadwal di atas agar muncul pada daftar ini. Jadwal per tanggal dari versi sebelumnya tetap berlaku sampai diganti dengan jadwal mingguan.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th>Karyawan</th><th>Shift / zona waktu</th><th>Jam kerja</th><th>Hari kerja</th><th>Status</th><th /></tr></thead><tbody>
      {assignments.data?.map(a => <tr key={a.id} className="border-t">
        <td className="py-2">{a.employee_name}</td>
        <td>{a.snapshot.shift_name}<br /><span className="text-xs">{a.snapshot.location_name} / {a.snapshot.timezone}</span></td>
        <td>{new Date(a.snapshot.starts_at).toLocaleTimeString("id-ID", { timeZone: a.snapshot.timezone, hour: "2-digit", minute: "2-digit" })} - {new Date(a.snapshot.ends_at).toLocaleTimeString("id-ID", { timeZone: a.snapshot.timezone, hour: "2-digit", minute: "2-digit" })}</td>
        <td>{a.weekdays.map(d => days[d]).join(", ")}</td>
        <td>{a.is_active ? "Aktif setiap minggu" : "Nonaktif"}</td>
        <td className="space-x-2"><Button size="sm" onClick={() => { setTarget("employee"); setEmployeeIds([a.employee_id]); setShift(String(a.shift_id)); setLocation(String(a.work_location_id)); setWeekdays(a.weekdays); }}>Ubah</Button>
        {a.is_active && <Button size="sm" disabled={cancel.isPending || assign.isPending} onClick={() => cancel.mutate(a.id)}>Nonaktifkan</Button>}</td>
      </tr>)}
    </tbody></table>{assignments.isLoading ? <p className="text-sm py-3">Memuat jadwal mingguan...</p> : !assignments.data?.length && <p className="text-sm py-3">Belum ada jadwal mingguan yang ditetapkan ke karyawan.</p>}</div>
    <Button onClick={() => setShowHistory(!showHistory)}>Riwayat perubahan</Button>
    {showHistory && <div className="space-y-2">{history.data?.map(h => <details key={h.id} className="border rounded p-2 text-xs"><summary>{scheduleTime(h.created_at)} · {entityLabels[h.entity_type] ?? h.entity_type} #{h.entity_id} · {actionLabels[h.action] ?? h.action} · {h.changed_by ? `User #${h.changed_by}` : "Sistem"}</summary><div className="grid gap-3 sm:grid-cols-2 mt-2"><div><strong>Sebelum</strong><p className="whitespace-pre-wrap">{auditDetails(h.before_state)}</p></div><div><strong>Sesudah</strong><p className="whitespace-pre-wrap">{auditDetails(h.after_state)}</p></div></div></details>)}</div>}
    {feedback && createPortal(<Modal open onClose={() => setFeedback(null)} title={feedback.title} size="sm"
      footer={<Button autoFocus variant="primary" onClick={() => setFeedback(null)}>Mengerti</Button>}>
      <div role="status" className="text-center space-y-3">
        {feedback.success ? <CheckCircle2 className="mx-auto text-teal-600" size={44} /> : <AlertCircle className="mx-auto text-red-500" size={44} />}
        <p className="text-sm text-gray-700">{feedback.message}</p>
      </div>
    </Modal>, document.body)}
  </div>;
}
