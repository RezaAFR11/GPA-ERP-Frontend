"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { hrisPayrollApi } from "@/lib/api";
import type { PayrollRun } from "@/lib/types";
import { cn } from "@/lib/utils";
import { downloadBlob, fmtRp } from "../payroll-utils";

export function SlipModal({ run, onClose }: { run: PayrollRun | null; onClose: () => void }) {
  const [dlPdf, setDlPdf] = useState(false);

  const { data: slip, isLoading } = useQuery({
    queryKey: ["payslip", run?.id],
    queryFn:  () => hrisPayrollApi.getSlip(run!.id).then(r => r.data),
    enabled:  !!run,
  });

  async function handlePdfDownload() {
    if (!run) return;
    setDlPdf(true);
    try {
      const res = await hrisPayrollApi.downloadSlipPdf(run.id);
      downloadBlob(res.data, `slip-gaji-${run.id}.pdf`);
    } finally { setDlPdf(false); }
  }

  const row = (label: string, value: string, cls = "") => (
    <div className={cn("flex justify-between items-center py-1.5 border-b border-gray-50 text-sm", cls)}>
      <span className="text-gray-600">{label}</span>
      <span className="font-mono font-semibold text-gray-900">{value}</span>
    </div>
  );

  return (
    <Modal open={!!run} onClose={onClose} title="Slip Gaji" size="md"
      subtitle={slip ? `${slip.employee_name as string} · ${slip.period as string}` : undefined}
      footer={slip ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={handlePdfDownload} disabled={dlPdf}
            className="bg-orange-600 hover:bg-orange-700 text-white">
            <FileText size={13} className="mr-1.5" />
            {dlPdf ? "Mengunduh…" : "Download PDF"}
          </Button>
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
      ) : slip ? (
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Departemen</p>
            <p className="text-sm font-medium text-gray-900">{(slip.department as string) ?? "—"}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pendapatan</p>
            {row("Gaji Kotor (Gross)", fmtRp(slip.gross_salary as number))}
          </div>
          <div className="space-y-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-2">Potongan</p>
            {row("BPJS TK (Karyawan)",  fmtRp(slip.bpjs_tk_employee as number))}
            {row("BPJS Kes (Karyawan)", fmtRp(slip.bpjs_kes_employee as number))}
            {row("PPh 21 (" + (slip.pph21_method as string) + ")", fmtRp(slip.pph21_amount as number))}
          </div>
          {slip.thr_amount != null && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-2">THR</p>
              {row("Tunjangan Hari Raya", fmtRp(slip.thr_amount as number), "text-amber-700")}
            </div>
          )}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-bold text-teal-800">Gaji Bersih (Net)</p>
            <p className="text-lg font-bold text-teal-700 font-mono">{fmtRp(slip.net_salary as number)}</p>
          </div>
          <div className="text-[11px] text-gray-400 text-center mt-2">
            Kontribusi Perusahaan: BPJS TK {fmtRp(slip.bpjs_tk_employer as number)} · BPJS Kes {fmtRp(slip.bpjs_kes_employer as number)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">Tidak ada data slip</p>
      )}
    </Modal>
  );
}
