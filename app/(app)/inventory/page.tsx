"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Plus, Search, ArrowDownCircle, ArrowUpCircle,
  SlidersHorizontal, AlertTriangle, Pencil, Trash2, History, ArchiveRestore,
} from "lucide-react";
import { inventoryApi, projectsApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { Pagination } from "@/components/ui/pagination";
import { cn, formatCurrency, fmtDate, getErrorMessage } from "@/lib/utils";
import { toastSuccess, toastError } from "@/lib/hooks/use-toast";
import type { InventoryItem, InventoryItemCreate, InventoryTxnCreate, ItemCategory, TxnType } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all",         label: "Semua"       },
  { value: "materials",   label: "Materials"   },
  { value: "tools",       label: "Tools"       },
  { value: "consumables", label: "Consumables" },
];

const CAT_COLORS: Record<ItemCategory, string> = {
  materials:   "bg-green-100 text-green-700",
  tools:       "bg-blue-100 text-blue-700",
  consumables: "bg-amber-100 text-amber-700",
};

const UNITS = ["pcs", "set", "unit", "kg", "ltr", "m", "m²", "m³", "roll", "box", "btl", "sak"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

function CategoryBadge({ cat }: { cat: ItemCategory }) {
  const label = CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", CAT_COLORS[cat])}>
      {label}
    </span>
  );
}

function StockBar({ qty, min }: { qty: number; min: number }) {
  const low = min > 0 && qty <= min;
  const pct = min > 0 ? Math.min((qty / (min * 2)) * 100, 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", low ? "bg-red-400" : "bg-green-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {low && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
    </div>
  );
}

function formatQty(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

// ── Item Form Modal ───────────────────────────────────────────────────────────

function ItemModal({ item, onClose }: { item?: InventoryItem; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState<InventoryItemCreate>({
    code:        item?.code        ?? "",
    name:        item?.name        ?? "",
    category:    item?.category    ?? "tools",
    unit:        item?.unit        ?? "pcs",
    qty_on_hand: item?.qty_on_hand ?? 0,
    min_stock:   item?.min_stock   ?? 0,
    unit_cost:   item?.unit_cost   ?? undefined,
    location:    item?.location    ?? "",
    notes:       item?.notes       ?? "",
  });
  const [err, setErr] = useState("");

  const save = useMutation({
    mutationFn: () => isEdit
      ? inventoryApi.update(item!.id, form)
      : inventoryApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toastSuccess(isEdit ? "Item diperbarui" : "Item ditambahkan");
      onClose();
    },
    onError: (e) => setErr(getErrorMessage(e)),
  });

  function set<K extends keyof InventoryItemCreate>(k: K, v: InventoryItemCreate[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? "Edit Item" : "Tambah Item Baru"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {err && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{err}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Kode Item</label>
              <input value={form.code} onChange={e => set("code", e.target.value)}
                placeholder="INV-001" className={inputCls} disabled={isEdit} />
            </div>
            <div>
              <label className={labelCls}>Kategori</label>
              <select value={form.category} onChange={e => set("category", e.target.value as ItemCategory)} className={inputCls}>
                {CATEGORIES.filter(c => c.value !== "all").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Nama Item</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Nama alat / material..." className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Satuan</label>
              <select value={form.unit} onChange={e => set("unit", e.target.value)} className={inputCls}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stok Awal</label>
              <input type="number" min={0} step="0.001"
                value={form.qty_on_hand}
                onChange={e => set("qty_on_hand", parseFloat(e.target.value) || 0)}
                className={inputCls} disabled={isEdit} />
            </div>
            <div>
              <label className={labelCls}>Min. Stok</label>
              <input type="number" min={0} step="0.001"
                value={form.min_stock}
                onChange={e => set("min_stock", parseFloat(e.target.value) || 0)}
                className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Harga Satuan (Rp)</label>
              <input type="number" min={0} step="1"
                value={form.unit_cost ?? ""}
                onChange={e => set("unit_cost", e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Lokasi / Gudang</label>
              <input value={form.location ?? ""} onChange={e => set("location", e.target.value)}
                placeholder="Gudang A..." className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Catatan</label>
            <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)}
              rows={2} placeholder="Catatan opsional..." className={cn(inputCls, "resize-none")} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Batal</Button>
          <Button size="sm" icon={<Plus size={13} />}
            disabled={save.isPending || !form.code || !form.name}
            onClick={() => save.mutate()}>
            {save.isPending ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Stock Transaction Modal ───────────────────────────────────────────────────

function TxnModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<InventoryTxnCreate>({ txn_type: "in", quantity: 1 });
  const [err, setErr] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "active-for-inventory"],
    queryFn: () => projectsApi.list({ status: "active", archived: false, limit: 500 }).then(r => r.data.items),
  });

  const submit = useMutation({
    mutationFn: () => inventoryApi.txn(item.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toastSuccess("Mutasi stok disimpan");
      onClose();
    },
    onError: (e) => setErr(getErrorMessage(e)),
  });

  const TXN_OPTIONS: { value: TxnType; label: string; icon: React.ElementType; cls: string }[] = [
    { value: "in",         label: "Stok Masuk",  icon: ArrowDownCircle,  cls: "text-green-600" },
    { value: "out",        label: "Stok Keluar", icon: ArrowUpCircle,    cls: "text-red-500"   },
    { value: "adjustment", label: "Sesuaikan",   icon: SlidersHorizontal, cls: "text-blue-600" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Mutasi Stok</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item.code} · {item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {err && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{err}</div>}

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <Package size={16} className="text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Stok Saat Ini</p>
              <p className="text-lg font-bold text-gray-900 leading-none mt-0.5">
                {formatQty(item.qty_on_hand)} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TXN_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = form.txn_type === opt.value;
              return (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, txn_type: opt.value }))}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all",
                    active ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}>
                  <Icon size={16} className={active ? "text-primary" : opt.cls} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{form.txn_type === "adjustment" ? "Stok Baru" : "Jumlah"}</label>
              <input type="number" min={0.001} step="0.001"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Referensi</label>
              <input value={form.reference ?? ""}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="PO-001 / DO-123..." className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Project (Opsional)</label>
            <select
              value={form.project_id ?? ""}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value ? Number(e.target.value) : undefined }))}
              className={inputCls}
            >
              <option value="">Tidak terkait project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.code} - {project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Catatan</label>
            <input value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Keterangan opsional..." className={inputCls} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Batal</Button>
          <Button size="sm" disabled={submit.isPending || form.quantity <= 0} onClick={() => submit.mutate()}>
            {submit.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
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
                    <span className="font-bold text-gray-900">{formatQty(txn.quantity)} {item.unit}</span>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

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

  const { data: invData, isLoading } = useQuery({
    queryKey: ["inventory", "list", catFilter, lowOnly, showInactive, search, page],
    queryFn:  () => inventoryApi.list({
      category:  catFilter !== "all" ? catFilter : undefined,
      low_stock: lowOnly || undefined,
      is_active: !showInactive,
      q:         search   || undefined,
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
          {CATEGORIES.map(cat => (
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
                  <th className="th text-left">Item</th>
                  <th className="th text-left hidden md:table-cell">Lokasi</th>
                  <th className="th text-right">Stok</th>
                  <th className="th text-right hidden sm:table-cell">Harga Satuan</th>
                  <th className="th text-right hidden lg:table-cell">Nilai Stok</th>
                  <th className="th text-center">Level</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map(item => {
                  const isLow = item.is_active && item.min_stock > 0 && item.qty_on_hand <= item.min_stock;
                  const [bgCls, textCls] = CAT_COLORS[item.category].split(" ");
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
                          {formatQty(item.qty_on_hand)}
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
                          <p className="text-[9px] text-center text-gray-400 mt-0.5">min {formatQty(item.min_stock)}</p>
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
