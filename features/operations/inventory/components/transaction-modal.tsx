"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Package, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inventoryApi, projectsApi } from "@/lib/api";
import { toastSuccess } from "@/lib/hooks/use-toast";
import type { InventoryItem, InventoryTxnCreate, TxnType } from "@/lib/types";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  formatInventoryQuantity,
  inventoryInputClass,
  inventoryLabelClass,
} from "../inventory-config";

export function TxnModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
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
                {formatInventoryQuantity(item.qty_on_hand)} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
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
              <label className={inventoryLabelClass}>{form.txn_type === "adjustment" ? "Stok Baru" : "Jumlah"}</label>
              <input type="number" min={0.001} step="0.001"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                className={inventoryInputClass} />
            </div>
            <div>
              <label className={inventoryLabelClass}>Referensi</label>
              <input value={form.reference ?? ""}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="PO-001 / DO-123..." className={inventoryInputClass} />
            </div>
          </div>

          <div>
            <label className={inventoryLabelClass}>Project (Opsional)</label>
            <select
              value={form.project_id ?? ""}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value ? Number(e.target.value) : undefined }))}
              className={inventoryInputClass}
            >
              <option value="">Tidak terkait project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.code} - {project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={inventoryLabelClass}>Catatan</label>
            <input value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Keterangan opsional..." className={inventoryInputClass} />
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
