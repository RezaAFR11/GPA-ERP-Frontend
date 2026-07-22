"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  hrisDepartmentsApi,
  hrisEmployeesApi,
  hrisJobGradesApi,
} from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import type {
  BulkAccountResult,
  Employee,
  EmployeeCreate,
  EmploymentType,
  RoleName,
} from "@/lib/types";
import { cn, ROLE_LABEL } from "@/lib/utils";

import { TIPE_OPTIONS } from "./employee-page-config";

// ── New Employee Form ──────────────────────────────────────────────────────────

export function NewEmployeeModal({
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

export function BulkCreateModal({ open, employees, allowedRoles, onClose, onDone }: BulkCreateModalProps) {
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
