"use client";

import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import type { SortDirection } from "@/lib/table-sort";
import type { OperationalModule, OperationalRecord } from "@/lib/types";
import { PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE } from "./operational-workspace-config";
import { formatDate, formatMoney } from "./operational-workspace-helpers";
import { RowActionMenu } from "./operational-workspace-parts";
import { nextProcessor } from "./workflow-guide";
import styles from "./operational-record-list.module.css";

export type OperationalSortKey = "id" | "reference_no" | "record_type" | "title" | "project_partner" | "amount" | "progress" | "due_date" | "status";

const SORT_OPTIONS: { key: OperationalSortKey; label: string }[] = [
  { key: "id", label: "Record ID" },
  { key: "reference_no", label: "Reference" },
  { key: "record_type", label: "Type" },
  { key: "title", label: "Document title" },
  { key: "project_partner", label: "Project / Partner" },
  { key: "amount", label: "Value" },
  { key: "status", label: "Status" },
  { key: "progress", label: "Progress" },
  { key: "due_date", label: "Due date" },
];

interface OperationalRecordListProps {
  records: OperationalRecord[];
  module: OperationalModule;
  projectMap: Map<number, string>;
  currentUserId: number | null;
  sortKey: OperationalSortKey;
  sortDirection: SortDirection;
  onSort: (column: OperationalSortKey) => void;
  onView: (record: OperationalRecord) => void;
  onEdit: (record: OperationalRecord) => void;
  onTransition: (record: OperationalRecord, action: string) => void;
  onDelete: (record: OperationalRecord) => void;
}

function DocumentSummary({ record, module, onView }: Pick<OperationalRecordListProps, "module" | "onView"> & { record: OperationalRecord }) {
  return (
    <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
      <p className="font-mono text-[11px] font-semibold text-[#33445A]">{record.reference_no}</p>
      <p className="text-[11px] text-[#5E7186]">{module.record_types[record.record_type] ?? record.record_type}</p>
      <button type="button" onClick={() => onView(record)} title={record.title}
        className="block w-full text-left text-[12.5px] font-semibold text-[#0C2138] hover:underline focus-visible:outline-teal-700">
        <span className="line-clamp-2">{record.title}</span>
      </button>
      <p className="text-[11px] text-teal-700">→ {nextProcessor(record)}</p>
      <p className="text-[11px] text-slate-500">{record.workflow?.instruction}</p>
      <p className={`text-[10px] capitalize ${PRIORITY_STYLE[record.priority]}`}>{record.priority} priority</p>
    </div>
  );
}

function StatusProgress({ record }: { record: OperationalRecord }) {
  return (
    <div className="space-y-2">
      <Badge dot className={STATUS_STYLE[record.status]}>{STATUS_LABEL[record.status]}</Badge>
      <div className="flex items-center gap-2" aria-label={`Progress: ${Number(record.progress).toFixed(0)}%`}>
        <div className="h-1.5 min-w-0 flex-1 rounded-full bg-[#EEF0F2] overflow-hidden" aria-hidden="true">
          <div className="h-full bg-[#0D9488]" style={{ width: `${Math.min(100, Number(record.progress))}%` }} />
        </div>
        <span className="shrink-0 font-mono text-[11px] text-[#5E7186]">{Number(record.progress).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function OperationalRecordList({ records, module, projectMap, currentUserId, sortKey, sortDirection, onSort, onView, onEdit, onTransition, onDelete }: OperationalRecordListProps) {
  const sortId = useId();
  const sorting = { sortKey, sortDirection, onSort };
  const projectName = (record: OperationalRecord) => record.project_id
    ? projectMap.get(record.project_id) ?? `Project #${record.project_id}`
    : "No project";
  const actionMenu = (record: OperationalRecord) => (
    <RowActionMenu record={record} module={module} currentUserId={currentUserId}
      onView={() => onView(record)} onEdit={() => onEdit(record)}
      onTransition={action => onTransition(record, action)} onDelete={() => onDelete(record)} />
  );
  const projectSummary = (record: OperationalRecord) => (
    <div className="space-y-1 [overflow-wrap:anywhere]">
      <p className="text-[12px] text-[#33445A]">{projectName(record)}</p>
      <p className="text-[11px] text-[#94A3B8]">{record.partner_name || "-"}</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[var(--border)] p-3 text-xs text-[#5E7186]">
        <label htmlFor={sortId}>Sort by</label>
        <select id={sortId} value={sortKey} onChange={event => onSort(event.target.value as OperationalSortKey)}
          className="min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--fg-2)]">
          {SORT_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <button type="button" onClick={() => onSort(sortKey)} aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
          className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--row-hover)]">
          {sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
        </button>
      </div>

      <div className={styles.tableViewport}>
        <table className={styles.table} aria-label={`${module.label} records`}>
          <thead>
            <tr>
              <SortableTableHeader label="Document" column="title" {...sorting} />
              <SortableTableHeader label="Project / Partner" column="project_partner" {...sorting} className="w-[170px]" />
              <SortableTableHeader label="Value" column="amount" {...sorting} align="right" className="w-[180px]" />
              <SortableTableHeader label="Status / Progress" column="status" {...sorting} className="w-[150px]" />
              <SortableTableHeader label="Due" column="due_date" {...sorting} className="w-[105px]" />
              <th scope="col" className="th w-[76px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id}>
                <td className="td"><DocumentSummary record={record} module={module} onView={onView} /></td>
                <td className="td">{projectSummary(record)}</td>
                <td className="td text-right font-mono text-[12px] font-semibold">{formatMoney(record.amount, record.currency)}</td>
                <td className="td"><StatusProgress record={record} /></td>
                <td className="td text-[12px]">{formatDate(record.due_date)}</td>
                <td className="td">{actionMenu(record)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cards}>
        {records.map(record => (
          <article key={record.id} aria-label={record.title} className="min-w-0 p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1"><DocumentSummary record={record} module={module} onView={onView} /></div>
              <div className="shrink-0">{actionMenu(record)}</div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 min-w-0"><dt className="mb-1 text-[#94A3B8]">Project / Partner</dt><dd>{projectSummary(record)}</dd></div>
              <div className="col-span-2 min-w-0"><dt className="mb-1 text-[#94A3B8]">Value</dt><dd className="font-mono font-semibold [overflow-wrap:anywhere]">{formatMoney(record.amount, record.currency)}</dd></div>
              <div className="min-w-0"><dt className="mb-2 text-[#94A3B8]">Status / Progress</dt><dd><StatusProgress record={record} /></dd></div>
              <div className="min-w-0"><dt className="mb-2 text-[#94A3B8]">Due</dt><dd>{formatDate(record.due_date)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
