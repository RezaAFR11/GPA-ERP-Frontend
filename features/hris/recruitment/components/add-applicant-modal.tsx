"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { hrisRecruitmentApi } from "@/lib/api";
import type { JobPosting } from "@/lib/types";

export function AddApplicantModal({
  open, onClose, postings, onCreated,
}: {
  open: boolean; onClose: () => void;
  postings: JobPosting[];
  onCreated: () => void;
}) {
  const [postingId, setPostingId] = useState("");
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("OTHER");
  const [note, setNote]   = useState("");
  const [err, setErr]     = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!postingId || !name) { setErr("Posisi dan nama wajib diisi"); return; }
    setSaving(true); setErr(null);
    try {
      await hrisRecruitmentApi.createApplicant({
        posting_id: Number(postingId), full_name: name,
        email: email || undefined, phone: phone || undefined,
        source: source as "OTHER", note: note || undefined,
      });
      onCreated();
      onClose();
      setPostingId(""); setName(""); setEmail(""); setPhone(""); setNote("");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menambahkan");
    } finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

  return (
    <Modal open={open} onClose={onClose} title="Tambah Pelamar" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Menyimpan…" : "Tambah Pelamar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Posisi</label>
          <select value={postingId} onChange={e => setPostingId(e.target.value)} className={field}>
            <option value="">— Pilih posisi —</option>
            {postings.filter(p => p.status === "OPEN").map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama pelamar" className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Opsional" className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telepon</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Opsional" className={field} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sumber</label>
          <select value={source} onChange={e => setSource(e.target.value)} className={field}>
            {["JOBSTREET","LINKEDIN","REFERRAL","WALK_IN","OTHER"].map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Opsional" className={field + " resize-none"} />
        </div>
      </div>
    </Modal>
  );
}
