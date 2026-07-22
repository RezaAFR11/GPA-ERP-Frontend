"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hrisSalaryApi } from "@/lib/api";
import type { SalaryComponent } from "@/lib/types";
import { fmtRp } from "../payroll-utils";

export function SalaryModal({
  open, onClose, employees, components,
}: {
  open: boolean; onClose: () => void;
  employees: { id: number; employee_no: string; full_name: string }[];
  components: SalaryComponent[];
}) {
  const qc = useQueryClient();
  const [empId,  setEmpId]  = useState("");
  const [compId, setCompId] = useState("");
  const [amount, setAmount] = useState("");
  const [from,   setFrom]   = useState(new Date().toISOString().slice(0, 10));
  const [err,    setErr]    = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ["hris", "salary-assignments", empId],
    queryFn:  () => hrisSalaryApi.listAssignments(empId ? Number(empId) : undefined).then(r => r.data),
  });

  async function save() {
    if (!empId || !compId || !amount) { setErr("Semua field wajib diisi"); return; }
    setSaving(true); setErr(null);
    try {
      await hrisSalaryApi.createAssignment({
        employee_id: Number(empId), component_id: Number(compId),
        amount: Number(amount), effective_from: from,
      });
      qc.invalidateQueries({ queryKey: ["hris", "salary-assignments"] });
      setAmount(""); setCompId("");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <Modal open={open} onClose={onClose} title="Struktur Gaji Karyawan" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tambah Komponen Gaji</p>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <select value={empId} onChange={e => setEmpId(e.target.value)} className={field}>
            <option value="">— Pilih karyawan —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_no} · {e.full_name}</option>)}
          </select>
          <select value={compId} onChange={e => setCompId(e.target.value)} className={field}>
            <option value="">— Pilih komponen —</option>
            {components.map(c => <option key={c.id} value={c.id}>{c.name} ({c.component_type})</option>)}
          </select>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Jumlah (Rp)" className={field} />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={field} />
          <Button onClick={save} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? "Menyimpan…" : "Tambah"}
          </Button>
        </div>

        {/* Current assignments */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Komponen Aktif</p>
          {assignments.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Pilih karyawan untuk melihat struktur gaji</p>
          ) : (
            <div className="space-y-1.5">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{a.component.name}</p>
                    <p className="text-[11px] text-gray-400">{a.component.component_type}</p>
                  </div>
                  <p className="text-xs font-mono font-semibold text-gray-700">{fmtRp(a.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
