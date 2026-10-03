"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { operationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/utils";
import { nextProcessor } from "@/features/operations/shared/workflow-guide";
import { STATUS_LABEL } from "@/features/operations/shared/operational-workspace-config";

const SECTIONS = [
  { key: "contract_management", title: "1. Proposal & kontrak", path: "/contracts", hint: "Catat dokumen, lingkup yang dipesan, nilai, termin, dan penanggung jawab." },
  { key: "procurement", title: "2. Pengadaan", path: "/procurement", hint: "Siapkan pembelian vendor sesuai lingkup yang telah disetujui." },
  { key: "project_execution", title: "3. Pelaksanaan & progres", path: "/project-execution", hint: "Catat pekerjaan, bukti milestone, dan perubahan lingkup." },
];

export function ProjectWorkspace({ projectId }: { projectId: number }) {
  const { canAccessMenu } = useAuth();
  const accessible = SECTIONS.filter(section => canAccessMenu(section.key));
  const data = useQuery({
    queryKey: ["project-workspace", projectId, accessible.map(section => section.key).join(",")],
    queryFn: () => Promise.all(accessible.map(async section => ({ ...section,
      records: (await operationsApi.list(section.key, { project_id: projectId, limit: 500 })).data.items,
    }))),
    enabled: accessible.length > 0,
  });
  return <div className="space-y-4">
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
      <p className="font-semibold">Alur kerja proyek</p>
      <p className="mt-1">Proposal / kontrak → Pengadaan → Pelaksanaan → Penagihan → Retensi / garansi</p>
      <p className="text-xs mt-2">Setiap dokumen menunjukkan penanggung jawab dan tindakan berikutnya. Status dokumen tidak otomatis membuktikan barang diterima, invoice diterbitkan, atau pembayaran diterima.</p>
    </div>
    {data.isLoading && <p className="text-sm">Memuat pekerjaan proyek...</p>}
    {data.isError && <p className="text-sm text-red-600">{getErrorMessage(data.error)}</p>}
    {data.data?.map(section => <section key={section.key} className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{section.title}</h3><p className="text-xs text-slate-500 mt-1">{section.hint}</p></div><Link className="text-sm text-teal-700 font-semibold" href={`${section.path}?project=${projectId}`}>Buka / tambah dokumen →</Link></div>
      {!section.records.length && <p className="text-xs text-slate-500">Belum ada catatan untuk proyek ini.</p>}
      {section.records.map(record => <Link key={record.id} href={`${section.path}?project=${projectId}&record=${record.id}`} className="block rounded-lg border p-3 hover:bg-slate-50">
        <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{record.reference_no} · {record.title}</p><span className="text-xs text-slate-500">{record.details.superseded_by_id ? "Digantikan revisi" : STATUS_LABEL[record.status]}</span></div>
        <p className="text-xs text-teal-700 mt-2">→ {nextProcessor(record)}</p><p className="text-xs text-slate-500 mt-1">{record.workflow?.instruction}</p>
      </Link>)}
    </section>)}
    {canAccessMenu("revenue_ar") && <section className="bg-white border rounded-xl p-4 text-sm"><p className="font-semibold">4. Penagihan & pembayaran · Finance</p><p className="text-xs text-slate-500 mt-1">Gunakan tab Revenue proyek untuk invoice dan bukti pembayaran. Termin kontrak adalah rencana; pembayaran tetap dicatat dari bukti transaksi.</p></section>}
    {!accessible.length && <p className="text-sm text-slate-500">Hubungi administrator jika Anda memerlukan akses ke alur operasional proyek.</p>}
  </div>;
}
