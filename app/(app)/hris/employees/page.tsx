"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Search, ChevronDown, Loader2, Building2, GraduationCap,
} from "lucide-react";
import { hrisEmployeesApi, hrisDepartmentsApi, hrisJobGradesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { cn, fmtDate } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import type { Employee, EmploymentType, EmployeeStatus, EmployeeCreate } from "@/lib/types";
import EmployeeDetailModal from "./components/employee-detail-modal";

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
      toastError((e as any)?.response?.data?.detail ?? "Gagal menyimpan karyawan"),
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [filterTipe,   setFilterTipe]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept,   setFilterDept]   = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [showNew, setShowNew] = useState(false);

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

  const employees = data?.items ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / LIMIT);

  // KPI counts from current filtered list
  const tetap     = employees.filter((e) => e.tipe === "Tetap").length;
  const pkwt      = employees.filter((e) => e.tipe === "PKWT").length;
  const outsource = employees.filter((e) => e.tipe === "Outsource").length;
  const active    = employees.filter((e) => e.status === "active").length;

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
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNew(true)}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
        >
          Tambah Karyawan
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Aktif",   value: isLoading ? "…" : active,    color: "text-green-600" },
          { label: "Tetap",         value: isLoading ? "…" : tetap,     color: "text-teal-600" },
          { label: "PKWT",          value: isLoading ? "…" : pkwt,      color: "text-blue-600" },
          { label: "Outsource",     value: isLoading ? "…" : outsource,  color: "text-orange-600" },
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

      {/* Table */}
      <Card padding={false}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th text-left">Karyawan</th>
              <th className="th text-left hidden md:table-cell">Departemen</th>
              <th className="th text-left hidden lg:table-cell">Grade</th>
              <th className="th">Tipe</th>
              <th className="th">Status</th>
              <th className="th hidden md:table-cell">Bergabung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  Tidak ada karyawan ditemukan
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(emp)}
                >
                  {/* Name + employee_no */}
                  <td className="td">
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
                  <td className="td hidden md:table-cell">
                    <span className="text-sm text-gray-600">
                      {emp.department?.name ?? <span className="text-gray-300">—</span>}
                    </span>
                  </td>

                  {/* Grade */}
                  <td className="td hidden lg:table-cell">
                    <span className="text-sm text-gray-500">
                      {emp.grade ? `${emp.grade.name} (L${emp.grade.level})` : <span className="text-gray-300">—</span>}
                    </span>
                  </td>

                  {/* Tipe */}
                  <td className="td">
                    <Badge className={cn(TIPE_COLORS[emp.tipe])}>{emp.tipe}</Badge>
                  </td>

                  {/* Status */}
                  <td className="td">
                    <Badge className={cn(STATUS_COLORS[emp.status])}>
                      {STATUS_LABEL[emp.status]}
                    </Badge>
                  </td>

                  {/* Join date */}
                  <td className="td hidden md:table-cell text-sm text-gray-500 num">
                    {emp.join_date ? fmtDate(emp.join_date) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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

      {/* Detail Modal */}
      {selected && (
        <EmployeeDetailModal
          open={!!selected}
          onClose={() => setSelected(null)}
          employee={selected}
        />
      )}

      {/* New Employee Modal */}
      <NewEmployeeModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
