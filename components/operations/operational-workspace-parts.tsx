"use client";

import React, { useRef, useState } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { FloatingActionMenu } from "@/components/ui/floating-action-menu";
import type { OperationalModule, OperationalRecord } from "@/lib/types";

import {
  ACTION_META,
  APPROVER_ACTIONS,
  WORKFLOW_ACTIONS,
} from "./operational-workspace-config";

export function RowActionMenu({
  record,
  module,
  currentUserId,
  onView,
  onEdit,
  onTransition,
  onDelete,
}: {
  record: OperationalRecord;
  module: OperationalModule;
  currentUserId: number | null;
  onView: () => void;
  onEdit: () => void;
  onTransition: (action: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const canManage = module.can_approve || record.created_by === currentUserId || record.owner_id === currentUserId;
  const actions = WORKFLOW_ACTIONS[record.status].filter(
    action => !APPROVER_ACTIONS.has(action) || module.can_approve,
  );
  const deletable = canManage && ["draft", "rejected", "cancelled"].includes(record.status);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        className="p-2 rounded-lg text-[#94A3B8] hover:text-[#0C2138] hover:bg-[#F8FAF9] transition-colors"
        aria-label={`Actions for ${record.reference_no}`}
      >
        <MoreHorizontal size={16} />
      </button>
      <FloatingActionMenu open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} widthClass="w-52">
        <MenuButton icon={Eye} label="View Details" onClick={() => { setOpen(false); onView(); }} />
        {canManage && record.status !== "closed" && (
          <MenuButton icon={Pencil} label={record.status === "draft" || record.status === "rejected" ? "Edit" : "Update Progress"} onClick={() => { setOpen(false); onEdit(); }} />
        )}
        {actions.map(action => {
          const meta = ACTION_META[action];
          return (
            <MenuButton
              key={action}
              icon={meta.icon}
              label={meta.label}
              danger={meta.danger}
              onClick={() => { setOpen(false); onTransition(action); }}
            />
          );
        })}
        {deletable && (
          <MenuButton icon={Trash2} label="Delete" danger onClick={() => { setOpen(false); onDelete(); }} />
        )}
      </FloatingActionMenu>
    </>
  );
}

function MenuButton({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-[#33445A] hover:bg-[#F8FAF9]"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export function SummaryTile({
  label,
  value,
  danger = false,
  className = "",
}: {
  label: string;
  value: string;
  danger?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-[#E7E5DF] rounded-lg px-4 py-3 shadow-xs min-w-0 ${className}`}>
      <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#94A3B8] truncate">{label}</p>
      <p className={`font-mono text-[17px] font-bold mt-1 truncate ${danger ? "text-red-600" : "text-[#0C2138]"}`}>{value}</p>
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-10 rounded-lg border border-[#E7E5DF] bg-white px-3 text-[12px] text-[#33445A] outline-none focus:border-[#0A3A63] min-w-[145px]"
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}

export function DetailValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#94A3B8] truncate">{label}</p>
      <div className="text-[12px] font-medium text-[#33445A] mt-1 truncate">{children}</div>
    </div>
  );
}
