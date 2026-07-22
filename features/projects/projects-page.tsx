"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AlertTriangle, LayoutGrid, List, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { projectsApi } from "@/lib/api";
import { useRole } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/hooks/use-toast";
import { useTableSort } from "@/lib/table-sort";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn, getErrorMessage } from "@/lib/utils";
import { NewProjectModal } from "./components/new-project-modal";
import { ProjectCard, ProjectRow } from "./components/project-list-items";

// The spreadsheet parser is only needed after the user opens Import.
const ImportModal = dynamic(() => import("./components/import-modal"), { ssr: false });

type ProjectSortKey = "code" | "name" | "status" | "contract_value" | "burn_rate" | "margin" | "end_date";

type ViewMode = "card" | "table";
type ArchiveFilter = "active" | "archived" | "all";

const STATUS_FILTERS: { label: string; value: ProjectStatus | "" }[] = [
  { label: "All",       value: "" },
  { label: "Active",    value: "active" },
  { label: "On Hold",   value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ProjectsPage() {
  const qc  = useQueryClient();
  const { isPM, isCostControl, isMD } = useRole();
  const canManage = isPM || isCostControl;
  const canDelete = isMD;
  const [view,        setView]   = useState<ViewMode>("card");
  const [search,      setSearch] = useState("");
  const [statusFilter,setStatus] = useState<ProjectStatus | "">("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [page,        setPage]   = useState(1);
  const [importOpen,  setImport] = useState(false);
  const [newOpen,     setNew]    = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const { sortKey, sortDirection, toggleSort } = useTableSort<ProjectSortKey>("code", "asc");

  const PAGE_SIZE = 18; // 3-col grid fits 18 nicely

  const { data: projectData, isLoading } = useQuery({
    queryKey: ["projects", statusFilter, archiveFilter, search, sortKey, sortDirection, page],
    queryFn:  () => {
      const params: Parameters<typeof projectsApi.list>[0] = {
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort_by: sortKey,
        sort_dir: sortDirection,
      };
      if (statusFilter) params.status = statusFilter;
      if (archiveFilter === "active") params.archived = false;
      if (archiveFilter === "archived") params.archived = true;
      if (archiveFilter === "all") params.include_archived = true;
      if (search) params.search = search;
      return projectsApi.list(params).then((r) => r.data);
    },
  });
  const projects  = projectData?.items ?? [];
  const totalPages = Math.ceil((projectData?.total ?? 0) / PAGE_SIZE);
  const paged      = projects;

  function handleSort(column: ProjectSortKey) {
    toggleSort(column);
    setPage(1);
  }

  const archiveMut = useMutation({
    mutationFn: (project: Project) => projectsApi.update(project.id, { is_archived: !project.is_archived }),
    onSuccess: (_, project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toastSuccess(project.is_archived ? "Project restored" : "Project archived", project.code);
    },
    onError: (e) => toastError("Update failed", getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (project: Project) => projectsApi.delete(project.id),
    onSuccess: (_, project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDeletingProject(null);
      toastSuccess("Project deleted", project.code);
    },
    onError: (e) => toastError("Delete failed", getErrorMessage(e)),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {canManage && newOpen && <NewProjectModal onClose={() => setNew(false)} />}
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Project Command</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {projectData?.total ?? 0} project{(projectData?.total ?? 0) !== 1 ? "s" : ""} · All workspaces
          </p>
        </div>
        {canManage && <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={13} />}
            onClick={() => setImport(true)}
          >
            Import
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => setNew(true)}
          >
            New Project
          </Button>
        </div>}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search code, name…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                statusFilter === f.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {[
            { label: "Active", value: "active" },
            { label: "Archived", value: "archived" },
            { label: "All", value: "all" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setArchiveFilter(f.value as ArchiveFilter); setPage(1); }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                archiveFilter === f.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-1 ml-auto sm:ml-0">
          <button
            onClick={() => setView("card")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "card" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"
            )}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "table" ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"
            )}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : projects.length === 0
              ? (
                <div className="col-span-full bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <AlertTriangle size={24} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">No projects found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {search ? "Try a different search" : "Create or import your first project"}
                  </p>
                </div>
              )
              : paged.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  canManage={canManage}
                  canDelete={canDelete}
                  onArchive={(project) => archiveMut.mutate(project)}
                  onDelete={setDeletingProject}
                />
              ))
          }
        </div>
      ) : (
        <Card padding={false}>
          {isLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <div className="overflow-x-auto"><table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableTableHeader label="Code" column="code" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableTableHeader label="Project Name" column="name" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableTableHeader label="Status" column="status" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell" />
                  <SortableTableHeader label="Contract Value" column="contract_value" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                  <SortableTableHeader label="Burn Rate" column="burn_rate" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell" />
                  <SortableTableHeader label="Margin" column="margin" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                  <SortableTableHeader label="End Date" column="end_date" sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="td text-center text-gray-400 py-12">
                      No projects match your filters
                    </td>
                  </tr>
                ) : (
                  paged.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      canManage={canManage}
                      canDelete={canDelete}
                      onArchive={(project) => archiveMut.mutate(project)}
                      onDelete={setDeletingProject}
                    />
                  ))
                )}
              </tbody>
            </table></div>
          )}
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={projectData?.total}
          pageSize={PAGE_SIZE}
        />
      )}

      {canManage && importOpen && <ImportModal open onClose={() => setImport(false)} />}
      <ConfirmDialog
        open={canDelete && !!deletingProject}
        onClose={() => {
          if (!deleteMut.isPending) setDeletingProject(null);
        }}
        onConfirm={() => {
          if (deletingProject) deleteMut.mutate(deletingProject);
        }}
        title="Delete Project"
        message={
          deletingProject
            ? `Delete archived project ${deletingProject.code}? Related revenue, spending, petty cash, and project documents will also be deleted.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
      />

    </div>
  );
}
