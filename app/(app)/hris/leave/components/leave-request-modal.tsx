"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { hrisLeaveApi } from "@/lib/api";
import type { Employee, LeaveBalance, LeaveType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  onCreated: () => void;
}

export function LeaveRequestModal({ open, onClose, employee, leaveTypes, balances, onCreated }: Props) {
  const [ltId,   setLtId]   = useState("");
  const [start,  setStart]  = useState("");
  const [end,    setEnd]    = useState("");
  const [reason, setReason] = useState("");
  const [err,    setErr]    = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedBalance = balances.find(b => b.leave_type_id === Number(ltId));
  const selectedType    = leaveTypes.find(t => t.id === Number(ltId));

  /* Calculate days (business days simple count) */
  function calcDays(s: string, e: string): number {
    if (!s || !e) return 0;
    const ms = new Date(e).getTime() - new Date(s).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }
  const days = calcDays(start, end);

  async function submit() {
    if (!employee) { setErr("Tidak ada karyawan dipilih"); return; }
    if (!ltId)     { setErr("Pilih jenis cuti"); return; }
    if (!start || !end) { setErr("Isi tanggal mulai dan selesai"); return; }
    if (new Date(end) < new Date(start)) { setErr("Tanggal selesai harus ≥ tanggal mulai"); return; }
    if (selectedBalance && selectedType?.max_days_per_year != null) {
      if (selectedBalance.remaining < days) {
        setErr(`Saldo tidak cukup. Sisa: ${selectedBalance.remaining} hari`);
        return;
      }
    }

    setSaving(true); setErr(null);
    try {
      await hrisLeaveApi.create({
        employee_id:   employee.id,
        leave_type_id: Number(ltId),
        start_date:    start,
        end_date:      end,
        reason:        reason || undefined,
      });
      onCreated();
      onClose();
      // reset
      setLtId(""); setStart(""); setEnd(""); setReason("");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal mengajukan cuti");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Cuti / Izin"
      subtitle={employee ? `${employee.full_name} · ${employee.employee_no}` : undefined}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? "Mengajukan…" : "Ajukan Cuti"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Cuti</label>
          <select value={ltId} onChange={e => setLtId(e.target.value)} className={field}>
            <option value="">— Pilih jenis cuti —</option>
            {leaveTypes.filter(t => t.is_active).map(t => {
              const bal = balances.find(b => b.leave_type_id === t.id);
              const sisa = bal ? ` (sisa ${bal.remaining}h)` : "";
              return <option key={t.id} value={t.id}>{t.name}{sisa}</option>;
            })}
          </select>
          {selectedBalance && selectedType?.max_days_per_year != null && (
            <p className="text-[11px] text-gray-400 mt-1">
              Saldo tersisa: <span className="font-semibold text-blue-600">{selectedBalance.remaining} hari</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Selesai</label>
            <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className={field} />
          </div>
        </div>

        {start && end && (
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Durasi: <span className="font-semibold text-blue-700">{days} hari</span>
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Alasan (opsional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Tuliskan alasan pengajuan cuti…"
            className={field + " resize-none"}
          />
        </div>
      </div>
    </Modal>
  );
}
