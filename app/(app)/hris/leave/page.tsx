"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, PlusCircle, CheckCircle2, XCircle, Clock3, ChevronDown, FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { LeaveRequestModal } from "./components/leave-request-modal";
import { hrisLeaveApi, hrisEmployeesApi } from "@/lib/api";
import type { LeaveRequest, Employee, RoleName } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { useRole } from "@/lib/auth-context";
import { openAuthenticatedFile } from "@/lib/authenticated-files";
import { toastError } from "@/lib/hooks/use-toast";

/* ─── Status config ──────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     cls: "bg-gray-50 text-gray-500 border-gray-200",    icon: <Clock3 size={12} /> },
  submitted: { label: "Menunggu",  cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock3 size={12} /> },
  approved:  { label: "Disetujui", cls: "bg-teal-50 text-teal-700 border-teal-200",    icon: <CheckCircle2 size={12} /> },
  rejected:  { label: "Ditolak",  cls: "bg-red-50 text-red-600 border-red-200",       icon: <XCircle size={12} /> },
};

function canHandleApproval(role: RoleName | null, expectedRole: string | null): boolean {
  if (!role || !expectedRole) return false;
  if (role === "SUPER_ADMIN") return true;
  if (expectedRole === "GA") return role === "GA" || role === "HR";
  if (expectedRole === "PM") return role === "PM" || role === "PROJECT_CONTROL";
  return role === expectedRole;
}

/* ─── Balance cards ──────────────────────────────────────────────────────── */
function BalanceCard({ label, accrued, used, remaining, isPaid }: {
  label: string; accrued: number; used: number; remaining: number; isPaid: boolean;
}) {
  const pct = accrued > 0 ? Math.min(100, (used / accrued) * 100) : 0;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        {isPaid
          ? <span className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">Dibayar</span>
          : <span className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">Tanpa Gaji</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{remaining}</p>
          <p className="text-[11px] text-gray-400">sisa dari {accrued} hari</p>
        </div>
        <p className="text-xs text-gray-400">{used} terpakai</p>
      </div>
      {accrued > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/* ─── Approve/Reject action modal ────────────────────────────────────────── */
function ActionModal({
  open, onClose, request, action, onDone,
}: {
  open: boolean; onClose: () => void;
  request: LeaveRequest | null; action: "approve" | "reject";
  onDone: () => void;
}) {
  const [note, setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  async function submit() {
    if (!request) return;
    setSaving(true); setErr(null);
    try {
      if (action === "approve") await hrisLeaveApi.approve(request.id, note || undefined);
      else                       await hrisLeaveApi.reject(request.id, note || undefined);
      onDone();
      onClose();
      setNote("");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal memproses");
    } finally { setSaving(false); }
  }

  const isApprove = action === "approve";
  return (
    <Modal open={open} onClose={onClose} size="sm"
      title={isApprove ? "Setujui Cuti" : "Tolak Cuti"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}
            className={cn("text-white", isApprove
              ? "bg-teal-600 hover:bg-teal-700"
              : "bg-red-500 hover:bg-red-600")}>
            {saving ? "Memproses…" : isApprove ? "Setujui" : "Tolak"}
          </Button>
        </div>
      }
    >
      {request && (
        <div className="space-y-3">
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs space-y-1">
            <p className="font-semibold text-gray-800">{request.leave_type?.name}</p>
            <p className="text-gray-500">{fmtDate(request.start_date)} → {fmtDate(request.end_date)} · {request.days} hari</p>
            {request.reason && <p className="text-gray-600 italic">"{request.reason}"</p>}
            {request.doctor_cert_url && (
              <button
                type="button"
                onClick={() => openAuthenticatedFile(request.doctor_cert_url!).catch(() => toastError("Gagal membuka surat dokter"))}
                className="mt-2 flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
              >
                <FileText size={13} /> Lihat Surat Dokter
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Catatan {isApprove ? "(opsional)" : "(wajib jika tolak)"}
            </label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Tambahkan keterangan…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function LeavePage() {
  const qc = useQueryClient();
  const { role, hasRole } = useRole();
  const canManageLeave = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [showNew,       setShowNew]       = useState(false);
  const [actionReq,     setActionReq]     = useState<LeaveRequest | null>(null);
  const [actionType,    setActionType]    = useState<"approve" | "reject">("approve");

  /* Employees */
  const { data: empData } = useQuery({
    queryKey: ["hris", "employees", { limit: 500 }],
    queryFn:  () => hrisEmployeesApi.list({ limit: 500 }).then(r => r.data),
  });
  const employees: Employee[] = empData?.items ?? [];
  const selectedEmp = employees.find(e => e.id === selectedEmpId) ?? null;

  /* Leave types */
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hris", "leave-types"],
    queryFn:  () => hrisLeaveApi.listTypes().then(r => r.data),
  });

  /* Balances for selected employee */
  const { data: balances = [], isLoading: balLoad } = useQuery({
    queryKey: ["hris", "leave-balance", selectedEmpId],
    queryFn:  () => hrisLeaveApi.getBalances(selectedEmpId!).then(r => r.data),
    enabled:  !!selectedEmpId,
  });

  /* Leave requests */
  const { data: reqData, isLoading: reqLoad } = useQuery({
    queryKey: ["hris", "leave-requests", { emp: selectedEmpId, status: filterStatus }],
    queryFn:  () => hrisLeaveApi.listRequests({
      employee_id: selectedEmpId ?? undefined,
      status:      filterStatus !== "all" ? filterStatus : undefined,
      limit: 200,
    }).then(r => r.data),
  });
  const requests: LeaveRequest[] = reqData?.items ?? [];

  /* Seed balance mutation */
  const seedMut = useMutation({
    mutationFn: () => hrisLeaveApi.seedBalances(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["hris", "leave-balance"] }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hris", "leave-requests"] });
    qc.invalidateQueries({ queryKey: ["hris", "leave-balance"] });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-600" /> Cuti &amp; Izin
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manajemen cuti, izin, dan persetujuan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canManageLeave && (
            <>
          <Button variant="ghost" size="sm"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
            className="text-gray-600 border border-gray-200 text-xs">
            {seedMut.isPending ? "Seed…" : "Seed Saldo"}
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle size={14} className="mr-1.5" /> Ajukan Cuti
          </Button>
            </>
          )}
        </div>
      </div>

      {/* Employee selector + balance cards */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Karyawan:</label>
            <div className="relative">
              <select
                value={selectedEmpId ?? ""}
                onChange={e => setSelectedEmpId(e.target.value ? Number(e.target.value) : null)}
                className="pl-3 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 appearance-none bg-white"
              >
                <option value="">Semua Karyawan</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.employee_no})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* Balance cards */}
      {selectedEmpId && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Saldo Cuti {new Date().getFullYear()}</h3>
          {balLoad ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : balances.length === 0 ? (
            <div className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-6 text-center">
              Belum ada saldo cuti. Klik <strong>Seed Saldo</strong> untuk inisialisasi.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {balances.map(b => (
                <BalanceCard
                  key={b.id}
                  label={b.leave_type.name}
                  accrued={b.accrued}
                  used={b.used}
                  remaining={b.remaining}
                  isPaid={b.leave_type.is_paid}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request list */}
      <Card padding={false}>
        {/* Filters bar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 mr-2">Pengajuan Cuti</p>
          {["all", "submitted", "approved", "rejected", "draft"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filterStatus === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}>
              {s === "all" ? "Semua" : STATUS_CFG[s]?.label ?? s}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Karyawan","Jenis Cuti","Periode","Hari","Status","Approver","Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reqLoad
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                : requests.length === 0
                  ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                          Belum ada pengajuan cuti
                        </td>
                      </tr>
                    )
                  : requests.map(req => {
                      const emp = employees.find(e => e.id === req.employee_id);
                      const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.draft;
                      return (
                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-gray-900">{emp?.full_name ?? `#${req.employee_id}`}</p>
                            <p className="text-[11px] text-gray-400">{emp?.employee_no}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">{req.leave_type?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                            {fmtDate(req.start_date)} → {fmtDate(req.end_date)}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-900 text-center">{req.days}</td>
                          <td className="px-4 py-3">
                            <Badge className={cfg.cls}>
                              <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {req.current_approver_role ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {req.status === "submitted" && canHandleApproval(role, req.current_approver_role) && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => { setActionReq(req); setActionType("approve"); }}
                                  className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                                >Setujui</button>
                                <span className="text-gray-200">|</span>
                                <button
                                  onClick={() => { setActionReq(req); setActionType("reject"); }}
                                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >Tolak</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <LeaveRequestModal
        open={showNew}
        onClose={() => setShowNew(false)}
        employee={selectedEmp ?? (employees[0] ?? null)}
        leaveTypes={leaveTypes}
        balances={balances}
        onCreated={invalidate}
      />

      <ActionModal
        open={!!actionReq}
        onClose={() => setActionReq(null)}
        request={actionReq}
        action={actionType}
        onDone={invalidate}
      />
    </div>
  );
}
