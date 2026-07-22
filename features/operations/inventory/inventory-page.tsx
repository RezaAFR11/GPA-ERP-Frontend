"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArchiveRestore,
  ArrowDownCircle,
  History,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { Pagination } from "@/components/ui/pagination";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { inventoryApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { useTableSort } from "@/lib/table-sort";
import type { InventoryItem, ItemCategory } from "@/lib/types";
import { cn, formatCurrency, getErrorMessage } from "@/lib/utils";
import { HistoryPanel } from "./components/history-panel";
import { ItemModal } from "./components/item-modal";
import { TxnModal } from "./components/transaction-modal";
import {
  CATEGORY_COLORS,
  formatInventoryQuantity,
  INVENTORY_CATEGORIES,
} from "./inventory-config";

type InventorySortKey = "item" | "location" | "qty_on_hand" | "unit_cost" | "stock_value" | "stock_level";

function CategoryBadge({ cat }: { cat: ItemCategory }) {
  const label = INVENTORY_CATEGORIES.find((category) => category.value === cat)?.label ?? cat;
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", CATEGORY_COLORS[cat])}>
      {label}
    </span>
  );
}

function StockBar({ qty, min }: { qty: number; min: number }) {
  const low = min > 0 && qty <= min;
  const percentage = min > 0 ? Math.min((qty / (min * 2)) * 100, 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", low ? "bg-red-400" : "bg-green-400")}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {low && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
    </div>
  );
}

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState<ItemCategory | "all">("all");
  const [lowOnly,   setLowOnly]   = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page,      setPage]      = useState(1);
  const [showAdd,   setShowAdd]   = useState(false);
  const [editing,   setEditing]   = useState<InventoryItem | null>(null);
  const [txnItem,   setTxnItem]   = useState<InventoryItem | null>(null);
  const [histItem,  setHistItem]  = useState<InventoryItem | null>(null);
  const [deactivating, setDeactivating] = useState<InventoryItem | null>(null);
  const { sortKey, sortDirection, toggleSort } = useTableSort<InventorySortKey>("item", "asc");

  function handleSort(column: InventorySortKey) {
    toggleSort(column);
    setPage(1);
  }

  const { data: invData, isLoading } = useQuery({
    queryKey: ["inventory", "list", catFilter, lowOnly, showInactive, search, sortKey, sortDirection, page],
    queryFn:  () => inventoryApi.list({
      category:  catFilter !== "all" ? catFilter : undefined,
      low_stock: lowOnly || undefined,
      is_active: !showInactive,
      q:         search   || undefined,
      sort_by:   sortKey,
      sort_dir:  sortDirection,
      skip:      (page - 1) * PAGE_SIZE,
      limit:     PAGE_SIZE,
    }).then(r => r.data),
  });
  const items      = invData?.items ?? [];
  const totalPages = Math.ceil((invData?.total ?? 0) / PAGE_SIZE);
  const paged      = items;

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["inventory", "summary"],
    queryFn: () => inventoryApi.summary().then(r => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => inventoryApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDeactivating(null);
      toastSuccess("Item dinonaktifkan");
    },
    onError:    (e) => toastError("Gagal", getErrorMessage(e)),
  });

  const restore = useMutation({
    mutationFn: (id: number) => inventoryApi.update(id, { is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toastSuccess("Item diaktifkan kembali");
    },
    onError: (e) => toastError("Gagal", getErrorMessage(e)),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {showAdd  && <ItemModal onClose={() => setShowAdd(false)} />}
      {editing  && <ItemModal item={editing}  onClose={() => setEditing(null)} />}
      {txnItem  && <TxnModal  item={txnItem}  onClose={() => setTxnItem(null)} />}
      {histItem && <HistoryPanel item={histItem} onClose={() => setHistItem(null)} />}
      <ConfirmActionModal
        open={!!deactivating}
        title="Deactivate Item"
        message={deactivating ? `Deactivate ${deactivating.code} - ${deactivating.name}? The item must have zero stock.` : ""}
        confirmLabel="Deactivate"
        pending={deactivate.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => { if (deactivating) deactivate.mutate(deactivating.id); }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory &amp; Stock</h1>
          <p className="text-sm text-gray-400 mt-0.5">Kelola alat, material, dan pergerakan stok</p>
        </div>
        <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>
          Tambah Item
        </Button>
      </div>

      {/* KPI strip */}
      {!isSummaryLoading && summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Item",  value: summary.total_items.toString(),               sub: "item aktif",    alert: false },
            { label: "Stok Rendah", value: summary.low_stock_count.toString(),           sub: "perlu restock", alert: summary.low_stock_count > 0 },
            { label: "Nilai Stok",  value: formatCurrency(summary.total_value, "Rp "),   sub: "estimasi",      alert: false },
          ].map(kpi => (
            <Card key={kpi.label} className={cn("px-4 py-3", kpi.alert ? "border-red-200 bg-red-50" : "")}>
              <p className={cn("text-xs font-semibold uppercase tracking-wide", kpi.alert ? "text-red-500" : "text-gray-400")}>{kpi.label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", kpi.alert ? "text-red-600" : "text-gray-900")}>{kpi.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama / kode..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1">
          {INVENTORY_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setCatFilter(cat.value as ItemCategory | "all"); setPage(1); }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                catFilter === cat.value ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1">
          {[
            { value: false, label: "Aktif" },
            { value: true, label: "Nonaktif" },
          ].map(option => (
            <button
              key={option.label}
              onClick={() => { setShowInactive(option.value); setLowOnly(false); setPage(1); }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                showInactive === option.value ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setLowOnly(v => !v); setPage(1); }}
          disabled={showInactive}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all",
            showInactive
              ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
              : lowOnly ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
          )}
        >
          <AlertTriangle size={12} />
          Stok Rendah
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card padding={false}>
          <div className="divide-y divide-gray-50">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <Package size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600">
            {search || catFilter !== "all" || lowOnly || showInactive ? "Tidak ada item yang cocok" : "Belum ada item"}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {search || catFilter !== "all" || lowOnly || showInactive
              ? "Coba ubah filter pencarian."
              : 'Klik "Tambah Item" untuk memulai.'}
          </p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <SortableTableHeader label="Item" column="item" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableTableHeader label="Lokasi" column="location" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell" />
                  <SortableTableHeader label="Stok" column="qty_on_hand" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableTableHeader label="Harga Satuan" column="unit_cost" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" className="hidden sm:table-cell" />
                  <SortableTableHeader label="Nilai Stok" column="stock_value" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                  <SortableTableHeader label="Level" column="stock_level" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="center" />
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map(item => {
                  const isLow = item.is_active && item.min_stock > 0 && item.qty_on_hand <= item.min_stock;
                  const [bgCls, textCls] = CATEGORY_COLORS[item.category].split(" ");
                  return (
                    <tr key={item.id} className={cn("hover:bg-gray-50/50 transition-colors group", isLow && "bg-red-50/30", !item.is_active && "opacity-60")}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bgCls)}>
                            <Package size={14} className={textCls} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-gray-400">{item.code}</span>
                              <CategoryBadge cat={item.category} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="td hidden md:table-cell">
                        <span className="text-xs text-gray-400">{item.location || "—"}</span>
                      </td>
                      <td className="td text-right">
                        <span className={cn("font-bold text-sm tabular-nums", isLow ? "text-red-600" : "text-gray-900")}>
                          {formatInventoryQuantity(item.qty_on_hand)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                      </td>
                      <td className="td text-right hidden sm:table-cell">
                        <span className="text-xs text-gray-600 tabular-nums">
                          {item.unit_cost != null ? formatCurrency(item.unit_cost, "Rp ") : "—"}
                        </span>
                      </td>
                      <td className="td text-right hidden lg:table-cell">
                        <span className="text-xs font-semibold text-gray-700 tabular-nums">
                          {item.unit_cost != null ? formatCurrency(item.unit_cost * item.qty_on_hand, "Rp ") : "—"}
                        </span>
                      </td>
                      <td className="td">
                        <div className="w-24 mx-auto">
                          <StockBar qty={item.qty_on_hand} min={item.min_stock} />
                          <p className="text-[9px] text-center text-gray-400 mt-0.5">min {formatInventoryQuantity(item.min_stock)}</p>
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setHistItem(item)} title="Riwayat"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <History size={14} />
                          </button>
                          {item.is_active ? (
                            <>
                              <button onClick={() => setTxnItem(item)} title="Mutasi stok"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                                <ArrowDownCircle size={14} />
                              </button>
                              <button onClick={() => setEditing(item)} title="Edit"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeactivating(item)}
                                title="Nonaktifkan"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => restore.mutate(item.id)}
                              title="Aktifkan kembali"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                              <ArchiveRestore size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={invData?.total}
          pageSize={PAGE_SIZE}
        />
      )}
    </div>
  );
}
