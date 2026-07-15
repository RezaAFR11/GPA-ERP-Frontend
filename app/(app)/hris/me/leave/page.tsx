"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, PlusCircle, Clock, CheckCircle2, XCircle, Users } from "lucide-react";
import { hrisMeApi, hrisLeaveApi, hrisLeaveCalendarApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/hooks/use-toast";
import { useRole } from "@/lib/auth-context";

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  draft:     { label: "Draft",    cls: "bg-gray-50 text-gray-500 border-gray-200",   Icon: Clock },
  submitted: { label: "Menunggu", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
  approved:  { label: "Disetujui",cls: "bg-teal-50 text-teal-700 border-teal-200",   Icon: CheckCircle2 },
  rejected:  { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200",       Icon: XCircle },
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500";

function RequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [leaveTypeId, setLeaveTypeId] = useState<number | "">("");
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [reason,      setReason]      = useState("");
  const [doctorCert,  setDoctorCert]  = useState<File | null>(null);

  const {
    data: leaveTypes,
    error: leaveTypesError,
    isError: leaveTypesIsError,
    refetch: refetchLeaveTypes,
  } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => hrisLeaveApi.listTypes().then((r) => r.data),
  });

  const selectedType = leaveTypes?.find(type => type.id === Number(leaveTypeId));
  const validRange = Boolean(startDate && endDate && endDate >= startDate);
  const {
    data: durationPreview,
    error: previewError,
    isError: previewIsError,
    isFetching: previewLoading,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["hris", "leave-duration", startDate, endDate],
    queryFn: () => hrisLeaveApi.previewDuration(startDate, endDate).then(r => r.data),
    enabled: validRange,
  });
  const days = durationPreview?.days ?? 0;

  const mutation = useMutation({
    mutationFn: async () => {
      let doctorCertUrl: string | undefined;
      try {
        doctorCertUrl = doctorCert
          ? (await hrisLeaveApi.uploadDoctorCertificate(doctorCert)).data.file_url
          : undefined;
        return await hrisLeaveApi.create({
          leave_type_id: leaveTypeId as number,
          start_date:    startDate,
          end_date:      endDate,
          reason:        reason || undefined,
          doctor_cert_url: doctorCertUrl,
        });
      } catch (error) {
        if (doctorCertUrl) {
          try {
            await hrisLeaveApi.discardDoctorCertificate(doctorCertUrl);
          } catch {
            // The backend also removes stale orphan uploads automatically.
          }
        }
        throw error;
      }
    },
    onSuccess,
    onError: (e: unknown) => toastError(
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Gagal mengajukan cuti",
    ),
  });

  const canSubmit = Boolean(
    leaveTypeId && validRange && durationPreview && days > 0
    && (!selectedType?.requires_doctor_cert || doctorCert)
    && !previewLoading && !mutation.isPending
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Ajukan Cuti / Izin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Leave Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 block">Jenis Cuti</label>
          <select
            value={leaveTypeId}
            onChange={(e) => {
              setLeaveTypeId(e.target.value ? Number(e.target.value) : "");
              setDoctorCert(null);
            }}
            className={inputCls}
          >
            <option value="">Pilih jenis cuti...</option>
            {(leaveTypes ?? []).map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>
        </div>
        {leaveTypesIsError && (
          <QueryErrorState error={leaveTypesError} onRetry={() => refetchLeaveTypes()} compact />
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 block">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 block">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {startDate && endDate && (
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
            <p className="text-sm text-teal-700 font-medium">
              {previewLoading ? "Menghitung..." : `${days} hari kerja`}
            </p>
            {!!durationPreview?.excluded_holidays.length && (
              <p className="mt-1 text-[11px] text-gray-500">
                Libur tidak dihitung: {durationPreview.excluded_holidays.map(h => h.name).join(", ")}
              </p>
            )}
          </div>
        )}
        {previewIsError && (
          <QueryErrorState error={previewError} onRetry={() => refetchPreview()} compact />
        )}

        {selectedType?.requires_doctor_cert && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 block">Surat Dokter *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setDoctorCert(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-teal-700"
            />
            <p className="text-[11px] text-gray-400">PDF, JPG, atau PNG. Maksimal 10 MB.</p>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 block">Keterangan (opsional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan pengajuan cuti..."
            className={cn(inputCls, "resize-none")}
            rows={3}
          />
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-600">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
              ?? "Gagal mengajukan. Coba lagi."}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-sm">Batal</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="flex-1 text-sm bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
          >
            {mutation.isPending ? "Mengajukan..." : "Ajukan Cuti"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const LEAVE_COLORS = [
  "bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function TeamCalendarPanel() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const {
    data: profile,
    error: profileError,
    isError: profileIsError,
    isLoading: profileIsLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["hris-me-profile"],
    queryFn: () => hrisMeApi.getProfile().then((r) => r.data),
  });

  const {
    data: leaves = [],
    error: leavesError,
    isError: leavesIsError,
    isLoading,
    refetch: refetchLeaves,
  } = useQuery({
    queryKey: ["hris-team-calendar", year, month, profile?.department?.id],
    queryFn: () => hrisLeaveCalendarApi.get({
      year, month, dept_id: profile?.department?.id,
    }).then((r) => r.data),
    enabled: Boolean(profile),
  });

  const monthDays = new Date(year, month, 0).getDate();
  const days = Array.from({ length: monthDays }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, index) => now.getFullYear() - 2 + index);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-${String(monthDays).padStart(2, "0")}`;
  const rulerDays = Array.from(new Set([1, 5, 10, 15, 20, 25, monthDays]))
    .filter(day => day <= monthDays)
    .sort((a, b) => a - b);

  // Assign unique colors per employee
  const empColorMap = new Map<number, string>();
  leaves.forEach((l) => {
    if (!empColorMap.has(l.employee_id)) {
      empColorMap.set(l.employee_id, LEAVE_COLORS[empColorMap.size % LEAVE_COLORS.length]);
    }
  });

  const MONTHS_ID = ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none"
          value={month} onChange={e => setMonth(parseInt(e.target.value))}>
          {MONTHS_ID.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none"
          value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {profile?.department && (
          <span className="text-xs text-gray-400">Dept: {profile.department.name}</span>
        )}
      </div>

      {profileIsLoading || isLoading ? (
        <div className="text-center py-8 text-sm text-gray-400">Memuat...</div>
      ) : profileIsError ? (
        <QueryErrorState error={profileError} onRetry={() => refetchProfile()} compact />
      ) : leavesIsError ? (
        <QueryErrorState error={leavesError} onRetry={() => refetchLeaves()} compact />
      ) : leaves.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          <CalendarDays size={28} className="mx-auto mb-2 opacity-30" />
          Tidak ada cuti disetujui bulan ini
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave) => {
            const color = empColorMap.get(leave.employee_id) ?? LEAVE_COLORS[0];
            const start = leave.start_date < monthStart ? 1 : Number(leave.start_date.slice(8, 10));
            const end   = leave.end_date > monthEnd ? monthDays : Number(leave.end_date.slice(8, 10));
            return (
              <div key={`${leave.employee_id}-${leave.start_date}-${leave.end_date}-${leave.leave_type}`}
                className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs font-medium text-gray-700 truncate">{leave.employee_name}</div>
                <div className="flex-1 relative h-6 bg-gray-50 rounded-lg overflow-hidden">
                  {/* Tick marks */}
                  {days.map(d => (
                    <div key={d}
                      className={cn(
                        "absolute top-0 bottom-0 border-r border-gray-100",
                        d >= start && d <= end ? color : ""
                      )}
                      style={{ left: `${((d - 1) / monthDays) * 100}%`, width: `${100 / monthDays}%` }}
                    />
                  ))}
                </div>
                <div className="shrink-0 text-[10px] text-gray-400">{leave.days} hari</div>
              </div>
            );
          })}
          {/* Day number ruler */}
          <div className="flex items-center gap-3">
            <div className="w-32 shrink-0" />
            <div className="flex-1 relative h-4 text-[9px] text-gray-300">
              {rulerDays.map(d => (
                <span
                  key={d}
                  style={{ left: `${((d - 1) / Math.max(monthDays - 1, 1)) * 100}%` }}
                  className="absolute -translate-x-1/2"
                >{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyLeavePage() {
  const { isHR, isPM } = useRole();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  const [filter, setFilter] = useState<string | null>(null);
  const qc = useQueryClient();
  const canViewTeam = isHR || isPM;

  const {
    data: balances,
    error: balancesError,
    isError: balancesIsError,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: ["hris-me-leave-balance"],
    queryFn: () => hrisMeApi.getLeaveBalance().then((r) => r.data),
  });

  const {
    data: requests,
    error: requestsError,
    isError: requestsIsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["hris-me-leave-requests", filter],
    queryFn: () => hrisMeApi.getLeaveRequests(filter ?? undefined).then((r) => r.data),
  });

  function handleSuccess() {
    setShowModal(false);
    qc.invalidateQueries({ queryKey: ["hris-me-leave-requests"] });
    qc.invalidateQueries({ queryKey: ["hris-me-leave-balance"] });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Cuti & Izin</h1>
        <div className="flex items-center gap-2">
          {/* Tab toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setActiveTab("my")}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === "my" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <CalendarDays size={12} className="inline mr-1" />Saya
            </button>
            {canViewTeam && (
              <button onClick={() => setActiveTab("team")}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === "team" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <Users size={12} className="inline mr-1" />Tim
              </button>
            )}
          </div>
          {activeTab === "my" && (
            <Button size="sm" onClick={() => setShowModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white border-teal-600 text-xs">
              <PlusCircle size={13} className="mr-1" /> Ajukan
            </Button>
          )}
        </div>
      </div>

      {/* Team Calendar */}
      {activeTab === "team" && canViewTeam && <TeamCalendarPanel />}

      {activeTab === "my" && balancesIsError && (
        <QueryErrorState error={balancesError} onRetry={() => refetchBalances()} compact />
      )}

      {/* Balance Cards */}
      {activeTab === "my" && balances && balances.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {balances.filter((b) => b.max_days !== null).map((b) => (
            <Card key={b.leave_type_id} className="border">
              <div className="p-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{b.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{b.remaining}</p>
                <p className="text-[10px] text-gray-400">dari {b.accrued} hari</p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      b.accrued > 0 && b.remaining / b.accrued > 0.5 ? "bg-teal-400" :
                      b.accrued > 0 && b.remaining / b.accrued > 0.2 ? "bg-amber-400" : "bg-red-400",
                    )}
                    style={{
                      width: `${b.accrued ? Math.min(100, Math.max(0, (b.remaining / b.accrued) * 100)) : 0}%`,
                    }}
                  />
                </div>
                {!b.is_paid && (
                  <p className="text-[9px] text-gray-400 mt-1">Tidak dibayar</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* My Requests section */}
      {activeTab === "my" && <>

      {requestsIsError && (
        <QueryErrorState error={requestsError} onRetry={() => refetchRequests()} compact />
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[null, "submitted", "approved", "rejected"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setFilter(s)}
            className={cn(
              "shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
              filter === s
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-teal-300",
            )}
          >
            {s === null ? "Semua" :
             s === "submitted" ? "Menunggu" :
             s === "approved"  ? "Disetujui" : "Ditolak"}
          </button>
        ))}
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {(requests ?? []).map((req) => {
          const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.draft;
          const Icon = cfg.Icon;
          return (
            <Card key={req.id} className="border">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-[10px] px-2 py-0", cfg.cls)}>
                        <Icon size={9} className="mr-1" />
                        {cfg.label}
                      </Badge>
                      <span className="text-xs text-gray-400">{req.leave_type?.name}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(req.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      {req.start_date !== req.end_date && (
                        <> – {new Date(req.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{req.days} hari</p>
                    {req.reason && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{req.reason}</p>
                    )}
                    {req.status === "submitted" && req.current_approver_role && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        Menunggu persetujuan: {req.current_approver_role}
                      </p>
                    )}
                  </div>
                </div>

                {/* Approval timeline */}
                {req.approval_history && req.approval_history.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1.5">
                    {req.approval_history.map((h, i) => {
                      const isApproved = h.action === "approve";
                      const isRejected = h.action === "reject";
                      const actionLabel = h.action === "submit" ? "mengajukan"
                        : isApproved ? "menyetujui"
                        : isRejected ? "menolak" : h.action;
                      return (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                          isApproved ? "bg-teal-100 text-teal-600"
                            : isRejected ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600",
                        )}>
                          {isApproved ? <CheckCircle2 size={8} />
                            : isRejected ? <XCircle size={8} /> : <Clock size={8} />}
                        </div>
                        <span className="font-medium text-gray-600">{h.actor}</span>
                        <span>{actionLabel}</span>
                        {h.note && <span className="italic">"{h.note}"</span>}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {!requestsIsError && requests?.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-400">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            Belum ada pengajuan cuti
          </div>
        )}
      </div>

      </> /* end activeTab === "my" */}

      {showModal && (
        <RequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
