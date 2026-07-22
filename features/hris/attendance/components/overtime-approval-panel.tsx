"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisOvertimeApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { OvertimeRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

type OvertimeSortKey =
  | "employee"
  | "date"
  | "planned_hours"
  | "reason"
  | "status";

/* ─── Overtime approval panel ────────────────────────────────────────────── */
const OT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft", submitted: "Diajukan", approved: "Disetujui", rejected: "Ditolak",
};
const OT_STATUS_COLOR: Record<string, string> = {
  draft:     "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-teal-50 text-teal-700 border-teal-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
};

export function OvertimeApprovalPanel() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"" | "submitted" | "approved" | "rejected">("");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const tableSort = useTableSort<OvertimeSortKey>("date", "desc");

  const { data: requests = [], isLoading } = useQuery<OvertimeRequest[]>({
    queryKey: ["hris", "overtime-requests", filterStatus],
    queryFn: () => hrisOvertimeApi.list(filterStatus ? { status: filterStatus } : undefined).then(r => r.data),
  });
  const sortedRequests = sortTableRows(requests, tableSort.sortKey, tableSort.sortDirection, {
    employee: (request) => request.employee_name,
    date: (request) => request.date,
    planned_hours: (request) => request.planned_hours,
    reason: (request) => request.reason,
    status: (request) => request.status,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => hrisOvertimeApi.approve(id),
    onSuccess: () => {
      toastSuccess("Pengajuan lembur disetujui");
      qc.invalidateQueries({ queryKey: ["hris", "overtime-requests"] });
    },
    onError: () => toastError("Gagal menyetujui"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => hrisOvertimeApi.reject(id, note),
    onSuccess: () => {
      toastSuccess("Pengajuan lembur ditolak");
      qc.invalidateQueries({ queryKey: ["hris", "overtime-requests"] });
      setRejectId(null);
      setRejectNote("");
    },
    onError: () => toastError("Gagal menolak"),
  });

  const pending = requests.filter(r => r.status === "submitted").length;

  return (
    <>
      <Card padding={false}>
        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { value: "", label: "Semua" },
              { value: "submitted", label: `Diajukan${pending > 0 ? ` (${pending})` : ""}` },
              { value: "approved",  label: "Disetujui" },
              { value: "rejected",  label: "Ditolak" },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filterStatus === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Karyawan" column="employee" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Tanggal" column="date" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Rencana Jam" column="planned_hours" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Alasan" column="reason" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} />
                <th className="th">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      ))}
                    </tr>
                  ))
                : requests.length === 0
                  ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                          Tidak ada pengajuan lembur
                        </td>
                      </tr>
                    )
                  : sortedRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-900">{req.employee_name ?? `#${req.employee_id}`}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700">{req.date}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{req.planned_hours} jam</td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                          <span className="line-clamp-2">{req.reason}</span>
                          {req.rejection_reason && (
                            <span className="block text-red-500 mt-0.5 text-[11px]">Alasan tolak: {req.rejection_reason}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-[10px]", OT_STATUS_COLOR[req.status])}>
                            {OT_STATUS_LABEL[req.status] ?? req.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {req.status === "submitted" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => approveMut.mutate(req.id)}
                                disabled={approveMut.isPending}
                                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} /> Setuju
                              </button>
                              <button
                                onClick={() => { setRejectId(req.id); setRejectNote(""); }}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                <AlertCircle size={13} /> Tolak
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reject modal */}
      <Modal open={rejectId !== null} onClose={() => setRejectId(null)} title="Tolak Pengajuan Lembur" size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectId(null)}>Batal</Button>
            <Button
              onClick={() => rejectId !== null && rejectMut.mutate({ id: rejectId, note: rejectNote })}
              disabled={rejectMut.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectMut.isPending ? "Memproses…" : "Tolak"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Berikan alasan penolakan (opsional):</p>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Contoh: Tidak ada keperluan lembur pada tanggal tersebut"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none"
          />
        </div>
      </Modal>
    </>
  );
}
