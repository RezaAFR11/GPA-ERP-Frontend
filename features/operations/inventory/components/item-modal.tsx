"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inventoryApi } from "@/lib/api";
import { toastSuccess } from "@/lib/hooks/use-toast";
import type { InventoryItem, InventoryItemCreate, ItemCategory } from "@/lib/types";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  inventoryInputClass,
  inventoryLabelClass,
} from "../inventory-config";

export function ItemModal({ item, onClose }: { item?: InventoryItem; onClose: () => void }) {
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
              <label className={inventoryLabelClass}>Kode Item</label>
              <input value={form.code} onChange={e => set("code", e.target.value)}
                placeholder="INV-001" className={inventoryInputClass} disabled={isEdit} />
            </div>
            <div>
              <label className={inventoryLabelClass}>Kategori</label>
              <select value={form.category} onChange={e => set("category", e.target.value as ItemCategory)} className={inventoryInputClass}>
                {INVENTORY_CATEGORIES.filter(c => c.value !== "all").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={inventoryLabelClass}>Nama Item</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Nama alat / material..." className={inventoryInputClass} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={inventoryLabelClass}>Satuan</label>
              <select value={form.unit} onChange={e => set("unit", e.target.value)} className={inventoryInputClass}>
                {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={inventoryLabelClass}>Stok Awal</label>
              <input type="number" min={0} step="0.001"
                value={form.qty_on_hand}
                onChange={e => set("qty_on_hand", parseFloat(e.target.value) || 0)}
                className={inventoryInputClass} disabled={isEdit} />
            </div>
            <div>
              <label className={inventoryLabelClass}>Min. Stok</label>
              <input type="number" min={0} step="0.001"
                value={form.min_stock}
                onChange={e => set("min_stock", parseFloat(e.target.value) || 0)}
                className={inventoryInputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={inventoryLabelClass}>Harga Satuan (Rp)</label>
              <input type="number" min={0} step="1"
                value={form.unit_cost ?? ""}
                onChange={e => set("unit_cost", e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0" className={inventoryInputClass} />
            </div>
            <div>
              <label className={inventoryLabelClass}>Lokasi / Gudang</label>
              <input value={form.location ?? ""} onChange={e => set("location", e.target.value)}
                placeholder="Gudang A..." className={inventoryInputClass} />
            </div>
          </div>

          <div>
            <label className={inventoryLabelClass}>Catatan</label>
            <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)}
              rows={2} placeholder="Catatan opsional..." className={cn(inventoryInputClass, "resize-none")} />
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
