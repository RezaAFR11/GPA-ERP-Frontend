import type { ItemCategory } from "@/lib/types";

// Inventory metadata is shared by filters, forms, and table presentation.
export const INVENTORY_CATEGORIES: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "materials", label: "Materials" },
  { value: "tools", label: "Tools" },
  { value: "consumables", label: "Consumables" },
];

export const CATEGORY_COLORS: Record<ItemCategory, string> = {
  materials: "bg-green-100 text-green-700",
  tools: "bg-blue-100 text-blue-700",
  consumables: "bg-amber-100 text-amber-700",
};

export const INVENTORY_UNITS = [
  "pcs",
  "set",
  "unit",
  "kg",
  "ltr",
  "m",
  "m\u00b2",
  "m\u00b3",
  "roll",
  "box",
  "btl",
  "sak",
];

export const inventoryInputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export const inventoryLabelClass =
  "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

export function formatInventoryQuantity(value: number | string | null | undefined) {
  const numberValue = typeof value === "string" ? parseFloat(value) : value;
  if (numberValue === null || numberValue === undefined || Number.isNaN(numberValue)) return "0";
  return numberValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
