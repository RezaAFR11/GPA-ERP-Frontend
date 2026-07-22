import type { CostCodeCategory, RoleName } from "@/lib/types";

// Centralized option lists keep every Vault form aligned with backend enums.
export const COST_CODE_CATEGORIES: CostCodeCategory[] = [
  "Direct",
  "Site",
  "Personnel",
  "Overhead",
  "Other",
];

export const APPROVAL_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "MD",
  "PM",
  "COST_CONTROL",
  "FINANCE",
  "GA",
  "STAFF",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Direct: "bg-blue-50 text-blue-700 border-blue-200",
  Site: "bg-green-50 text-green-700 border-green-200",
  Personnel: "bg-purple-50 text-purple-700 border-purple-200",
  Overhead: "bg-amber-50 text-amber-700 border-amber-200",
  Other: "bg-gray-100 text-gray-600 border-gray-200",
};
