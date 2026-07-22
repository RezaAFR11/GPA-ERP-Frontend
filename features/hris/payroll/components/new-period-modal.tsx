"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hrisPayrollApi } from "@/lib/api";
import { MONTHS } from "../payroll-utils";

export function NewPeriodModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [err,   setErr]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await hrisPayrollApi.createPeriod(year, month);
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal membuat periode");
    } finally { setSaving(false); }
  }

  const sel = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <Modal open={open} onClose={onClose} title="Buka Periode Payroll" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? "Membuat…" : "Buat Periode"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              min={2020} max={2035} className={sel} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bulan</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={sel}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
