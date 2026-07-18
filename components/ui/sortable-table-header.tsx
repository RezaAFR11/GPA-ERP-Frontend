"use client";

import type { ReactNode, ThHTMLAttributes } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/table-sort";

interface SortableTableHeaderProps<Key extends string>
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "onClick"> {
  label: ReactNode;
  column: Key;
  sortKey: Key;
  sortDirection: SortDirection;
  onSort: (column: Key) => void;
  align?: "left" | "center" | "right";
}

/** Accessible table heading that toggles ascending and descending ordering. */
export function SortableTableHeader<Key extends string>({
  label,
  column,
  sortKey,
  sortDirection,
  onSort,
  align = "left",
  className,
  ...props
}: SortableTableHeaderProps<Key>) {
  const active = sortKey === column;
  const alignment = {
    left: "justify-start text-left",
    center: "justify-center text-center",
    right: "justify-end text-right",
  }[align];

  return (
    <th
      scope="col"
      aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      className={cn("th", className)}
      {...props}
    >
      <button
        type="button"
        className={cn(
          "group inline-flex w-full items-center gap-1 select-none rounded-sm outline-none transition-colors",
          "hover:text-[#5E7186] focus-visible:ring-2 focus-visible:ring-primary/30",
          alignment,
        )}
        onClick={() => onSort(column)}
        title={`Sort by ${typeof label === "string" ? label : column}`}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={cn("shrink-0 transition-opacity", active ? "opacity-100" : "opacity-30")}
        >
          {active && sortDirection === "asc" ? (
            <ChevronUp size={11} strokeWidth={2} />
          ) : (
            <ChevronDown size={11} strokeWidth={2} />
          )}
        </span>
      </button>
    </th>
  );
}
