"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hrisAttendanceApi } from "@/lib/api";
import type { Employee } from "@/lib/types";

/* ─── Manual entry modal ─────────────────────────────────────────────────── */
export function ManualModal({
  open, onClose, employees, onCreated,
}: {
  open: boolean; onClose: () => void;
  employees: Employee[];
  onCreated: () => void;
}) {
  const [empId, setEmpId]   = useState("");
  const [date,  setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [ci,    setCi]      = useState("08:00");
  const [co,    setCo]      = useState("17:00");
  const [note,  setNote]    = useState("");
  const [err,   setErr]     = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!empId || !date) { setErr("Pilih karyawan dan tanggal"); return; }
    setSaving(true); setErr(null);
    try {
      await hrisAttendanceApi.manualCreate({
        employee_id: Number(empId), date,
        clock_in:  date + "T" + ci + ":00",
        clock_out: date + "T" + co + ":00",
        note: note || undefined,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

  return (
    <Modal open={open} onClose={onClose} title="Tambah Absensi Manual" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className={field}>
            <option value="">— Pilih karyawan —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.employee_no} · {e.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clock-In</label>
            <input type="time" value={ci} onChange={e => setCi(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clock-Out</label>
            <input type="time" value={co} onChange={e => setCo(e.target.value)} className={field} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional" className={field} />
        </div>
      </div>
    </Modal>
  );
}
