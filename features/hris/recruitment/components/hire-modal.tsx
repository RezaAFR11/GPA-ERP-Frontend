"use client";

import { useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hrisRecruitmentApi } from "@/lib/api";
import type { Applicant, HireResult } from "@/lib/types";

export function HireModal({
  applicant, onClose, onHired,
}: { applicant: Applicant | null; onClose: () => void; onHired: () => void }) {
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [createUser, setCreateUser] = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<HireResult | null>(null);

  function closeModal() {
    setResult(null);
    setErr(null);
    onClose();
  }

  async function hire() {
    if (!applicant) return;
    setSaving(true); setErr(null);
    try {
      const response = await hrisRecruitmentApi.hire(applicant.id, { join_date: joinDate, create_user: createUser });
      setResult(response.data);
      onHired();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal hire");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

  return (
    <Modal open={!!applicant} onClose={closeModal} title={result ? "Karyawan Berhasil Dibuat" : "Terima Pelamar"}
      subtitle={applicant?.full_name}
      size="sm"
      footer={result ? (
        <div className="flex justify-center">
          <Button onClick={closeModal} className="bg-teal-600 hover:bg-teal-700 text-white">Tutup</Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeModal}>Batal</Button>
          <Button onClick={hire} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Memproses…" : "Hire & Buat Karyawan"}
          </Button>
        </div>
      )}
    >
      {result ? (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-teal-800">
            Employee <strong>{result.employee_no}</strong> berhasil dibuat dengan {result.leave_balances_created} saldo cuti.
          </div>
          {result.user_email && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-2 font-medium text-gray-800">
                <KeyRound size={15} /> Akun Login
              </div>
              <div className="text-xs text-gray-600">
                Email: <span className="font-mono text-gray-900">{result.user_email}</span>
              </div>
              {result.temp_password ? (
                <div className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-2">
                  <span className="font-mono text-xs text-gray-900 break-all">{result.temp_password}</span>
                  <button type="button" title="Salin password"
                    onClick={() => navigator.clipboard.writeText(result.temp_password ?? "")}
                    className="p-1.5 text-gray-500 hover:text-teal-700">
                    <Copy size={14} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Akun yang sudah ada telah ditautkan ke karyawan.</p>
              )}
              {result.temp_password && (
                <p className="text-[11px] text-amber-700">
                  Password ini hanya ditampilkan sekali dan wajib diganti saat login pertama.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai Kerja</label>
            <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className={field} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={createUser} onChange={e => setCreateUser(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600" />
            <span className="text-sm text-gray-700">Buat akun login sistem (STAFF)</span>
          </label>
          <p className="text-xs text-gray-400">
            Sistem akan membuat record Employee, saldo cuti, dan checklist onboarding secara otomatis.
          </p>
        </div>
      )}
    </Modal>
  );
}
