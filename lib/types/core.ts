import type { Expense } from "./finance";

// GPA-ERP V5.0 — TypeScript type definitions

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type RoleName =
  | "SUPER_ADMIN" | "MD" | "PM" | "PROJECT_CONTROL"
  | "COST_CONTROL" | "FINANCE" | "GA" | "HR" | "STAFF" | "WORKER";

export interface Role { id: number; name: RoleName; }

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  role: Role;
  created_at: string;
  must_change_password?: boolean;
  employee_id?: number | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PasswordChangeResponse extends TokenResponse {
  message: string;
}

export interface WorkspaceBranding {
  logo: string;
  title: string;
  subtitle: string;
}

export interface UserListSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface AppMenuPermission {
  key: string;
  label: string;
  section: string;
  path: string | null;
  description: string | null;
  sort_order: number;
  can_access: boolean;
}

export interface MenuPermissionsResponse {
  allowed_keys: string[];
  menus: AppMenuPermission[];
}

// ─── Paginated response wrapper ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

// ─── User create ──────────────────────────────────────────────────────────────

export interface UserCreate {
  email:     string;
  password:  string;
  full_name: string;
  role_id:   number;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export interface UserSummary {
  id: number;
  full_name: string;
  email: string;
  role: Role;
}

export interface MessageResponse { message: string; }

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id:         number;
  title:      string;
  body:       string;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

export interface ActionCenterGroup {
  label: string;
  count: number;
  items: Expense[];
}

// ─── Dashboard KPI ────────────────────────────────────────────────────────────

export interface DashboardKPI {
  total_budget: number;
  total_committed: number;
  total_revenue: number;
  active_projects: number;
  pending_actions: number;
  margin_pct: number;
}

export interface MarginDataPoint {
  month: string;
  margin: number;
  spent: number;
  revenue: number;
}
