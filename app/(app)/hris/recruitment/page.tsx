"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Briefcase, ChevronRight, PlusCircle, Check, X,
  ArrowRight, Search, CheckCircle2, Clock3, CalendarClock, Copy, KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { hrisRecruitmentApi, hrisDepartmentsApi } from "@/lib/api";
import type {
  Applicant, ApplicantStage, HireResult, InterviewResult,
  JobPosting, OnboardingTask,
} from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { useRole } from "@/lib/auth-context";

/* ─── Kanban config ───────────────────────────────────────────────────────── */
const STAGES: { key: ApplicantStage; label: string; color: string; bg: string }[] = [
  { key: "RECEIVED",  label: "Masuk",      color: "text-gray-600",   bg: "bg-gray-50"    },
  { key: "SCREENING", label: "Screening",  color: "text-blue-700",   bg: "bg-blue-50"    },
  { key: "INTERVIEW", label: "Interview",  color: "text-purple-700", bg: "bg-purple-50"  },
  { key: "OFFER",     label: "Penawaran",  color: "text-amber-700",  bg: "bg-amber-50"   },
  { key: "HIRED",     label: "Diterima",   color: "text-teal-700",   bg: "bg-teal-50"    },
  { key: "REJECTED",  label: "Ditolak",    color: "text-red-600",    bg: "bg-red-50"     },
];

const NEXT_STAGE: Partial<Record<ApplicantStage, ApplicantStage>> = {
  RECEIVED:  "SCREENING",
  SCREENING: "INTERVIEW",
  INTERVIEW: "OFFER",
  OFFER:     "HIRED",
};

/* ─── Add applicant modal ─────────────────────────────────────────────────── */
function AddApplicantModal({
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

/* ─── New posting modal ───────────────────────────────────────────────────── */
function NewPostingModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
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

function defaultInterviewTime(): string {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function InterviewModal({
  applicant, onClose, onUpdated,
}: {
  applicant: Applicant | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(defaultInterviewTime);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["hris", "interviews", applicant?.id],
    queryFn: () => hrisRecruitmentApi.listInterviews(applicant!.id).then(r => r.data),
    enabled: !!applicant && applicant.stage === "INTERVIEW",
  });
  const pending = interviews.find(interview => interview.result === "PENDING");
  const needsSchedule = applicant?.stage === "SCREENING" ||
    (applicant?.stage === "INTERVIEW" && !pending && !isLoading);

  function close() {
    setErr(null);
    setNotes("");
    onClose();
  }

  async function schedule() {
    if (!applicant || !scheduledAt) return;
    setSaving(true);
    setErr(null);
    try {
      await hrisRecruitmentApi.createInterview({
        applicant_id: applicant.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes || undefined,
      });
      onUpdated();
      close();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menjadwalkan wawancara");
    } finally {
      setSaving(false);
    }
  }

  async function recordResult(result: Exclude<InterviewResult, "PENDING">) {
    if (!pending) return;
    setSaving(true);
    setErr(null);
    try {
      await hrisRecruitmentApi.updateInterview(pending.id, result, notes || undefined);
      onUpdated();
      close();
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan hasil wawancara");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!applicant}
      onClose={close}
      title={needsSchedule ? "Jadwalkan Wawancara" : "Hasil Wawancara"}
      subtitle={applicant?.full_name}
      size="sm"
    >
      <div className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : needsSchedule ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal dan Waktu</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="ghost" onClick={close}>Batal</Button>
              <Button onClick={schedule} disabled={saving || !scheduledAt}
                className="bg-green-700 hover:bg-green-800 text-white">
                <CalendarClock size={14} className="mr-1.5" />
                {saving ? "Menyimpan…" : "Jadwalkan"}
              </Button>
            </div>
          </>
        ) : pending ? (
          <>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Jadwal</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {new Date(pending.scheduled_at).toLocaleString("id-ID")}
              </p>
              {pending.notes && <p className="text-xs text-gray-500 mt-1">{pending.notes}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Hasil</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => recordResult("HOLD")} disabled={saving}>Tunda</Button>
              <Button onClick={() => recordResult("FAIL")} disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white">Tidak Lulus</Button>
              <Button onClick={() => recordResult("PASS")} disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white">Lulus</Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Tidak ada wawancara yang menunggu hasil.</p>
        )}
      </div>
    </Modal>
  );
}

/* ─── Onboarding panel ────────────────────────────────────────────────────── */
function OnboardingPanel({ applicant, onClose }: { applicant: Applicant; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["hris", "onboarding", applicant.id],
    queryFn:  () => hrisRecruitmentApi.getOnboarding(applicant.id).then(r => r.data),
  });

  const completeMut = useMutation({
    mutationFn: ({ id, val }: { id: number; val: boolean }) =>
      hrisRecruitmentApi.completeTask(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hris", "onboarding", applicant.id] }),
  });

  const done  = tasks.filter(t => t.is_completed).length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Onboarding</p>
          <p className="text-xs text-gray-400">{applicant.full_name}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 py-3 border-b border-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>{done}/{total} selesai</span>
          <span className="font-semibold text-teal-700">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          : tasks.map(t => (
              <button key={t.id}
                onClick={() => completeMut.mutate({ id: t.id, val: !t.is_completed })}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                  t.is_completed
                    ? "bg-teal-50 border-teal-100 text-teal-800"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  t.is_completed ? "bg-teal-500 border-teal-500" : "border-gray-300"
                )}>
                  {t.is_completed && <Check size={11} className="text-white" />}
                </div>
                <p className={cn("text-xs font-medium", t.is_completed && "line-through opacity-70")}>{t.task}</p>
              </button>
            ))
        }
      </div>
    </div>
  );
}

/* ─── Hire modal ──────────────────────────────────────────────────────────── */
function HireModal({
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

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function RecruitmentPage() {
  const qc = useQueryClient();
  const { hasRole } = useRole();
  const canManagePipeline = hasRole("SUPER_ADMIN", "MD", "PM", "PROJECT_CONTROL", "GA", "HR");
  const canHire = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const [search, setSearch]         = useState("");
  const [selectedPosting, setSelectedPosting] = useState<number | "all">("all");
  const [showNewPosting,  setShowNewPosting]  = useState(false);
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [onboardingApp, setOnboardingApp]     = useState<Applicant | null>(null);
  const [hireApp,        setHireApp]          = useState<Applicant | null>(null);
  const [interviewApp,   setInterviewApp]     = useState<Applicant | null>(null);

  /* Postings */
  const { data: postings = [] } = useQuery({
    queryKey: ["hris", "job-postings"],
    queryFn:  () => hrisRecruitmentApi.listPostings().then(r => r.data),
  });

  /* Applicants */
  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["hris", "applicants", { posting: selectedPosting, search }],
    queryFn:  () => hrisRecruitmentApi.listApplicants({
      posting_id: selectedPosting !== "all" ? selectedPosting : undefined,
      search:     search || undefined,
    }).then(r => r.data),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) =>
      hrisRecruitmentApi.moveStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hris", "applicants"] }),
  });

  /* Group by stage */
  const byStage = STAGES.reduce<Record<string, Applicant[]>>((acc, s) => {
    acc[s.key] = applicants.filter(a => a.stage === s.key);
    return acc;
  }, {} as Record<string, Applicant[]>);

  const openPostings = postings.filter(p => p.status === "OPEN");

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-green-700" /> Rekrutmen
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Pipeline pelamar & onboarding</p>
        </div>
        {canManagePipeline && <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowNewPosting(true)}
            className="border border-gray-200 text-gray-700">
            <Briefcase size={14} className="mr-1.5" /> Buka Lowongan
          </Button>
          <Button size="sm" onClick={() => setShowAddApplicant(true)}
            className="bg-green-700 hover:bg-green-800 text-white">
            <PlusCircle size={14} className="mr-1.5" /> Tambah Pelamar
          </Button>
        </div>}
      </div>

      {/* Filter bar */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Posting filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedPosting("all")}
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                selectedPosting === "all"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}>
              Semua ({applicants.length})
            </button>
            {openPostings.map(p => (
              <button key={p.id}
                onClick={() => setSelectedPosting(p.id)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  selectedPosting === p.id
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>
                {p.title} ({applicants.filter(a => a.posting_id === p.id).length})
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari pelamar…"
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 w-44" />
          </div>
        </div>
      </Card>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const cards = byStage[stage.key] ?? [];
          return (
            <div key={stage.key} className="shrink-0 w-52">
              {/* Column header */}
              <div className={cn("flex items-center justify-between px-3 py-2 rounded-t-xl mb-0", stage.bg)}>
                <p className={cn("text-xs font-semibold", stage.color)}>{stage.label}</p>
                <Badge className={cn("border-0 text-[10px]", stage.bg, stage.color)}>{cards.length}</Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2 bg-gray-50 rounded-b-xl p-2 min-h-[200px]">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                  : cards.map(app => {
                      const nextStage = NEXT_STAGE[app.stage];
                      return (
                        <div key={app.id}
                          className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-xs font-semibold text-gray-900 leading-tight">{app.full_name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{app.source.replace("_"," ")}</p>
                          <p className="text-[11px] text-gray-400">{fmtDate(app.created_at)}</p>

                          <div className="flex gap-1 mt-2">
                            {canManagePipeline && app.stage === "RECEIVED" && nextStage && (
                              <button
                                onClick={() => moveMut.mutate({ id: app.id, stage: nextStage })}
                                disabled={moveMut.isPending}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1 transition-colors">
                                <ArrowRight size={10} /> Maju
                              </button>
                            )}
                            {canManagePipeline && ["SCREENING", "INTERVIEW"].includes(app.stage) && (
                              <button
                                onClick={() => setInterviewApp(app)}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg py-1 transition-colors">
                                <CalendarClock size={10} />
                                {app.stage === "SCREENING" ? "Jadwal" : "Hasil"}
                              </button>
                            )}
                            {canHire && app.stage === "OFFER" && (
                              <button
                                onClick={() => setHireApp(app)}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg py-1 transition-colors">
                                <Check size={10} /> Hire
                              </button>
                            )}
                            {canManagePipeline && app.stage === "HIRED" && (
                              <button
                                onClick={() => setOnboardingApp(app)}
                                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-1 transition-colors">
                                <CheckCircle2 size={10} /> Onboarding
                              </button>
                            )}
                            {canManagePipeline && !["HIRED", "REJECTED"].includes(app.stage) && (
                              <button
                                onClick={() => moveMut.mutate({ id: app.id, stage: "REJECTED" })}
                                disabled={moveMut.isPending}
                                className="text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg px-1.5 py-1 transition-colors">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Posting list */}
      <Card padding={false}>
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Daftar Lowongan</p>
        </div>
        <div className="divide-y divide-gray-50">
          {postings.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Belum ada lowongan</p>
            : postings.map(p => {
                const count = applicants.filter(a => a.posting_id === p.id).length;
                const statusCls: Record<string, string> = {
                  OPEN:    "bg-teal-50 text-teal-700 border-teal-200",
                  CLOSED:  "bg-gray-100 text-gray-500 border-gray-200",
                  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
                };
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400">{count} pelamar · dibuka {fmtDate(p.opened_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusCls[p.status] ?? ""}>{p.status}</Badge>
                      {canManagePipeline && p.status === "OPEN" && (
                        <button
                          onClick={() => hrisRecruitmentApi.updatePosting(p.id, { status: "CLOSED" })
                            .then(() => qc.invalidateQueries({ queryKey: ["hris", "job-postings"] }))}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >Tutup</button>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </Card>

      {/* ── Modals & panels ───────────────────────────────────────────── */}
      {canManagePipeline && (
        <>
          <NewPostingModal open={showNewPosting} onClose={() => setShowNewPosting(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "job-postings"] })} />

          <AddApplicantModal open={showAddApplicant} onClose={() => setShowAddApplicant(false)}
            postings={postings}
            onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "applicants"] })} />

          <InterviewModal key={interviewApp?.id ?? "none"} applicant={interviewApp}
            onClose={() => setInterviewApp(null)}
            onUpdated={() => {
              qc.invalidateQueries({ queryKey: ["hris", "applicants"] });
              qc.invalidateQueries({ queryKey: ["hris", "interviews"] });
            }} />
        </>
      )}

      {canHire && <HireModal applicant={hireApp} onClose={() => setHireApp(null)}
        onHired={() => qc.invalidateQueries({ queryKey: ["hris", "applicants"] })} />}

      {onboardingApp && (
        <OnboardingPanel applicant={onboardingApp} onClose={() => setOnboardingApp(null)} />
      )}
    </div>
  );
}
