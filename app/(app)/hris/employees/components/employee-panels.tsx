"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { hrisDepartmentsApi, hrisWorkGroupsApi } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type {
  DepartmentNode,
  RoleName,
  WorkGroup,
  WorkGroupCreate,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type WorkGroupSortKey = "group" | "role" | "members" | "status";

// ── Work Groups Panel ──────────────────────────────────────────────────────────

export function WorkGroupsPanel() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<Partial<WorkGroupCreate>>({ role: "STAFF" });
  const [saving, setSaving]  = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const workGroupSort = useTableSort<WorkGroupSortKey>("group", "asc");

  const { data: groups = [], isLoading } = useQuery<WorkGroup[]>({
    queryKey: ["hris", "work-groups"],
    queryFn: () => hrisWorkGroupsApi.list().then(r => r.data),
  });
  const sortedGroups = sortTableRows(groups, workGroupSort.sortKey, workGroupSort.sortDirection, {
    group: (group) => group.name,
    role: (group) => group.role,
    members: (group) => group.members.length,
    status: (group) => group.is_active,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.name || !newForm.role) return;
    setSaving(true);
    try {
      await hrisWorkGroupsApi.create(newForm as WorkGroupCreate);
      qc.invalidateQueries({ queryKey: ["hris", "work-groups"] });
      setShowNew(false);
      setNewForm({ role: "STAFF" });
      toastSuccess("Grup berhasil dibuat");
    } catch {
      toastError("Gagal membuat grup");
    } finally { setSaving(false); }
  }

  async function toggleActive(wg: WorkGroup) {
    try {
      await hrisWorkGroupsApi.update(wg.id, { is_active: !wg.is_active });
      qc.invalidateQueries({ queryKey: ["hris", "work-groups"] });
    } catch { toastError("Gagal mengubah status grup"); }
  }

  const field = "block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Kelola sub-grup karyawan STAFF dan WORKER</p>
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNew(true)}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700 text-white"
        >
          Buat Grup
        </Button>
      </div>

      {/* New group form */}
      {showNew && (
        <Card className="border-teal-200 bg-teal-50">
          <form onSubmit={handleCreate} className="space-y-3">
            <p className="text-sm font-semibold text-teal-800">Grup Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Nama Grup *</label>
                <input className={field} placeholder="Tim Admin"
                  value={newForm.name ?? ""} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Role *</label>
                <select className={field} value={newForm.role}
                  onChange={e => setNewForm(f => ({ ...f, role: e.target.value as RoleName }))}>
                  <option value="STAFF">STAFF (Kantor)</option>
                  <option value="WORKER">WORKER (Lapangan)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Deskripsi</label>
              <input className={field} placeholder="Opsional"
                value={newForm.description ?? ""}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Batal</Button>
              <Button type="submit" size="sm" loading={saving}
                className="bg-teal-700 hover:bg-teal-600 text-white border-teal-700">Simpan</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Groups table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Belum ada grup. Buat grup pertama.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Grup" column="group" sortKey={workGroupSort.sortKey} sortDirection={workGroupSort.sortDirection} onSort={workGroupSort.toggleSort} className="px-4" />
                <SortableTableHeader label="Role" column="role" sortKey={workGroupSort.sortKey} sortDirection={workGroupSort.sortDirection} onSort={workGroupSort.toggleSort} className="px-4" />
                <SortableTableHeader label="Anggota" column="members" sortKey={workGroupSort.sortKey} sortDirection={workGroupSort.sortDirection} onSort={workGroupSort.toggleSort} className="px-4" />
                <SortableTableHeader label="Status" column="status" sortKey={workGroupSort.sortKey} sortDirection={workGroupSort.sortDirection} onSort={workGroupSort.toggleSort} className="px-4" />
                <th className="px-4 py-3" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedGroups.map(wg => (
                <React.Fragment key={wg.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{wg.name}</p>
                      {wg.description && <p className="text-gray-400 text-[11px]">{wg.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={wg.role === "STAFF"
                        ? "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                        : "bg-orange-50 text-orange-700 border-orange-200 text-[10px]"}>
                        {wg.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === wg.id ? null : wg.id)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                      >
                        {wg.members.length} anggota {expanded === wg.id ? "▲" : "▼"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={wg.is_active
                        ? "bg-green-50 text-green-700 border-green-200 text-[10px]"
                        : "bg-gray-100 text-gray-500 text-[10px]"}>
                        {wg.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(wg)}
                        className="text-[11px] text-gray-400 hover:text-gray-700 underline"
                      >
                        {wg.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                  {expanded === wg.id && (
                    <tr key={`${wg.id}-members`}>
                      <td colSpan={5} className="px-6 pb-3 bg-gray-50">
                        {wg.members.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Belum ada anggota</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {wg.members.map(m => (
                              <span key={m.id} className="text-[11px] bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-700">
                                {m.employee_no} · {m.full_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Org Chart ─────────────────────────────────────────────────────────────────

function OrgChartNode({
  node,
  depth = 0,
  onSelectDept,
}: {
  node: DepartmentNode;
  depth?: number;
  onSelectDept: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <div className={cn("relative", depth > 0 && "ml-6 pl-4 border-l border-gray-200")}>
      {/* Node card */}
      <div className="flex items-center gap-2 py-1.5">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded text-gray-400",
            hasChildren ? "hover:text-gray-700" : "cursor-default opacity-0"
          )}
          disabled={!hasChildren}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasChildren && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
        </button>

        {/* Dept card */}
        <button
          onClick={() => onSelectDept(node.id)}
          className="flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-lg
                     hover:border-teal-400 hover:shadow-sm transition-all text-left"
        >
          <Building2 size={14} className="text-teal-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800 leading-tight">{node.name}</p>
            <p className="text-[10px] text-gray-400 font-mono uppercase">{node.code}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5 font-medium">
              {node.headcount} karyawan
            </span>
            {node.open_positions > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium flex items-center gap-1">
                <Briefcase size={9} />
                {node.open_positions} lowongan
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgChartNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectDept={onSelectDept}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartPanel({ onSelectDept }: { onSelectDept: (id: number) => void }) {
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ["hris", "departments", "tree"],
    queryFn: () => hrisDepartmentsApi.tree().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        Belum ada departemen. Tambahkan dari tab Karyawan.
      </div>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs text-gray-500">
          Klik node untuk filter karyawan berdasarkan departemen
        </p>
      </div>
      <div className="p-4 space-y-0.5">
        {tree.map((root) => (
          <OrgChartNode key={root.id} node={root} depth={0} onSelectDept={onSelectDept} />
        ))}
      </div>
    </Card>
  );
}
