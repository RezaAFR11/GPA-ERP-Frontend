"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hrisRecruitmentApi } from "@/lib/api";

export function NewPostingModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle]   = useState("");
  const [desc,  setDesc]    = useState("");
  const [reqs,  setReqs]    = useState("");
  const [err,   setErr]     = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title) { setErr("Judul posisi wajib diisi"); return; }
    setSaving(true); setErr(null);
    try {
      await hrisRecruitmentApi.createPosting({ title, description: desc || undefined, requirements: reqs || undefined });
      onCreated();
      onClose();
      setTitle(""); setDesc(""); setReqs("");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal membuat");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

  return (
    <Modal open={open} onClose={onClose} title="Buka Lowongan" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Membuat…" : "Buat Lowongan"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Judul Posisi</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Frontend Developer" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            placeholder="Deskripsi pekerjaan…" className={field + " resize-none"} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Persyaratan</label>
          <textarea value={reqs} onChange={e => setReqs(e.target.value)} rows={3}
            placeholder="Kualifikasi yang diperlukan…" className={field + " resize-none"} />
        </div>
      </div>
    </Modal>
  );
}
