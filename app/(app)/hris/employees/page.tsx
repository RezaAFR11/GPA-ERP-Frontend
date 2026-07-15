"use client";
import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Search, Loader2, CheckSquare, UserPlus, Copy, Check,
  AlertTriangle, Building2, GraduationCap, ChevronRight, ChevronDown,
  Briefcase,
} from "lucide-react";
import { hrisEmployeesApi, hrisDepartmentsApi, hrisJobGradesApi, hrisWorkGroupsApi, hrisDashboardApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { cn, fmtDate, ROLE_LABEL } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import type {
  Employee, EmploymentType, EmployeeStatus, EmployeeCreate,
  BulkAccountResult, RoleName, WorkGroup, WorkGroupCreate, DepartmentNode,
} from "@/lib/types";
import EmployeeDetailModal from "./components/employee-detail-modal";
import { useRole } from "@/lib/auth-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPE_COLORS: Record<string, string> = {
  Tetap:     "bg-teal-50 text-teal-700 border-teal-200",
  PKWT:      "bg-blue-50 text-blue-700 border-blue-200",
  Outsource: "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_COLORS: Record<string, string> = {
  active:     "bg-green-50 text-green-700 border-green-200",
  probation:  "bg-amber-50 text-amber-700 border-amber-200",
  leave:      "bg-blue-50 text-blue-700 border-blue-200",
  terminated: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif", probation: "Probasi", leave: "Cuti Panjang", terminated: "Berhenti",
};

const TIPE_OPTIONS: EmploymentType[] = ["Tetap", "PKWT", "Outsource"];
const STATUS_OPTIONS: EmployeeStatus[] = ["active", "probation", "leave", "terminated"];

/** Roles available for bulk assignment (exclude super admin) */
const ASSIGNABLE_ROLES: RoleName[] = [
  "MD", "PM", "PROJECT_CONTROL", "COST_CONTROL", "FINANCE", "GA", "HR", "STAFF", "WORKER",
];

// ── New Employee Form ──────────────────────────────────────────────────────────

function NewEmployeeModal({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<EmployeeCreate>>({
    tipe: "Tetap", status: "active",
  });
  const set = (k: keyof EmployeeCreate, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { data: depts = [] } = useQuery({
    queryKey: ["hris", "departments"],
    queryFn: () => hrisDepartmentsApi.list().then((r) => r.data),
    enabled: open,
  });
  const { data: grades = [] } = useQuery({
    queryKey: ["hris", "job-grades"],
    queryFn: () => hrisJobGradesApi.list().then((r) => r.data),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: EmployeeCreate) => hrisEmployeesApi.create(data),
    onSuccess: () => {
      toastSuccess("Karyawan berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "employees"] });
      onClose();
      setForm({ tipe: "Tetap", status: "active" });
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan karyawan"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_no || !form.full_name || !form.tipe) {
      toastError("No. Karyawan, Nama Lengkap, dan Tipe wajib diisi");
      return;
    }
    createMutation.mutate(form as EmployeeCreate);
  }

  const field = "block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white text-gray-900 placeholder:text-gray-300";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Karyawan Baru"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={createMutation.isPending}
            className="bg-teal-700 hover:bg-teal-600 border-teal-700"
          >
            Simpan
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">No. Karyawan *</label>
            <input className={field} placeholder="EMP-001"
              value={form.employee_no ?? ""} onChange={(e) => set("employee_no", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipe *</label>
            <select className={field} value={form.tipe}
              onChange={(e) => set("tipe", e.target.value as EmploymentType)}>
              {TIPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Lengkap *</label>
          <input className={field} placeholder="Nama lengkap sesuai KTP"
            value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">NIK</label>
            <input className={field} placeholder="16 digit" maxLength={16}
              value={form.nik ?? ""} onChange={(e) => set("nik", e.target.value || null)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">NPWP</label>
            <input className={field} placeholder="XX.XXX.XXX.X-XXX.XXX"
              value={form.npwp ?? ""} onChange={(e) => set("npwp", e.target.value || null)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
            <input className={field} type="email" placeholder="nama@perusahaan.com"
              value={form.email ?? ""} onChange={(e) => set("email", e.target.value || null)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">No. Telepon</label>
            <input className={field} placeholder="08xx-xxxx-xxxx"
              value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Departemen</label>
            <select className={field} value={form.dept_id ?? ""}
              onChange={(e) => set("dept_id", e.target.value ? +e.target.value : null)}>
              <option value="">— Pilih departemen —</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Job Grade</label>
            <select className={field} value={form.grade_id ?? ""}
              onChange={(e) => set("grade_id", e.target.value ? +e.target.value : null)}>
              <option value="">— Pilih grade —</option>
              {grades.map((g) => <option key={g.id} value={g.id}>L{g.level} — {g.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tanggal Masuk</label>
            <input className={field} type="date"
              value={form.join_date ?? ""} onChange={(e) => set("join_date", e.target.value || null)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Site / Lokasi</label>
            <input className={field} placeholder="Nama proyek / kantor"
              value={form.site ?? ""} onChange={(e) => set("site", e.target.value || null)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">No. BPJS TK</label>
            <input className={field} placeholder="Nomor BPJS Ketenagakerjaan"
              value={form.bpjs_tk_no ?? ""} onChange={(e) => set("bpjs_tk_no", e.target.value || null)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">No. BPJS Kesehatan</label>
            <input className={field} placeholder="Nomor BPJS Kesehatan"
              value={form.bpjs_kes_no ?? ""} onChange={(e) => set("bpjs_kes_no", e.target.value || null)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Bank</label>
            <input className={field} placeholder="BCA, Mandiri, BNI, …"
              value={form.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value || null)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">No. Rekening</label>
            <input className={field} placeholder="Nomor rekening"
              value={form.bank_account ?? ""} onChange={(e) => set("bank_account", e.target.value || null)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Bulk Create Accounts Modal ────────────────────────────────────────────────

interface BulkCreateModalProps {
  open: boolean;
  employees: Employee[];
  allowedRoles: readonly RoleName[];
  onClose: () => void;
  onDone: () => void;
}

function BulkCreateModal({ open, employees, allowedRoles, onClose, onDone }: BulkCreateModalProps) {
  const [roleName, setRoleName] = useState<RoleName>("WORKER");
  const [results, setResults] = useState<BulkAccountResult[] | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      hrisEmployeesApi.bulkCreateAccounts(
        employees.map((e) => ({ employee_id: e.id, role_name: roleName })),
      ).then((r) => r.data),
    onSuccess: (data) => {
      setResults(data.results);
      if (data.created > 0) {
        toastSuccess(`${data.created} akun berhasil dibuat`);
        onDone();
      }
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal membuat akun"),
  });

  function handleClose() {
    setResults(null);
    onClose();
  }

  async function copyPassword(idx: number, pw: string) {
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  const select = "text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Buat Akun Pengguna"
      subtitle={`${employees.length} karyawan dipilih`}
      size="md"
      footer={
        results ? (
          <Button variant="primary" size="sm" onClick={handleClose}
            className="bg-teal-700 hover:bg-teal-600 border-teal-700">
            Selesai
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={handleClose}>Batal</Button>
            <Button
              variant="primary"
              size="sm"
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="bg-teal-700 hover:bg-teal-600 border-teal-700"
            >
              <UserPlus size={13} className="mr-1.5" />
              Buat Akun
            </Button>
          </>
        )
      }
    >
      {!results ? (
        <div className="space-y-5">
          {/* Role picker */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Role untuk semua karyawan yang dipilih
            </label>
            <select
              className={cn(select, "w-full")}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value as RoleName)}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Role bisa diubah per-karyawan setelah akun dibuat.
            </p>
          </div>

          {/* Preview list */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Karyawan yang akan dibuatkan akun
            </div>
            <ul className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
              {employees.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-teal-700 text-[10px] font-bold">
                      {e.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.full_name}</p>
                    <p className="text-[11px] text-gray-400 num">{e.employee_no}</p>
                  </div>
                  {e.user_id ? (
                    <Badge className="bg-gray-50 text-gray-400 border-gray-200 text-[10px]">Sudah ada akun</Badge>
                  ) : !e.email ? (
                    <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">Tanpa email</Badge>
                  ) : (
                    <span className="text-[11px] text-gray-500 truncate max-w-[120px]">{e.email}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Warnings */}
          {employees.some((e) => e.user_id || !e.email) && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 p-3">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Karyawan yang sudah punya akun atau tidak punya email akan dilewati otomatis.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
            Password sementara akan dibuatkan otomatis dan ditampilkan sekali saja setelah akun dibuat.
            Pastikan untuk menyimpan atau menyebarkan password tersebut ke karyawan yang bersangkutan.
          </div>
        </div>
      ) : (
        /* Results */
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex gap-2 flex-wrap">
            {results.filter((r) => r.status === "created").length > 0 && (
              <Badge className="bg-green-50 text-green-700 border-green-200">
                {results.filter((r) => r.status === "created").length} akun dibuat
              </Badge>
            )}
            {results.filter((r) => r.status === "skipped").length > 0 && (
              <Badge className="bg-gray-50 text-gray-500 border-gray-200">
                {results.filter((r) => r.status === "skipped").length} dilewati
              </Badge>
            )}
            {results.filter((r) => r.status === "error").length > 0 && (
              <Badge className="bg-red-50 text-red-600 border-red-200">
                {results.filter((r) => r.status === "error").length} gagal
              </Badge>
            )}
          </div>

          {/* Per-item results */}
          <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto">
            {results.map((r, idx) => (
              <li key={r.employee_id} className={cn(
                "px-3 py-3 flex items-start gap-3",
                r.status === "created" ? "bg-green-50/30" :
                r.status === "error"   ? "bg-red-50/30" : ""
              )}>
                <span className={cn(
                  "mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded shrink-0",
                  r.status === "created" ? "bg-green-100 text-green-700" :
                  r.status === "skipped" ? "bg-gray-100 text-gray-500" :
                  "bg-red-100 text-red-600"
                )}>
                  {r.status === "created" ? "OK" : r.status === "skipped" ? "–" : "!"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.full_name}</p>
                  <p className="text-[11px] text-gray-400 num">{r.employee_no}</p>
                  {r.status === "created" && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-500">{r.detail}</span>
                    </div>
                  )}
                  {r.status !== "created" && (
                    <p className="text-xs text-gray-500 mt-0.5">{r.detail}</p>
                  )}
                </div>
                {/* Temp password copy button */}
                {r.status === "created" && r.temp_password && (
                  <button
                    onClick={() => copyPassword(idx, r.temp_password!)}
                    className="flex items-center gap-1.5 text-[11px] font-mono bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 hover:bg-gray-50 shrink-0"
                    title="Salin password sementara"
                  >
                    <span className="max-w-[80px] truncate">{r.temp_password}</span>
                    {copied === idx
                      ? <Check size={11} className="text-green-500" />
                      : <Copy size={11} className="text-gray-400" />
                    }
                  </button>
                )}
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-gray-400">
            Password di atas hanya ditampilkan sekali. Simpan sebelum menutup jendela ini.
          </p>
        </div>
      )}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Work Groups Panel ──────────────────────────────────────────────────────────

function WorkGroupsPanel() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<Partial<WorkGroupCreate>>({ role: "STAFF" });
  const [saving, setSaving]  = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: groups = [], isLoading } = useQuery<WorkGroup[]>({
    queryKey: ["hris", "work-groups"],
    queryFn: () => hrisWorkGroupsApi.list().then(r => r.data),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.name || !newForm.role) return;
    setSaving(true);
    try {
      await hrisWorkGroupsApi.create(newForm as WorkGroupCreate);
      qc.invalidateQueries({ queryKey: ["hris", "work-groups"] });
      setShowNew(false);
      setNewForm({ role: "STAFF" });
      toastSuccess("Grup berhasil dibuat");
    } catch {
      toastError("Gagal membuat grup");
    } finally { setSaving(false); }
  }

  async function toggleActive(wg: WorkGroup) {
    try {
      await hrisWorkGroupsApi.update(wg.id, { is_active: !wg.is_active });
      qc.invalidateQueries({ queryKey: ["hris", "work-groups"] });
    } catch { toastError("Gagal mengubah status grup"); }
  }

  const field = "block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Kelola sub-grup karyawan STAFF dan WORKER</p>
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNew(true)}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700 text-white"
        >
          Buat Grup
        </Button>
      </div>

      {/* New group form */}
      {showNew && (
        <Card className="border-teal-200 bg-teal-50">
          <form onSubmit={handleCreate} className="space-y-3">
            <p className="text-sm font-semibold text-teal-800">Grup Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Nama Grup *</label>
                <input className={field} placeholder="Tim Admin"
                  value={newForm.name ?? ""} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Role *</label>
                <select className={field} value={newForm.role}
                  onChange={e => setNewForm(f => ({ ...f, role: e.target.value as RoleName }))}>
                  <option value="STAFF">STAFF (Kantor)</option>
                  <option value="WORKER">WORKER (Lapangan)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Deskripsi</label>
              <input className={field} placeholder="Opsional"
                value={newForm.description ?? ""}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Batal</Button>
              <Button type="submit" size="sm" loading={saving}
                className="bg-teal-700 hover:bg-teal-600 text-white border-teal-700">Simpan</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Groups table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Belum ada grup. Buat grup pertama.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Grup", "Role", "Anggota", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map(wg => (
                <React.Fragment key={wg.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{wg.name}</p>
                      {wg.description && <p className="text-gray-400 text-[11px]">{wg.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={wg.role === "STAFF"
                        ? "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                        : "bg-orange-50 text-orange-700 border-orange-200 text-[10px]"}>
                        {wg.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === wg.id ? null : wg.id)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                      >
                        {wg.members.length} anggota {expanded === wg.id ? "▲" : "▼"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={wg.is_active
                        ? "bg-green-50 text-green-700 border-green-200 text-[10px]"
                        : "bg-gray-100 text-gray-500 text-[10px]"}>
                        {wg.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(wg)}
                        className="text-[11px] text-gray-400 hover:text-gray-700 underline"
                      >
                        {wg.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                  {expanded === wg.id && (
                    <tr key={`${wg.id}-members`}>
                      <td colSpan={5} className="px-6 pb-3 bg-gray-50">
                        {wg.members.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Belum ada anggota</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {wg.members.map(m => (
                              <span key={m.id} className="text-[11px] bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-700">
                                {m.employee_no} · {m.full_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Org Chart ─────────────────────────────────────────────────────────────────

function OrgChartNode({
  node,
  depth = 0,
  onSelectDept,
}: {
  node: DepartmentNode;
  depth?: number;
  onSelectDept: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <div className={cn("relative", depth > 0 && "ml-6 pl-4 border-l border-gray-200")}>
      {/* Node card */}
      <div className="flex items-center gap-2 py-1.5">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded text-gray-400",
            hasChildren ? "hover:text-gray-700" : "cursor-default opacity-0"
          )}
          disabled={!hasChildren}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasChildren && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
        </button>

        {/* Dept card */}
        <button
          onClick={() => onSelectDept(node.id)}
          className="flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-lg
                     hover:border-teal-400 hover:shadow-sm transition-all text-left"
        >
          <Building2 size={14} className="text-teal-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800 leading-tight">{node.name}</p>
            <p className="text-[10px] text-gray-400 font-mono uppercase">{node.code}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5 font-medium">
              {node.headcount} karyawan
            </span>
            {node.open_positions > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium flex items-center gap-1">
                <Briefcase size={9} />
                {node.open_positions} lowongan
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgChartNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectDept={onSelectDept}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgChartPanel({ onSelectDept }: { onSelectDept: (id: number) => void }) {
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ["hris", "departments", "tree"],
    queryFn: () => hrisDepartmentsApi.tree().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        Belum ada departemen. Tambahkan dari tab Karyawan.
      </div>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs text-gray-500">
          Klik node untuk filter karyawan berdasarkan departemen
        </p>
      </div>
      <div className="p-4 space-y-0.5">
        {tree.map((root) => (
          <OrgChartNode key={root.id} node={root} depth={0} onSelectDept={onSelectDept} />
        ))}
      </div>
    </Card>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { hasRole } = useRole();
  const canCreateEmployee = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canCreateAccounts = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canManageEmployeeData = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canAssignElevatedRoles = hasRole("SUPER_ADMIN", "MD");
  const allowedBulkRoles: readonly RoleName[] = canAssignElevatedRoles
    ? ASSIGNABLE_ROLES
    : ["WORKER", "STAFF"];
  const [search, setSearch] = useState("");
  const [filterTipe,   setFilterTipe]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept,   setFilterDept]   = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<"employees" | "groups" | "orgchart">("employees");

  // Multi-select state
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showBulk, setShowBulk] = useState(false);

  const LIMIT = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["hris", "employees", { search, filterTipe, filterStatus, filterDept, page }],
    queryFn: () => hrisEmployeesApi.list({
      search:  search || undefined,
      tipe:    filterTipe || undefined,
      status:  filterStatus || undefined,
      dept_id: filterDept,
      skip:    page * LIMIT,
      limit:   LIMIT,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: depts = [] } = useQuery({
    queryKey: ["hris", "departments"],
    queryFn: () => hrisDepartmentsApi.list().then((r) => r.data),
  });

  const { data: employeeStats, isLoading: statsLoading } = useQuery({
    queryKey: ["hris", "dashboard", "stats", "employee-directory"],
    queryFn: () => hrisDashboardApi.getStats().then(r => r.data),
  });

  const employees = data?.items ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / LIMIT);

  // KPI counts come from the full employee dataset, independent of pagination.
  const tetap     = employeeStats?.employment_type_counts.Tetap ?? 0;
  const pkwt      = employeeStats?.employment_type_counts.PKWT ?? 0;
  const outsource = employeeStats?.employment_type_counts.Outsource ?? 0;
  const active    = employeeStats?.active ?? 0;

  // Multi-select helpers
  const allChecked = employees.length > 0 && employees.every((e) => checkedIds.has(e.id));
  const someChecked = !allChecked && employees.some((e) => checkedIds.has(e.id));

  function toggleAll() {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        employees.forEach((e) => next.delete(e.id));
      } else {
        employees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const checkedEmployees = employees.filter((e) => checkedIds.has(e.id));
  const visibleTabs: Array<"employees" | "groups" | "orgchart"> = [
    "employees",
    ...(canManageEmployeeData ? (["groups"] as const) : []),
    "orgchart",
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Direktori karyawan · {total} karyawan terdaftar
          </p>
        </div>
        {canCreateEmployee && <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNew(true)}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
        >
          Tambah Karyawan
        </Button>}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {visibleTabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {t === "employees" ? "Karyawan" : t === "groups" ? "Grup Kerja" : "Struktur Org"}
          </button>
        ))}
      </div>

      {canManageEmployeeData && activeTab === "groups" && <WorkGroupsPanel />}

      {activeTab === "orgchart" && (
        <OrgChartPanel
          onSelectDept={(id) => {
            setFilterDept(id);
            setActiveTab("employees");
          }}
        />
      )}

      {activeTab === "employees" && <>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Aktif",   value: statsLoading ? "…" : active,    color: "text-green-600" },
          { label: "Tetap",         value: statsLoading ? "…" : tetap,     color: "text-teal-600" },
          { label: "PKWT",          value: statsLoading ? "…" : pkwt,      color: "text-blue-600" },
          { label: "Outsource",     value: statsLoading ? "…" : outsource,  color: "text-orange-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="text-center py-3">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 num ${kpi.color}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, NIK, nomor…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
          />
        </div>

        {/* Tipe filter */}
        <select
          value={filterTipe}
          onChange={(e) => { setFilterTipe(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Semua Tipe</option>
          {TIPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        {/* Dept filter */}
        <select
          value={filterDept ?? ""}
          onChange={(e) => { setFilterDept(e.target.value ? +e.target.value : undefined); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Semua Departemen</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Floating selection action bar */}
      {canCreateAccounts && checkedIds.size > 0 && (
        <div className="sticky top-4 z-20 flex items-center justify-between gap-3 rounded-xl bg-teal-700 text-white shadow-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-teal-200" />
            <span className="text-sm font-semibold">{checkedIds.size} karyawan dipilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCheckedIds(new Set())}
              className="text-xs text-teal-200 hover:text-white"
            >
              Batal pilih
            </button>
            <Button
              size="sm"
              className="bg-white text-teal-800 hover:bg-teal-50 border-white text-xs"
              icon={<UserPlus size={13} />}
              onClick={() => setShowBulk(true)}
            >
              Buat Akun ({checkedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {/* Select-all checkbox */}
              {canCreateAccounts && <th className="th w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </th>}
              <th className="th text-left">Karyawan</th>
              <th className="th text-left hidden md:table-cell">Departemen</th>
              <th className="th text-left hidden lg:table-cell">Grade</th>
              <th className="th">Tipe</th>
              <th className="th">Status</th>
              <th className="th hidden md:table-cell">Bergabung</th>
              <th className="th hidden sm:table-cell">Akun</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={canCreateAccounts ? 8 : 7} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={canCreateAccounts ? 8 : 7} className="text-center py-12 text-gray-400 text-sm">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  Tidak ada karyawan ditemukan
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const isChecked = checkedIds.has(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className={cn(
                      "hover:bg-gray-50/50 cursor-pointer transition-colors",
                      isChecked && "bg-teal-50/40",
                    )}
                  >
                    {/* Row checkbox — stop propagation so clicking it doesn't open detail */}
                    {canCreateAccounts && <td className="td w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(emp.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>}

                    {/* Name + employee_no */}
                    <td className="td" onClick={() => setSelected(emp)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                          <span className="text-teal-700 text-xs font-bold">
                            {emp.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                          <p className="text-[10px] text-gray-400 num">{emp.employee_no}</p>
                        </div>
                      </div>
                    </td>

                    {/* Dept */}
                    <td className="td hidden md:table-cell" onClick={() => setSelected(emp)}>
                      <span className="text-sm text-gray-600">
                        {emp.department?.name ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="td hidden lg:table-cell" onClick={() => setSelected(emp)}>
                      <span className="text-sm text-gray-500">
                        {emp.grade ? `${emp.grade.name} (L${emp.grade.level})` : <span className="text-gray-300">—</span>}
                      </span>
                    </td>

                    {/* Tipe */}
                    <td className="td" onClick={() => setSelected(emp)}>
                      <Badge className={cn(TIPE_COLORS[emp.tipe])}>{emp.tipe}</Badge>
                    </td>

                    {/* Status */}
                    <td className="td" onClick={() => setSelected(emp)}>
                      <Badge className={cn(STATUS_COLORS[emp.status])}>
                        {STATUS_LABEL[emp.status]}
                      </Badge>
                    </td>

                    {/* Join date */}
                    <td className="td hidden md:table-cell text-sm text-gray-500 num" onClick={() => setSelected(emp)}>
                      {emp.join_date ? fmtDate(emp.join_date) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Account status */}
                    <td className="td hidden sm:table-cell" onClick={() => setSelected(emp)}>
                      {emp.user_id ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Aktif</Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-400 border-gray-200 text-[10px]">Belum ada</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Menampilkan {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} dari {total}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ‹ Prev
              </button>
              <button
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </Card>

      </> /* end activeTab === "employees" */}

      {/* Detail Modal */}
      {selected && (
        <EmployeeDetailModal
          open={!!selected}
          onClose={() => setSelected(null)}
          employee={selected}
        />
      )}

      {/* New Employee Modal */}
      {canCreateEmployee && <NewEmployeeModal open={showNew} onClose={() => setShowNew(false)} />}

      {/* Bulk Create Accounts Modal */}
      {canCreateAccounts && showBulk && (
        <BulkCreateModal
          open={showBulk}
          employees={checkedEmployees}
          allowedRoles={allowedBulkRoles}
          onClose={() => setShowBulk(false)}
          onDone={() => {
            setCheckedIds(new Set());
            setShowBulk(false);
            qc.invalidateQueries({ queryKey: ["hris", "employees"] });
          }}
        />
      )}
    </div>
  );
}
