"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { vaultApi } from "@/lib/api";
import { useTableSort } from "@/lib/table-sort";
import { cn, fmtDateTime } from "@/lib/utils";

type AuditSortKey = "created_at" | "entity" | "action" | "user" | "ip_address";

const AUDIT_PAGE_SIZE = 50;

export function AuditLogTab() {
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const tableSort = useTableSort<AuditSortKey>("created_at", "desc");

  function handleSort(column: AuditSortKey) {
    tableSort.toggleSort(column);
    setPage(1);
    setExpandedId(null);
  }

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["audit-log", entityFilter, tableSort.sortKey, tableSort.sortDirection, page],
    queryFn: () => vaultApi.auditLog({
      ...(entityFilter ? { entity_type: entityFilter } : {}),
      sort_by: tableSort.sortKey,
      sort_dir: tableSort.sortDirection,
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      limit: AUDIT_PAGE_SIZE,
    }).then((r) => r.data),
  });
  const logs = auditData?.items ?? [];
  const total = auditData?.total ?? 0;
  const totalPages = Math.ceil(total / AUDIT_PAGE_SIZE);

  const { data: entityTypes = [] } = useQuery({
    queryKey: ["audit-log", "entity-types"],
    queryFn: () => vaultApi.auditEntityTypes().then((r) => r.data),
  });

  const filtered = search
    ? logs.filter((log) =>
        log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        String(log.entity_id).includes(search)
      )
    : logs;

  const ACTION_COLORS: Record<string, string> = {
    CREATE:           "bg-green-50 text-green-700 border-green-200",
    UPDATE:           "bg-blue-50 text-blue-700 border-blue-200",
    RESTORE:          "bg-green-50 text-green-700 border-green-200",
    DELETE:           "bg-red-50 text-red-700 border-red-200",
    DEACTIVATE:       "bg-orange-50 text-orange-700 border-orange-200",
    CANCEL:           "bg-red-50 text-red-700 border-red-200",
    IMPORT:           "bg-purple-50 text-purple-700 border-purple-200",
    SUBMIT:           "bg-cyan-50 text-cyan-700 border-cyan-200",
    APPROVE:          "bg-green-50 text-green-700 border-green-200",
    SIGN:             "bg-green-50 text-green-700 border-green-200",
    REJECT:           "bg-red-50 text-red-700 border-red-200",
    PAY:              "bg-purple-50 text-purple-700 border-purple-200",
    STOCK_IN:         "bg-green-50 text-green-700 border-green-200",
    STOCK_OUT:        "bg-red-50 text-red-700 border-red-200",
    STOCK_ADJUSTMENT: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search current page..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); setExpandedId(null); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All entity types</option>
          {entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <p className="text-xs text-gray-400 ml-auto">{filtered.length} shown · {total} total</p>
      </div>

      <Card padding={false}>
        {isLoading ? <TableSkeleton rows={8} cols={5} /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableTableHeader label="Timestamp" column="created_at" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Entity" column="entity" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Action" column="action" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} />
                <SortableTableHeader label="User" column="user" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} className="hidden md:table-cell" />
                <SortableTableHeader label="IP" column="ip_address" sortKey={tableSort.sortKey} sortDirection={tableSort.sortDirection} onSort={handleSort} className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-10 text-xs">No audit entries found</td></tr>
              ) : filtered.map((log) => (
                <Fragment key={log.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="td">
                      <span className="text-xs text-gray-500 num">{fmtDateTime(log.created_at)}</span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedId((current) => current === log.id ? null : log.id)}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          title="View change details"
                        >
                          {expandedId === log.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <span className="text-xs font-semibold text-gray-700">{log.entity_type}</span>
                        <span className="num text-[10px] text-gray-400">#{log.entity_id}</span>
                      </div>
                    </td>
                    <td className="td">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide",
                        ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="td hidden md:table-cell">
                      <span className="num text-xs text-gray-500">{log.changed_by ? `#${log.changed_by}` : "—"}</span>
                    </td>
                    <td className="td hidden lg:table-cell">
                      <span className="text-xs text-gray-400 font-mono">{log.ip_address ?? "—"}</span>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-gray-50/70">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Before</p>
                            <pre className="text-[10px] leading-relaxed bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-56">
                              {log.before_state ? JSON.stringify(log.before_state, null, 2) : "No previous state"}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">After</p>
                            <pre className="text-[10px] leading-relaxed bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-56">
                              {log.after_state ? JSON.stringify(log.after_state, null, 2) : "No resulting state"}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => { setPage(nextPage); setExpandedId(null); }}
          totalItems={total}
          pageSize={AUDIT_PAGE_SIZE}
        />
      )}
    </div>
  );
}
