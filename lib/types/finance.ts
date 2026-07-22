import type { RoleName, UserSummary } from "./core";

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "completed" | "on_hold" | "cancelled";

export interface Project {
  id: number;
  code: string;
  name: string;
  contract_value: number;
  currency: string;
  is_archived: boolean;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  imported_at: string | null;
  created_at: string;
  total_revenue: number;
  total_committed: number;
  budget: number;
}

export interface ProjectLookup {
  id: number;
  code: string;
  name: string;
  is_archived: boolean;
  status: ProjectStatus;
}

export interface ProjectDocument {
  id: number;
  project_id: number;
  doc_type: string;
  title: string;
  file_path: string;
  reference_no: string | null;
  created_at: string;
}

export interface ProjectImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

// ─── CostCode ────────────────────────────────────────────────────────────────

export type CostCodeCategory = "Direct" | "Site" | "Personnel" | "Overhead" | "Other";

export interface CostCode {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  category: CostCodeCategory;
  is_active: boolean;
  created_at: string;
}

export interface CostCentre {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Account Receivable ───────────────────────────────────────────────────────

export type ARStatus = "draft" | "confirmed";

export interface AccountReceivable {
  id: number;
  project_id: number;
  amount: number;
  description: string;
  invoice_no: string | null;
  customer_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  expected_payment: number | null;
  actual_payment: number | null;
  remaining_amount: number | null;
  paid_at: string | null;
  status: ARStatus;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_at: string;
  confirmer?: UserSummary | null;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface ReceivablesSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  collection_rate: number;
  count: number;
}

export type ExpenseStatus =
  | "draft" | "submitted" | "verified"
  | "approved" | "paid" | "hard_locked" | "rejected";

export type ExpenseType = "regular" | "reimbursement";

export interface ExpenseStats {
  total_logged: number;
  total_approved: number;
  total_paid: number;
  count_by_status: Record<string, number>;
}

export interface Expense {
  id: number;
  expense_type: ExpenseType;
  project_id: number | null;
  cost_code_id: number;
  cost_centre_id: number | null;
  petty_cash_line_id: number | null;
  amount: number;
  description: string;
  vendor_name: string | null;
  reference_no: string | null;
  receipt_url: string | null;
  status: ExpenseStatus;
  over_budget?: boolean | null;
  budget_remaining?: number | null;
  submitted_by: number | null;
  receipt_reviewed_by: number | null;
  verified_by: number | null;
  approved_by: number | null;
  paid_by: number | null;
  current_approver_role: string | null;
  approval_chain: string[] | null;
  approval_step: number;
  approval_history: ApprovalEvent[] | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  cost_code?: CostCode | null;
  cost_centre?: CostCentre | null;
  submitter?: UserSummary | null;
}

export interface ApprovalEvent {
  action: string;
  role: string | null;
  user_id: number;
  timestamp: string;
  note: string | null;
}

export type PettyCashReportStatus = "draft" | "posted" | "void";

export interface PettyCashReportLine {
  id: number;
  report_id: number;
  expense_id: number | null;
  line_no: number;
  spent_on: string | null;
  description: string;
  amount: number;
  receipt_url: string | null;
  source: string | null;
  ocr_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface PettyCashReport {
  id: number;
  report_no: string;
  month: string;
  project_id: number;
  cost_code_id: number;
  cost_centre_id: number | null;
  title: string | null;
  notes: string | null;
  status: PettyCashReportStatus;
  total_amount: number;
  created_by: number;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  project?: Project | null;
  cost_code?: CostCode | null;
  cost_centre?: CostCentre | null;
  creator?: UserSummary | null;
  lines: PettyCashReportLine[];
}

// ─── ApprovalRule ─────────────────────────────────────────────────────────────

export interface ApprovalRule {
  id: number;
  min_amount: number;
  max_amount: number | null;
  cost_code_category: CostCodeCategory | null;
  required_role: RoleName;
  priority: number;
  is_active: boolean;
  created_at: string;
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  changed_by: number | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Vault create/update types ───────────────────────────────────────────────

export interface CostCodeCreate {
  code:      string;
  name:      string;
  category:  CostCodeCategory;
  parent_id?: number;
}

export interface CostCentreCreate {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface ApprovalRuleCreate {
  min_amount:          number;
  max_amount?:         number;
  cost_code_category?: CostCodeCategory;
  required_role:       RoleName;
  priority:            number;
}

export interface ApprovalRuleUpdate {
  min_amount?:          number;
  max_amount?:          number | null;
  cost_code_category?:  CostCodeCategory | null;
  required_role?:       RoleName;
  priority?:            number;
  is_active?:           boolean;
}
