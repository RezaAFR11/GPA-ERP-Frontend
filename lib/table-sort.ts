import { useCallback, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | boolean | Date | null | undefined;

export function useTableSort<Key extends string>(
  initialKey: Key,
  initialDirection: SortDirection = "asc",
) {
  const [sortKey, setSortKey] = useState<Key>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const toggleSort = useCallback((column: Key) => {
    setSortKey((currentKey) => {
      if (currentKey === column) {
        setSortDirection((currentDirection) => currentDirection === "asc" ? "desc" : "asc");
        return currentKey;
      }
      setSortDirection("asc");
      return column;
    });
  }, []);

  return { sortKey, sortDirection, toggleSort };
}

function compareValues(left: SortValue, right: SortValue): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const normalizedLeft = left instanceof Date ? left.getTime() : left;
  const normalizedRight = right instanceof Date ? right.getTime() : right;

  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    if (!Number.isFinite(normalizedLeft) && !Number.isFinite(normalizedRight)) return 0;
    if (!Number.isFinite(normalizedLeft)) return 1;
    if (!Number.isFinite(normalizedRight)) return -1;
    return normalizedLeft - normalizedRight;
  }

  if (typeof normalizedLeft === "boolean" && typeof normalizedRight === "boolean") {
    return Number(normalizedLeft) - Number(normalizedRight);
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/** Return a sorted copy while keeping null values at the end in either direction. */
export function sortTableRows<Row, Key extends string>(
  rows: readonly Row[],
  sortKey: Key,
  sortDirection: SortDirection,
  accessors: Record<Key, (row: Row) => SortValue>,
): Row[] {
  return [...rows].sort((left, right) => {
    const leftValue = accessors[sortKey](left);
    const rightValue = accessors[sortKey](right);

    if (leftValue == null || (typeof leftValue === "number" && !Number.isFinite(leftValue))) {
      return rightValue == null || (typeof rightValue === "number" && !Number.isFinite(rightValue)) ? 0 : 1;
    }
    if (rightValue == null || (typeof rightValue === "number" && !Number.isFinite(rightValue))) return -1;

    const result = compareValues(leftValue, rightValue);
    return sortDirection === "asc" ? result : -result;
  });
}
