"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, User, FileText, Pencil, X, Check, RefreshCw } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hrisEmployeesApi, hrisDepartmentsApi, hrisJobGradesApi, hrisWorkLocationApi, hrisDataChangeApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { useRole } from "@/lib/auth-context";
import { cn, fmtDate } from "@/lib/utils";
import type { Employee, EmpDocType, EmployeeDataChangeRequest } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000";

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
const DOC_TYPES: { value: EmpDocType; label: string }[] = [
  { value: "KTP",      label: "KTP" },
  { value: "NPWP",     label: "NPWP" },
  { value: "BPJS_TK",  label: "BPJS Ketenagakerjaan" },
  { value: "BPJS_KES", label: "BPJS Kesehatan" },
  { value: "IJAZAH",   label: "Ijazah" },
  { value: "SKCK",     label: "SKCK" },
  { value: "OTHER",    label: "Lainnya" },
];

type Tab = "profile" | "documents" | "data-changes";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

// ── Shared field styles ────────────────────────────────────────────────────────
const INPUT_CLS = "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
const SELECT_CLS = "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0 items-center">
      <span className="text-xs text-gray-400 w-36 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

type EditForm = {
  full_name: string;
  nik: string;
  npwp: string;
  email: string;
  phone: string;
  site: string;
  tipe: string;
  status: string;
  dept_id: string;
  grade_id: string;
  work_location_id: string;
  join_date: string;
  end_date: string;
  bank_name: string;
  bank_account: string;
  bpjs_tk_no: string;
  bpjs_kes_no: string;
  ptkp_status: string;
};

function empToForm(d: Employee): EditForm {
  return {
    full_name:        d.full_name ?? "",
    nik:              d.nik ?? "",
    npwp:             d.npwp ?? "",
    email:            d.email ?? "",
    phone:            d.phone ?? "",
    site:             d.site ?? "",
    tipe:             d.tipe ?? "Tetap",
    status:           d.status ?? "active",
    dept_id:          d.dept_id != null ? String(d.dept_id) : "",
    grade_id:         d.grade_id != null ? String(d.grade_id) : "",
    work_location_id: (d as any).work_location_id != null ? String((d as any).work_location_id) : "",
    join_date:        d.join_date ? d.join_date.slice(0, 10) : "",
    end_date:         d.end_date ? d.end_date.slice(0, 10) : "",
    bank_name:        d.bank_name ?? "",
    bank_account:     d.bank_account ?? "",
    bpjs_tk_no:       d.bpjs_tk_no ?? "",
    bpjs_kes_no:      d.bpjs_kes_no ?? "",
    ptkp_status:      (d as any).ptkp_status ?? "TK/0",
  };
}

const ROLES = ["WORKER", "STAFF", "GA", "HR", "FINANCE", "COST_CONTROL", "PM", "PROJECT_CONTROL", "MD"] as const;

function AccountSection({ employee, onCreated }: { employee: Employee; onCreated: () => void }) {
  const [role, setRole] = useState("WORKER");
  const [tempPass, setTempPass] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      hrisEmployeesApi.bulkCreateAccounts([{ employee_id: employee.id, role_name: role }]),
    onSuccess: (res) => {
      const result = res.data.results[0];
      if (result.status === "created") {
        toastSuccess("Akun berhasil dibuat");
        setTempPass(result.temp_password ?? null);
        onCreated();
      } else {
        toastError(result.detail);
      }
    },
    onError: () => toastError("Gagal membuat akun"),
  });

  if (employee.user_id) {
    return (
      <div className="flex gap-3 py-2 border-b border-gray-50">
        <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">Akun Sistem</span>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Aktif</Badge>
          <span className="text-sm text-gray-900 font-medium">{(employee as any).user?.email ?? "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-2 border-b border-gray-50">
      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">Akun Sistem</span>
      <div className="flex-1 space-y-2">
        {tempPass ? (
          <div className="rounded-lg bg-teal-50 border border-teal-200 p-2 space-y-1">
            <p className="text-xs text-teal-700 font-medium">Akun dibuat! Simpan password sementara:</p>
            <p className="font-mono text-sm text-teal-900 select-all break-all">{tempPass}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {employee.email ? (
              <>
                <select
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
                  {mut.isPending ? "..." : "Buat Akun"}
                </Button>
              </>
            ) : (
              <span className="text-xs text-amber-600">Isi email karyawan dulu</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployeeDetailModal({ open, onClose, employee: emp }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [docType, setDocType] = useState<EmpDocType>("KTP");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(empToForm(emp));
  const { isSuperAdmin, isHR } = useRole();
  const canEdit = isSuperAdmin || isHR;
  const qc = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["hris", "employee", emp.id],
    queryFn:  () => hrisEmployeesApi.get(emp.id).then((r) => r.data),
    enabled:  open,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hris", "departments"],
    queryFn:  () => hrisDepartmentsApi.list().then((r) => r.data),
    enabled:  open && canEdit,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["hris", "job-grades"],
    queryFn:  () => hrisJobGradesApi.list().then((r) => r.data),
    enabled:  open && canEdit,
  });

  const { data: workLocations = [] } = useQuery({
    queryKey: ["hris", "work-locations"],
    queryFn:  () => hrisWorkLocationApi.list().then((r) => r.data),
    enabled:  open && canEdit,
  });

  const { data: dataChanges = [], isLoading: dcLoad } = useQuery<EmployeeDataChangeRequest[]>({
    queryKey: ["hris", "data-change-requests", emp.id],
    queryFn: () => hrisDataChangeApi.list({ employee_id: emp.id }).then(r => r.data),
    enabled: open && tab === "data-changes" && canEdit,
  });

  const dcApproveMut = useMutation({
    mutationFn: (id: number) => hrisDataChangeApi.approve(id),
    onSuccess: () => {
      toastSuccess("Permintaan data disetujui dan diterapkan");
      qc.invalidateQueries({ queryKey: ["hris", "data-change-requests", emp.id] });
      qc.invalidateQueries({ queryKey: ["hris", "employee", emp.id] });
      qc.invalidateQueries({ queryKey: ["hris", "employees"] });
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyetujui"),
  });

  const dcRejectMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => hrisDataChangeApi.reject(id, note),
    onSuccess: () => {
      toastSuccess("Permintaan data ditolak");
      qc.invalidateQueries({ queryKey: ["hris", "data-change-requests", emp.id] });
    },
    onError: () => toastError("Gagal menolak"),
  });

  // Sync form when detail loads
  useEffect(() => {
    if (detail) setForm(empToForm(detail));
  }, [detail]);

  // Reset edit state when modal closes
  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  const uploadDocMutation = useMutation({
    mutationFn: ({ file }: { file: File }) =>
      hrisEmployeesApi.uploadDocument(emp.id, docType, file),
    onSuccess: () => {
      toastSuccess("Dokumen berhasil diunggah");
      qc.invalidateQueries({ queryKey: ["hris", "employee", emp.id] });
      qc.invalidateQueries({ queryKey: ["hris", "employees"] });
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal mengunggah dokumen"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      hrisEmployeesApi.update(emp.id, payload as any),
    onSuccess: () => {
      toastSuccess("Data karyawan berhasil disimpan");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["hris", "employee", emp.id] });
      qc.invalidateQueries({ queryKey: ["hris", "employees"] });
    },
    onError: (e: unknown) =>
      toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal menyimpan data"),
  });

  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadDocMutation.mutate({ file });
    e.target.value = "";
  }

  function set(field: keyof EditForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    const payload: Record<string, unknown> = {
      full_name:    form.full_name    || null,
      nik:          form.nik          || null,
      npwp:         form.npwp         || null,
      email:        form.email        || null,
      phone:        form.phone        || null,
      site:         form.site         || null,
      tipe:         form.tipe         || null,
      status:       form.status       || null,
      dept_id:      form.dept_id      ? Number(form.dept_id)          : null,
      grade_id:     form.grade_id     ? Number(form.grade_id)         : null,
      work_location_id: form.work_location_id ? Number(form.work_location_id) : null,
      join_date:    form.join_date    || null,
      end_date:     form.end_date     || null,
      bank_name:    form.bank_name    || null,
      bank_account: form.bank_account || null,
      bpjs_tk_no:   form.bpjs_tk_no   || null,
      bpjs_kes_no:  form.bpjs_kes_no  || null,
      ptkp_status:  form.ptkp_status  || null,
    };
    updateMutation.mutate(payload);
  }

  const d = detail ?? emp;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile",      label: "Profil",           icon: User },
    { key: "documents",    label: "Dokumen",          icon: FileText },
    { key: "data-changes", label: "Permintaan Data",  icon: RefreshCw },
  ];

  const statusLabel: Record<string, string> = {
    active: "Aktif", probation: "Probasi", leave: "Cuti Panjang", terminated: "Berhenti",
  };

  const PTKP_OPTIONS = ["TK/0","TK/1","TK/2","TK/3","K/0","K/1","K/2","K/3","K/I/0","K/I/1","K/I/2","K/I/3"];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={d.full_name}
      subtitle={`${d.employee_no} · ${d.department?.name ?? "Tidak ada departemen"}`}
    >
      {/* Badges + Edit button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(TIPE_COLORS[d.tipe])}>{d.tipe}</Badge>
          <Badge className={cn(STATUS_COLORS[d.status])}>
            {statusLabel[d.status] ?? d.status}
          </Badge>
          {d.grade && (
            <span className="text-xs text-gray-400">{d.grade.name} (L{d.grade.level})</span>
          )}
        </div>

        {canEdit && tab === "profile" && (
          isEditing ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setIsEditing(false); setForm(empToForm(d)); }}
                disabled={updateMutation.isPending}
              >
                <X size={14} className="mr-1" /> Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Check size={14} className="mr-1" />
                {updateMutation.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
             
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={13} className="mr-1.5" /> Edit
            </Button>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit mb-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setIsEditing(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────────────────────────────── */}
      {tab === "profile" && !isEditing && (
        <div className="space-y-0">
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2">Data Pribadi</p>
          <InfoRow label="NIK"     value={d.nik} />
          <InfoRow label="NPWP"    value={d.npwp} />
          <InfoRow label="Email"   value={d.email} />
          <InfoRow label="Telepon" value={d.phone} />
          <InfoRow label="Site"    value={d.site} />
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">Kepegawaian</p>
          <InfoRow label="Tanggal Masuk"   value={d.join_date ? fmtDate(d.join_date) : null} />
          <InfoRow label="Tanggal Selesai" value={d.end_date  ? fmtDate(d.end_date)  : null} />
          <InfoRow label="Departemen"      value={d.department?.name} />
          <InfoRow label="Grade"           value={d.grade ? `${d.grade.name} (Level ${d.grade.level})` : null} />
          <AccountSection employee={d} onCreated={() => qc.invalidateQueries({ queryKey: ["hris", "employees"] })} />
          <InfoRow label="Lokasi Absensi"  value={(d as any).work_location?.name ?? null} />
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">BPJS & Bank</p>
          <InfoRow label="BPJS TK No."  value={d.bpjs_tk_no} />
          <InfoRow label="BPJS Kes No." value={d.bpjs_kes_no} />
          <InfoRow label="Bank"         value={d.bank_name} />
          <InfoRow label="No. Rekening" value={d.bank_account} />
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">Pajak</p>
          <InfoRow label="PTKP Status" value={(d as any).ptkp_status ?? "TK/0"} />
        </div>
      )}

      {/* ── Edit form ───────────────────────────────────────────────────────── */}
      {tab === "profile" && isEditing && (
        <div className="space-y-0">
          {/* Data Pribadi */}
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2">Data Pribadi</p>
          <FormRow label="Nama Lengkap">
            <input className={INPUT_CLS} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nama lengkap" />
          </FormRow>
          <FormRow label="NIK">
            <input className={INPUT_CLS} value={form.nik} onChange={(e) => set("nik", e.target.value)} placeholder="16 digit NIK" maxLength={16} />
          </FormRow>
          <FormRow label="NPWP">
            <input className={INPUT_CLS} value={form.npwp} onChange={(e) => set("npwp", e.target.value)} placeholder="XX.XXX.XXX.X-XXX.XXX" maxLength={20} />
          </FormRow>
          <FormRow label="Email">
            <input className={INPUT_CLS} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@perusahaan.com" />
          </FormRow>
          <FormRow label="Telepon">
            <input className={INPUT_CLS} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xxxxxxxxxx" maxLength={20} />
          </FormRow>
          <FormRow label="Site">
            <input className={INPUT_CLS} value={form.site} onChange={(e) => set("site", e.target.value)} placeholder="Mis. Jakarta, Berau" />
          </FormRow>

          {/* Kepegawaian */}
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">Kepegawaian</p>
          <FormRow label="Tipe Karyawan">
            <select className={SELECT_CLS} value={form.tipe} onChange={(e) => set("tipe", e.target.value)}>
              <option value="Tetap">Tetap</option>
              <option value="PKWT">PKWT</option>
              <option value="Outsource">Outsource</option>
            </select>
          </FormRow>
          <FormRow label="Status">
            <select className={SELECT_CLS} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Aktif</option>
              <option value="probation">Probasi</option>
              <option value="leave">Cuti Panjang</option>
              <option value="terminated">Berhenti</option>
            </select>
          </FormRow>
          <FormRow label="Departemen">
            <select className={SELECT_CLS} value={form.dept_id} onChange={(e) => set("dept_id", e.target.value)}>
              <option value="">— Pilih departemen —</option>
              {departments.map((dep) => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Grade">
            <select className={SELECT_CLS} value={form.grade_id} onChange={(e) => set("grade_id", e.target.value)}>
              <option value="">— Pilih grade —</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.name} (L{g.level})</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Lokasi Absensi">
            <select className={SELECT_CLS} value={form.work_location_id} onChange={(e) => set("work_location_id", e.target.value)}>
              <option value="">— Semua lokasi aktif —</option>
              {workLocations.map((wl) => (
                <option key={wl.id} value={wl.id}>
                  {wl.name} ({wl.location_type === "home_office" ? "HO" : wl.location_type === "site" ? "Site" : "Lainnya"} · r={wl.radius_meters}m)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Menentukan lokasi GPS yang divalidasi saat clock-in. Kosong = cek semua lokasi aktif.
            </p>
          </FormRow>
          <FormRow label="Tanggal Masuk">
            <input className={INPUT_CLS} type="date" value={form.join_date} onChange={(e) => set("join_date", e.target.value)} />
          </FormRow>
          <FormRow label="Tanggal Selesai">
            <input className={INPUT_CLS} type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </FormRow>

          {/* BPJS & Bank */}
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">BPJS & Bank</p>
          <FormRow label="BPJS TK No.">
            <input className={INPUT_CLS} value={form.bpjs_tk_no} onChange={(e) => set("bpjs_tk_no", e.target.value)} placeholder="No. BPJS Ketenagakerjaan" maxLength={30} />
          </FormRow>
          <FormRow label="BPJS Kes No.">
            <input className={INPUT_CLS} value={form.bpjs_kes_no} onChange={(e) => set("bpjs_kes_no", e.target.value)} placeholder="No. BPJS Kesehatan" maxLength={30} />
          </FormRow>
          <FormRow label="Bank">
            <select className={SELECT_CLS} value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)}>
              <option value="">— Pilih bank —</option>
              {["BCA","BNI","BRI","Mandiri","BSI","CIMB Niaga","Danamon","Permata","BTN","Lainnya"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="No. Rekening">
            <input className={INPUT_CLS} value={form.bank_account} onChange={(e) => set("bank_account", e.target.value)} placeholder="Nomor rekening" maxLength={50} />
          </FormRow>

          {/* Pajak */}
          <p className="text-[10px] font-semibold tracking-widest text-teal-600 uppercase mb-2 mt-5">Pajak</p>
          <FormRow label="PTKP Status">
            <select className={SELECT_CLS} value={form.ptkp_status} onChange={(e) => set("ptkp_status", e.target.value)}>
              {PTKP_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormRow>
        </div>
      )}

      {/* ── Documents tab ───────────────────────────────────────────────────── */}
      {tab === "documents" && (
        <div className="space-y-4">
          {canEdit && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-3">Unggah Dokumen Baru</p>
              <div className="flex gap-3 items-center flex-wrap">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as EmpDocType)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
                <label className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-all",
                  "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
                  uploadDocMutation.isPending && "opacity-50 pointer-events-none"
                )}>
                  <Upload size={12} />
                  {uploadDocMutation.isPending ? "Mengunggah…" : "Pilih File"}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Format: PDF, JPG, PNG · Maks 10MB</p>
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !d.documents?.length ? (
            <div className="text-center py-8 text-gray-400 text-sm">Belum ada dokumen yang diunggah</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {d.documents.map((doc) => {
                const label = DOC_TYPES.find((dt) => dt.value === doc.doc_type)?.label ?? doc.doc_type;
                return (
                  <div key={doc.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(doc.uploaded_at)}</p>
                    </div>
                    <a
                      href={`${BASE_URL}${doc.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Buka
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Permintaan Data tab ─────────────────────────────────────────────── */}
      {tab === "data-changes" && (
        <div className="space-y-3">
          {dcLoad ? (
            <Skeleton className="h-32 w-full" />
          ) : dataChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Tidak ada permintaan perubahan data</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {dataChanges.map(dc => {
                const isPending = dc.status === "pending";
                const statusColor = dc.status === "approved"
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : dc.status === "rejected"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";
                const statusLabel = dc.status === "approved" ? "Disetujui"
                  : dc.status === "rejected" ? "Ditolak" : "Menunggu";
                return (
                  <div key={dc.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-800 capitalize">
                            {dc.field_name.replace(/_/g, " ")}
                          </span>
                          <Badge className={cn("text-[10px]", statusColor)}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="line-through text-gray-400">{dc.old_value || "—"}</span>
                          <span>→</span>
                          <span className="font-medium text-gray-800">{dc.new_value}</span>
                        </div>
                        {dc.reason && (
                          <p className="text-[11px] text-gray-400 mt-1">Alasan: {dc.reason}</p>
                        )}
                        {dc.review_note && (
                          <p className="text-[11px] text-red-500 mt-1">Catatan: {dc.review_note}</p>
                        )}
                        <p className="text-[10px] text-gray-300 mt-1">
                          {new Date(dc.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      {isPending && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => dcApproveMut.mutate(dc.id)}
                            disabled={dcApproveMut.isPending}
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                          >
                            <Check size={12} /> Setuju
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt("Catatan penolakan (opsional):") ?? "";
                              dcRejectMut.mutate({ id: dc.id, note });
                            }}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X size={12} /> Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
