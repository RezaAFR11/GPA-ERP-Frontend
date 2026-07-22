"use client";

import { useQuery } from "@tanstack/react-query";
import { inventoryApi, projectsApi } from "@/lib/api";
import type { InventoryItem } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { formatInventoryQuantity } from "../inventory-config";

export function HistoryPanel({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["inventory", item.id, "txns"],
    queryFn:  () => inventoryApi.txns(item.id).then(r => r.data),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "inventory-history"],
    queryFn: () => projectsApi.list({ include_archived: true, limit: 500 }).then(r => r.data.items),
  });
  const projectById = new Map(projects.map(project => [project.id, project]));

  const TXN_META: Record<string, { label: string; cls: string }> = {
    in:         { label: "Masuk",     cls: "bg-green-100 text-green-700" },
    out:        { label: "Keluar",    cls: "bg-red-100 text-red-600"     },
    adjustment: { label: "Sesuaikan", cls: "bg-blue-100 text-blue-700"   },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Riwayat Mutasi</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.code} · {item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : txns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada mutasi stok</p>
          ) : (
            <div className="space-y-2">
              {txns.map(txn => {
                const meta = TXN_META[txn.txn_type] ?? { label: txn.txn_type, cls: "bg-gray-100 text-gray-600" };
                return (
                  <div key={txn.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-xs">
                    <span className={cn("px-2 py-0.5 rounded-full font-semibold text-[10px]", meta.cls)}>
                      {meta.label}
                    </span>
                    <span className="font-bold text-gray-900">{formatInventoryQuantity(txn.quantity)} {item.unit}</span>
                    {txn.project_id && (
                      <span className="text-primary font-mono">
                        {projectById.get(txn.project_id)?.code ?? `Project #${txn.project_id}`}
                      </span>
                    )}
                    {txn.reference && <span className="text-gray-500 font-mono">{txn.reference}</span>}
                    {txn.notes && <span className="text-gray-400 flex-1 truncate">{txn.notes}</span>}
                    <span className="ml-auto text-gray-400 shrink-0">{fmtDate(txn.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
