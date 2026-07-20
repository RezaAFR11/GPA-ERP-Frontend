"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Search, UserPlus, Users } from "lucide-react";
import { hrisDepartmentsApi, hrisEmployeesApi, hrisDashboardApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { cn, fmtDate } from "@/lib/utils";
import type { Employee, RoleName } from "@/lib/types";
import EmployeeDetailModal from "./components/employee-detail-modal";
import {
  ASSIGNABLE_ROLES,
  STATUS_COLORS,
  STATUS_LABEL,
  STATUS_OPTIONS,
  TIPE_COLORS,
  TIPE_OPTIONS,
} from "./components/employee-page-config";
import {
  BulkCreateModal,
  NewEmployeeModal,
} from "./components/employee-modals";
import { OrgChartPanel, WorkGroupsPanel } from "./components/employee-panels";
import { useRole } from "@/lib/auth-context";
import { useTableSort } from "@/lib/table-sort";

type EmployeeSortKey = "employee" | "department" | "grade" | "employment_type" | "status" | "joined_at" | "account";


export default function EmployeesPage() {
  const qc = useQueryClient();
  const { hasRole } = useRole();
  const canCreateEmployee = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canCreateAccounts = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canManageEmployeeData = hasRole("SUPER_ADMIN", "MD", "GA", "HR");
  const canAssignElevatedRoles = hasRole("SUPER_ADMIN", "MD");
  const allowedBulkRoles: readonly RoleName[] = canAssignElevatedRoles
    ? ASSIGNABLE_ROLES
    : ["WORKER", "STAFF"];
  const [search, setSearch] = useState("");
  const [filterTipe,   setFilterTipe]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept,   setFilterDept]   = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<"employees" | "groups" | "orgchart">("employees");
  const tableSort = useTableSort<EmployeeSortKey>("employee", "asc");

  function handleSort(column: EmployeeSortKey) {
    tableSort.toggleSort(column);
    setPage(0);
  }

  // Multi-select state
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showBulk, setShowBulk] = useState(false);

  const LIMIT = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["hris", "employees", { search, filterTipe, filterStatus, filterDept, sortKey: tableSort.sortKey, sortDirection: tableSort.sortDirection, page }],
    queryFn: () => hrisEmployeesApi.list({
      search:  search || undefined,
      tipe:    filterTipe || undefined,
      status:  filterStatus || undefined,
      dept_id: filterDept,
      sort_by: tableSort.sortKey,
      sort_dir: tableSort.sortDirection,
      skip:    page * LIMIT,
      limit:   LIMIT,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: depts = [] } = useQuery({
    queryKey: ["hris", "departments"],
    queryFn: () => hrisDepartmentsApi.list().then((r) => r.data),
  });

  const { data: employeeStats, isLoading: statsLoading } = useQuery({
    queryKey: ["hris", "dashboard", "stats", "employee-directory"],
    queryFn: () => hrisDashboardApi.getStats().then(r => r.data),
  });

  const employees = data?.items ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / LIMIT);

  // KPI counts come from the full employee dataset, independent of pagination.
  const tetap     = employeeStats?.employment_type_counts.Tetap ?? 0;
  const pkwt      = employeeStats?.employment_type_counts.PKWT ?? 0;
  const outsource = employeeStats?.employment_type_counts.Outsource ?? 0;
  const active    = employeeStats?.active ?? 0;

  // Multi-select helpers
  const allChecked = employees.length > 0 && employees.every((e) => checkedIds.has(e.id));
  const someChecked = !allChecked && employees.some((e) => checkedIds.has(e.id));

  function toggleAll() {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        employees.forEach((e) => next.delete(e.id));
      } else {
        employees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const checkedEmployees = employees.filter((e) => checkedIds.has(e.id));
  const visibleTabs: Array<"employees" | "groups" | "orgchart"> = [
    "employees",
    ...(canManageEmployeeData ? (["groups"] as const) : []),
    "orgchart",
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Direktori karyawan · {total} karyawan terdaftar
          </p>
        </div>
        {canCreateEmployee && <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNew(true)}
          className="bg-teal-700 hover:bg-teal-600 border-teal-700"
        >
          Tambah Karyawan
        </Button>}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {visibleTabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {t === "employees" ? "Karyawan" : t === "groups" ? "Grup Kerja" : "Struktur Org"}
          </button>
        ))}
      </div>

      {canManageEmployeeData && activeTab === "groups" && <WorkGroupsPanel />}

      {activeTab === "orgchart" && (
        <OrgChartPanel
          onSelectDept={(id) => {
            setFilterDept(id);
            setActiveTab("employees");
          }}
        />
      )}

      {activeTab === "employees" && <>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Aktif",   value: statsLoading ? "…" : active,    color: "text-green-600" },
          { label: "Tetap",         value: statsLoading ? "…" : tetap,     color: "text-teal-600" },
          { label: "PKWT",          value: statsLoading ? "…" : pkwt,      color: "text-blue-600" },
          { label: "Outsource",     value: statsLoading ? "…" : outsource,  color: "text-orange-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="text-center py-3">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 num ${kpi.color}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, NIK, nomor…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
          />
        </div>

        {/* Tipe filter */}
        <select
          value={filterTipe}
          onChange={(e) => { setFilterTipe(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Semua Tipe</option>
          {TIPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        {/* Dept filter */}
        <select
          value={filterDept ?? ""}
          onChange={(e) => { setFilterDept(e.target.value ? +e.target.value : undefined); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">Semua Departemen</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Floating selection action bar */}
      {canCreateAccounts && checkedIds.size > 0 && (
        <div className="sticky top-4 z-20 flex items-center justify-between gap-3 rounded-xl bg-teal-700 text-white shadow-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-teal-200" />
            <span className="text-sm font-semibold">{checkedIds.size} karyawan dipilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCheckedIds(new Set())}
              className="text-xs text-teal-200 hover:text-white"
            >
              Batal pilih
            </button>
            <Button
              size="sm"
              className="bg-white text-teal-800 hover:bg-teal-50 border-white text-xs"
              icon={<UserPlus size={13} />}
              onClick={() => setShowBulk(true)}
            >
              Buat Akun ({checkedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {/* Select-all checkbox */}
              {canCreateAccounts && <th className="th w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </th>}
              <SortableTableHeader label="Karyawan" column="employee" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} />
              <SortableTableHeader label="Departemen" column="department" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} className="hidden md:table-cell" />
              <SortableTableHeader label="Grade" column="grade" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} className="hidden lg:table-cell" />
              <SortableTableHeader label="Tipe" column="employment_type" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} />
              <SortableTableHeader label="Status" column="status" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} />
              <SortableTableHeader label="Bergabung" column="joined_at" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} className="hidden md:table-cell" />
              <SortableTableHeader label="Akun" column="account" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} className="hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={canCreateAccounts ? 8 : 7} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={canCreateAccounts ? 8 : 7} className="text-center py-12 text-gray-400 text-sm">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  Tidak ada karyawan ditemukan
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const isChecked = checkedIds.has(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className={cn(
                      "hover:bg-gray-50/50 cursor-pointer transition-colors",
                      isChecked && "bg-teal-50/40",
                    )}
                  >
                    {/* Row checkbox — stop propagation so clicking it doesn't open detail */}
                    {canCreateAccounts && <td className="td w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(emp.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>}

                    {/* Name + employee_no */}
                    <td className="td" onClick={() => setSelected(emp)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                          <span className="text-teal-700 text-xs font-bold">
                            {emp.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                          <p className="text-[10px] text-gray-400 num">{emp.employee_no}</p>
                        </div>
                      </div>
                    </td>

                    {/* Dept */}
                    <td className="td hidden md:table-cell" onClick={() => setSelected(emp)}>
                      <span className="text-sm text-gray-600">
                        {emp.department?.name ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="td hidden lg:table-cell" onClick={() => setSelected(emp)}>
                      <span className="text-sm text-gray-500">
                        {emp.grade ? `${emp.grade.name} (L${emp.grade.level})` : <span className="text-gray-300">—</span>}
                      </span>
                    </td>

                    {/* Tipe */}
                    <td className="td" onClick={() => setSelected(emp)}>
                      <Badge className={cn(TIPE_COLORS[emp.tipe])}>{emp.tipe}</Badge>
                    </td>

                    {/* Status */}
                    <td className="td" onClick={() => setSelected(emp)}>
                      <Badge className={cn(STATUS_COLORS[emp.status])}>
                        {STATUS_LABEL[emp.status]}
                      </Badge>
                    </td>

                    {/* Join date */}
                    <td className="td hidden md:table-cell text-sm text-gray-500 num" onClick={() => setSelected(emp)}>
                      {emp.join_date ? fmtDate(emp.join_date) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Account status */}
                    <td className="td hidden sm:table-cell" onClick={() => setSelected(emp)}>
                      {emp.user_id ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Aktif</Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-400 border-gray-200 text-[10px]">Belum ada</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Menampilkan {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} dari {total}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ‹ Prev
              </button>
              <button
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </Card>

      </> /* end activeTab === "employees" */}

      {/* Detail Modal */}
      {selected && (
        <EmployeeDetailModal
          open={!!selected}
          onClose={() => setSelected(null)}
          employee={selected}
        />
      )}

      {/* New Employee Modal */}
      {canCreateEmployee && <NewEmployeeModal open={showNew} onClose={() => setShowNew(false)} />}

      {/* Bulk Create Accounts Modal */}
      {canCreateAccounts && showBulk && (
        <BulkCreateModal
          open={showBulk}
          employees={checkedEmployees}
          allowedRoles={allowedBulkRoles}
          onClose={() => setShowBulk(false)}
          onDone={() => {
            setCheckedIds(new Set());
            setShowBulk(false);
            qc.invalidateQueries({ queryKey: ["hris", "employees"] });
          }}
        />
      )}
    </div>
  );
}
