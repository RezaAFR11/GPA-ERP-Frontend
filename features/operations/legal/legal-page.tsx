"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Eye, FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { legalApi } from "@/lib/api";
import { useRole } from "@/lib/auth-context";
import type { DocStatus, LegalDocument } from "@/lib/types";
import { cn, fmtDate, formatCurrency } from "@/lib/utils";
import { DetailPanel } from "./components/document-detail-panel";
import { DOC_TYPE_LABELS, StatusBadge } from "./components/legal-status";
import { LegalToast } from "./components/legal-toast";
import { NewDocModal } from "./components/new-document-modal";

const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LegalPage() {
  const [showNew,  setShowNew]  = useState(false);
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  const [filter,   setFilter]   = useState<DocStatus | "all">("all");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const { data: legalData, isLoading } = useQuery({
    queryKey: ["legal", filter, search, page],
    queryFn:  () => legalApi.list({
      ...(filter !== "all" ? { status: filter } : {}),
      ...(search ? { search } : {}),
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    }).then((r) => r.data),
  });
  const docs       = legalData?.items ?? [];
  const totalPages = Math.ceil((legalData?.total ?? 0) / PAGE_SIZE);
  const paged      = docs;

  // Separate lightweight query for the pending badge count (all statuses)
  const { data: pendingData } = useQuery({
    queryKey: ["legal-pending-count"],
    queryFn:  () => legalApi.list({ status: "submitted", limit: 1 }).then((r) => r.data.total),
    staleTime: 60_000,
  });
  const pendingCount = pendingData ?? 0;

  const { canSign } = useRole();

  return (
    <div className="space-y-5 animate-fade-in">
      {toast    && <LegalToast {...toast} />}
      {showNew  && <NewDocModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); showToast("Draft berhasil disimpan", true); }} />}
      {selected && <DetailPanel doc={selected} onClose={() => setSelected(null)} onUpdated={setSelected} showToast={showToast} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Legal &amp; Proposals</h1>
          <p className="text-sm text-gray-400 mt-0.5">Surat penawaran, berita acara &amp; dokumen resmi</p>
        </div>
        <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>
          Buat Dokumen
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nomor, judul, instansi…"
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 w-60"
          />
        </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {([
          { key: "all",       label: "Semua",           count: filter === "all" ? (legalData?.total ?? 0) : 0 },
          { key: "draft",     label: "Draft",           count: filter === "draft" ? (legalData?.total ?? 0) : 0 },
          { key: "submitted", label: "Menunggu",        count: pendingCount },
          { key: "signed",    label: "Ditandatangani",  count: filter === "signed" ? (legalData?.total ?? 0) : 0 },
          { key: "rejected",  label: "Ditolak",         count: filter === "rejected" ? (legalData?.total ?? 0) : 0 },
        ] as { key: DocStatus | "all"; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              filter === key ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none",
                filter === key
                  ? (key === "submitted" ? "bg-amber-400 text-gray-900" : "bg-white/20 text-white")
                  : "bg-gray-100 text-gray-500"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>

      {/* MD/PM action prompt */}
      {canSign && pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{pendingCount} dokumen</span> menunggu tanda tangan Anda.
          </p>
          <button
            onClick={() => { setFilter("submitted"); setPage(1); }}
            className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse h-[72px]"><span /></Card>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <Card className="py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600">Belum ada dokumen</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {search ? "Tidak ada dokumen yang cocok dengan pencarian." : filter === "all" ? 'Klik "Buat Dokumen" untuk membuat surat pertama.' : "Tidak ada dokumen dengan status ini."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {paged.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              className="w-full text-left bg-white rounded-xl border border-gray-200 px-4 py-3.5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  doc.status === "signed"    ? "bg-green-50"  :
                  doc.status === "submitted" ? "bg-amber-50"  :
                  doc.status === "rejected"  ? "bg-red-50"    : "bg-gray-100"
                )}>
                  <FileText size={15} className={cn(
                    doc.status === "signed"    ? "text-green-600" :
                    doc.status === "submitted" ? "text-amber-600" :
                    doc.status === "rejected"  ? "text-red-500"   : "text-gray-400"
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono">{doc.doc_number}</span>
                    {doc.recipient_company && <span> · {doc.recipient_company}</span>}
                    <span> · {fmtDate(doc.created_at)}</span>
                    {doc.creator && <span> · {doc.creator.full_name}</span>}
                  </p>
                </div>

                {/* Amount */}
                {doc.quoted_amount != null && (
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Nilai</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(doc.quoted_amount, "Rp ")}</p>
                  </div>
                )}

                <Eye size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0 ml-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={legalData?.total}
          pageSize={PAGE_SIZE}
        />
      )}
    </div>
  );
}
