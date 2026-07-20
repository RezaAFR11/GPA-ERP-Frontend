/** Menu keys whose data can be discovered from the global command palette. */
export const SEARCHABLE_MENU_KEYS = [
  "project_command",
  "spending",
  "action_center",
  "revenue_ar",
  "legal",
  "inventory",
  "procurement",
  "accounts_payable",
  "accounting_tax",
  "project_execution",
  "engineering_documents",
  "quality_control",
  "hse",
  "warehouse_logistics",
  "equipment_assets",
  "contract_management",
  "crm_tender",
  "manpower_operations",
  "budget_bi",
] as const;

type CanAccessMenu = (key: string) => boolean;

export function hasSearchAccess(canAccessMenu: CanAccessMenu): boolean {
  return SEARCHABLE_MENU_KEYS.some((key) => canAccessMenu(key));
}

// Specific HRIS self-service paths must precede the /hris catch-all. Keeping
// this mapping in one place prevents the route guard and navigation from
// drifting apart as menus are added.
const PATH_MENU_KEYS: ReadonlyArray<readonly [string, string]> = [
  ["/dashboard", "dashboard"],
  ["/action-center", "action_center"],
  ["/projects", "project_command"],
  ["/revenue", "revenue_ar"],
  ["/spending", "spending"],
  ["/inventory", "inventory"],
  ["/legal", "legal"],
  ["/reports", "reports"],
  ["/accounts-payable", "accounts_payable"],
  ["/accounting-tax", "accounting_tax"],
  ["/budget-bi", "budget_bi"],
  ["/project-execution", "project_execution"],
  ["/procurement", "procurement"],
  ["/engineering-documents", "engineering_documents"],
  ["/quality-control", "quality_control"],
  ["/hse", "hse"],
  ["/warehouse-logistics", "warehouse_logistics"],
  ["/equipment-assets", "equipment_assets"],
  ["/contracts", "contract_management"],
  ["/crm-tenders", "crm_tender"],
  ["/settings", "settings"],
  ["/vault", "vault"],
  ["/hris/me/payslip", "hris_my_payslip"],
  ["/hris/me/documents", "hris_my_payslip"],
  ["/hris/me/overtime", "hris_attendance"],
  ["/hris/me/leave", "hris_leave"],
  ["/hris/me/attendance", "hris_attendance"],
  ["/hris/manpower", "manpower_operations"],
  ["/hris/employees", "hris_employees"],
  ["/hris/attendance", "hris_attendance"],
  ["/hris/leave", "hris_leave"],
  ["/hris/payroll", "hris_payroll"],
  ["/hris/recruitment", "hris_recruitment"],
  ["/hris/settings", "hris_settings"],
  ["/hris", "hris_dashboard"],
];

export function menuKeyForPath(pathname: string): string | null {
  if (pathname === "/home" || pathname === "/hris/me") return null;
  return PATH_MENU_KEYS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
}
