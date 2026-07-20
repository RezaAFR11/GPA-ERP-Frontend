"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisSalaryApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { SalaryComponent } from "@/lib/types";
import { cn } from "@/lib/utils";

type SalaryComponentSortKey = "code" | "name" | "type" | "taxable" | "status";

export function SalaryComponentsTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", component_type: "ALLOWANCE", is_taxable: false });
  const tableSort = useTableSort<SalaryComponentSortKey>("code", "asc");

  const { data: components = [], isLoading } = useQuery({
    queryKey: ["hris", "salary-components"],
    queryFn: () => hrisSalaryApi.listComponents().then((r) => r.data),
  });
  const sortedComponents = sortTableRows(components, tableSort.sortKey, tableSort.sortDirection, {
    code: (component) => component.code,
    name: (component) => component.name,
    type: (component) => component.component_type,
    taxable: (component) => component.is_taxable,
    status: (component) => component.is_active,
  });

  const createMut = useMutation({
    mutationFn: () => hrisSalaryApi.createComponent({
      code: form.code,
      name: form.name,
      component_type: form.component_type as SalaryComponent["component_type"],
      is_taxable: form.is_taxable,
    }),
    onSuccess: () => {
      toastSuccess("Komponen berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["hris", "salary-components"] });
      setShowAdd(false);
      setForm({ code: "", name: "", component_type: "ALLOWANCE", is_taxable: false });
    },
    onError: (e: unknown) => toastError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal"),
  });

  const TYPE_COLORS: Record<string, string> = {
    BASIC:     "bg-teal-50 text-teal-700 border-teal-200",
    ALLOWANCE: "bg-blue-50 text-blue-700 border-blue-200",
    DEDUCTION: "bg-red-50 text-red-700 border-red-200",
    BPJS:      "bg-purple-50 text-purple-700 border-purple-200",
    TAX:       "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Daftar komponen penggajian (tunjangan, potongan, BPJS, pajak)</p>
        {canManage && (
          <Button size="sm" variant="primary" icon={<Plus size={13} />}
            className="bg-teal-700 hover:bg-teal-600 border-teal-700"
            onClick={() => setShowAdd(true)}>Tambah Komponen</Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <SortableTableHeader label="Kode" column="code" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Nama" column="name" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Tipe" column="type" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} className="!px-0 !py-2" />
              <SortableTableHeader label="Kena Pajak" column="taxable" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={tableSort.toggleSort} align="center" className="!px-0 !py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedComponents.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="py-2.5 font-mono text-xs text-gray-600">{c.code}</td>
                <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                <td className="py-2.5">
                  <Badge className={cn("text-[10px]", TYPE_COLORS[c.component_type])}>
                    {c.component_type}
                  </Badge>
                </td>
                <td className="py-2.5 text-center">
                  {c.is_taxable ? <Check size={14} className="text-teal-600 mx-auto" /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 text-center">
                  <Badge className={c.is_active ? "bg-green-50 text-green-700 border-green-200 text-[10px]" : "bg-gray-50 text-gray-500 border-gray-200 text-[10px]"}>
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Komponen Gaji">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="cth: MEAL" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.component_type} onChange={e => setForm(f => ({...f, component_type: e.target.value}))}>
                <option value="BASIC">BASIC</option>
                <option value="ALLOWANCE">ALLOWANCE</option>
                <option value="DEDUCTION">DEDUCTION</option>
                <option value="BPJS">BPJS</option>
                <option value="TAX">TAX</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Komponen</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="cth: Tunjangan Makan" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_taxable} onChange={e => setForm(f => ({...f, is_taxable: e.target.checked}))} className="rounded" />
            Kena pajak penghasilan (PPh 21)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button variant="primary" size="sm" loading={createMut.isPending}
              className="bg-teal-700 hover:bg-teal-600 border-teal-700"
              onClick={() => createMut.mutate()}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Departemen Tab ────────────────────────────────────────────────────────────
