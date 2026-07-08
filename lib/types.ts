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

// ─── Legal Documents ─────────────────────────────────────────────────────────

export type DocType    = "proposal" | "berita_acara" | "surat_jalan" | "other";
export type DocStatus  = "draft" | "submitted" | "signed" | "rejected";

export interface LegalDocument {
  id:                number;
  doc_number:        string | null;
  reference_number:  string | null;
  doc_type:          DocType;
  status:            DocStatus;
  title:             string;
  subject:           string;
  body:              string;
  recipient_name:    string | null;
  recipient_company: string | null;
  recipient_address: string | null;
  closing:           string | null;
  quoted_amount:     number | null;
  project_id:        number | null;
  rejection_note:    string | null;
  signed_by:         number | null;
  signed_at:         string | null;
  created_by:        number;
  created_at:        string;
  updated_at:        string;
  creator?:          UserSummary | null;
  signer?:           UserSummary | null;
}

export interface LegalDocCreate {
  doc_number?:        string;
  reference_number?:  string;
  doc_type:           DocType;
  title:              string;
  subject:            string;
  body:               string;
  recipient_name?:    string;
  recipient_company?: string;
  recipient_address?: string;
  closing?:           string;
  quoted_amount?:     number;
  project_id?:        number;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export type ItemCategory = "materials" | "tools" | "consumables";
export type TxnType      = "in" | "out" | "adjustment";

export interface InventoryItem {
  id:          number;
  code:        string;
  name:        string;
  category:    ItemCategory;
  unit:        string;
  qty_on_hand: number;
  min_stock:   number;
  unit_cost:   number | null;
  location:    string | null;
  notes:       string | null;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
}

export interface InventoryItemCreate {
  code:         string;
  name:         string;
  category:     ItemCategory;
  unit:         string;
  qty_on_hand:  number;
  min_stock:    number;
  unit_cost?:   number;
  location?:    string;
  notes?:       string;
}

export interface InventoryTxnCreate {
  txn_type:    TxnType;
  quantity:    number;
  reference?:  string;
  notes?:      string;
  project_id?: number;
}

export interface InventoryTxn {
  id:         number;
  item_id:    number;
  txn_type:   TxnType;
  quantity:   number;
  reference:  string | null;
  notes:      string | null;
  project_id: number | null;
  created_by: number;
  created_at: string;
}

// ─── Paginated response wrapper ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
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

// ═══════════════════════════════════════════════════════════════════════════════
// HRIS Types — Phase H1: Data Karyawan & Organisasi
// ═══════════════════════════════════════════════════════════════════════════════

export type EmploymentType = "Tetap" | "PKWT" | "Outsource";
export type EmployeeStatus = "active" | "probation" | "leave" | "terminated";
export type EmpDocType = "KTP" | "NPWP" | "BPJS_TK" | "BPJS_KES" | "IJAZAH" | "SKCK" | "OTHER";

export interface Department {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobGrade {
  id: number;
  code: string;
  name: string;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  doc_type: EmpDocType;
  file_url: string;
  uploaded_at: string;
  created_at: string;
}

export interface Employee {
  id: number;
  employee_no: string;
  full_name: string;
  nik: string | null;
  npwp: string | null;
  email: string | null;
  phone: string | null;
  tipe: EmploymentType;
  status: EmployeeStatus;
  dept_id: number | null;
  grade_id: number | null;
  site: string | null;
  join_date: string | null;
  end_date: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bpjs_tk_no: string | null;
  bpjs_kes_no: string | null;
  user_id: number | null;
  photo_url: string | null;
  ptkp_status: string | null;   // e.g. "TK/0", "K/1"
  department: Department | null;
  grade: JobGrade | null;
  user: { id: number; full_name: string } | null;
  documents: EmployeeDocument[];
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  employee_no: string;
  full_name: string;
  nik?: string | null;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  tipe: EmploymentType;
  status?: EmployeeStatus;
  dept_id?: number | null;
  grade_id?: number | null;
  site?: string | null;
  join_date?: string | null;
  end_date?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bpjs_tk_no?: string | null;
  bpjs_kes_no?: string | null;
  user_id?: number | null;
}

export interface BulkAccountResult {
  employee_id:   number;
  employee_no:   string;
  full_name:     string;
  status:        "created" | "skipped" | "error";
  detail:        string;
  temp_password: string | null;
}

export interface BulkAccountResponse {
  created: number;
  skipped: number;
  errors:  number;
  results: BulkAccountResult[];
}

export interface DepartmentCreate {
  code: string;
  name: string;
  parent_id?: number | null;
  is_active?: boolean;
}

export interface JobGradeCreate {
  code: string;
  name: string;
  level: number;
  is_active?: boolean;
}

// ─── HRIS Types — Phase H2: Absensi & Cuti ──────────────────────────────────

export type AttendanceSource = "manual" | "mobile" | "fingerprint" | "import";
export type LeaveRequestStatus = "draft" | "submitted" | "approved" | "rejected";

export type WorkLocationType = "home_office" | "site" | "other";

export interface WorkLocation {
  id: number;
  name: string;
  location_type: WorkLocationType;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee?: Pick<Employee, "id" | "employee_no" | "full_name">;
  date: string;                     // YYYY-MM-DD
  clock_in: string | null;          // ISO datetime
  clock_out: string | null;
  hours_regular: number | null;
  hours_overtime_weekday: number | null;
  hours_overtime_weekend: number | null;
  hours_overtime_holiday: number | null;
  source: AttendanceSource;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  location_ok: boolean | null;
  location_distance_m: number | null;
  matched_location_name: string | null;
  matched_location_type: WorkLocationType | null;
  selfie_url: string | null;
  face_verified: boolean;
  face_confidence: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkGroup {
  id: number;
  name: string;
  role: RoleName;
  description: string | null;
  is_active: boolean;
  members: { id: number; employee_no: string; full_name: string }[];
  created_at: string;
  updated_at: string;
}

export interface WorkGroupCreate {
  name: string;
  role: RoleName;
  description?: string | null;
  is_active?: boolean;
}

export interface AttendanceSummaryItem {
  employee_id: number;
  employee_no: string;
  full_name: string;
  department: string | null;
  days_present: number;
  hours_regular: number;
  hours_overtime_weekday: number;
  hours_overtime_weekend: number;
  hours_overtime_holiday: number;
  total_hours: number;
}

export interface ClockInPayload {
  employee_id: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  note?: string;
  selfie?: File;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  max_days_per_year: number | null;
  is_paid: boolean;
  requires_approval: boolean;
  is_active: boolean;
  category: 'annual' | 'sick' | 'maternity' | 'paternity' | 'unpaid' | 'other';
  requires_doctor_cert: boolean;
}

export interface LeaveTypeCreate {
  code: string;
  name: string;
  max_days_per_year?: number | null;
  is_paid?: boolean;
  requires_approval?: boolean;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type: LeaveType;
  year: number;
  accrued: number;
  used: number;
  remaining: number;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee?: Pick<Employee, "id" | "employee_no" | "full_name">;
  leave_type_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  approval_chain: string[] | null;
  approval_step: number | null;
  current_approver_role: string | null;
  approval_history: Record<string, unknown>[] | null;
  submitted_by: number | null;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestCreate {
  employee_id?: number;   // optional: server resolves from current user if omitted
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}

// ─── HRIS Types — Phase H3: Payroll ──────────────────────────────────────────

export type SalaryComponentType = "BASIC" | "ALLOWANCE" | "DEDUCTION" | "BPJS" | "TAX";
export type PayrollStatus = "OPEN" | "LOCKED" | "POSTED";
export type PPh21Method = "NETTO" | "GROSS_UP";

export interface SalaryComponent {
  id: number;
  code: string;
  name: string;
  component_type: SalaryComponentType;
  is_taxable: boolean;
  is_active: boolean;
}

export interface SalaryComponentCreate {
  code: string;
  name: string;
  component_type: SalaryComponentType;
  is_taxable?: boolean;
}

export interface SalaryAssignment {
  id: number;
  employee_id: number;
  component_id: number;
  component: SalaryComponent;
  amount: number;
  effective_from: string;
  effective_to: string | null;
}

export interface SalaryAssignmentCreate {
  employee_id: number;
  component_id: number;
  amount: number;
  effective_from: string;
  effective_to?: string | null;
}

export interface PayrollPeriod {
  id: number;
  year: number;
  month: number;
  status: PayrollStatus;
  locked_at: string | null;
  locked_by: number | null;
  created_at: string;
}

export interface PayrollRun {
  id: number;
  period_id: number;
  employee_id: number;
  employee?: Pick<Employee, "id" | "employee_no" | "full_name" | "department">;
  gross_salary: number;
  bpjs_tk_employee: number;
  bpjs_tk_employer: number;
  bpjs_kes_employee: number;
  bpjs_kes_employer: number;
  pph21_amount: number;
  pph21_method: PPh21Method;
  net_salary: number;
  thr_amount: number | null;
  components_snapshot: Record<string, number> | null;
  cost_centre_id: number | null;
  expense_id: number | null;
  created_at: string;
  updated_at: string;
}

// Structured pay slip JSON (from GET /hris/payroll/runs/{id}/slip)
export interface PayslipSlip {
  period: string;           // "2025-01"
  employee_no: string;
  employee_name: string;
  department: string | null;
  gross_salary: number;
  bpjs_tk_employee: number;
  bpjs_tk_employer: number;
  bpjs_kes_employee: number;
  bpjs_kes_employer: number;
  pph21_amount: number;
  pph21_method: PPh21Method;
  thr_amount: number | null;
  net_salary: number;
  components: Record<string, number>;
}

// ─── HRIS Types — Phase H4: Recruitment ──────────────────────────────────────

export type PostingStatus = "OPEN" | "CLOSED" | "ON_HOLD";
export type ApplicantStage = "RECEIVED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
export type ApplicantSource = "JOBSTREET" | "LINKEDIN" | "REFERRAL" | "WALK_IN" | "OTHER";
export type InterviewResult = "PENDING" | "PASS" | "FAIL" | "HOLD";

export interface JobPosting {
  id: number;
  title: string;
  department_id: number | null;
  grade_id: number | null;
  description: string | null;
  requirements: string | null;
  status: PostingStatus;
  opened_at: string | null;
  closed_at: string | null;
  created_by: number;
  created_at: string;
}

export interface JobPostingCreate {
  title: string;
  department_id?: number | null;
  grade_id?: number | null;
  description?: string;
  requirements?: string;
}

export interface Applicant {
  id: number;
  posting_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: ApplicantSource;
  stage: ApplicantStage;
  cv_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicantCreate {
  posting_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  source?: ApplicantSource;
  note?: string;
}

export interface Interview {
  id: number;
  applicant_id: number;
  scheduled_at: string;
  interviewer_id: number | null;
  result: InterviewResult;
  notes: string | null;
  created_at: string;
}

export interface OnboardingTask {
  id: number;
  applicant_id: number;
  task: string;
  is_completed: boolean;
  completed_at: string | null;
  assigned_to: number | null;
  sort_order: number;
}

// ─── HRIS Self-Service (employee portal) ──────────────────────────────────────

export interface MyProfile {
  id: number;
  employee_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  tipe: string;
  status: string;
  site: string | null;
  join_date: string | null;
  department: { id: number; name: string } | null;
  grade: { id: number; name: string; level: number } | null;
  bank_name: string | null;
  bank_account: string | null;
  photo_url: string | null;
}

export interface MyAttendanceRecord {
  id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_regular: number;
  hours_overtime_weekday: number;
  hours_overtime_weekend: number;
  hours_overtime_holiday: number;
  source: string | null;
  face_verified: boolean;
  face_confidence: number | null;
  selfie_url: string | null;
  latitude: number | null;
  longitude: number | null;
  matched_location_name: string | null;
  matched_location_type: WorkLocationType | null;
  note: string | null;
}

export interface MyAttendanceResponse {
  year: number;
  month: number;
  employee_id: number;
  today: MyAttendanceRecord | null;
  clock_state: "not_clocked_in" | "clocked_in" | "clocked_out";
  summary: { working_days: number; total_hours: number };
  records: MyAttendanceRecord[];
}

export interface MyLeaveBalance {
  leave_type_id: number;
  code: string;
  name: string;
  is_paid: boolean;
  max_days: number | null;
  accrued: number;
  used: number;
  remaining: number;
  year: number;
}

export interface MyLeaveRequest {
  id: number;
  leave_type: { id: number; name: string } | null;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  submitted_at: string | null;
  approval_history: { actor: string; action: string; note?: string; at: string }[];
}

export interface MyPayslipSummary {
  run_id: number;
  year: number;
  month: number;
  period_label: string;
  gross_salary: number;
  net_salary: number;
  bpjs_tk_employee: number;
  bpjs_kes_employee: number;
  pph21_amount: number;
  thr_amount: number | null;
  pdf_url: string | null;
  has_pdf: boolean;
}

export interface MyPayslipDetail extends MyPayslipSummary {
  bpjs_tk_employer: number;
  bpjs_kes_employer: number;
  pph21_method: string | null;
  employee: {
    id: number;
    employee_no: string;
    full_name: string;
    bank_name: string | null;
    bank_account: string | null;
  };
  components: {
    component_id: number;
    component_name: string;
    component_type: string | null;
    amount: number;
  }[];
  pdf_url: string | null;
}

// ─── HRIS Enhancement Pack — Feature 8: Org Chart ────────────────────────────

export interface DepartmentNode {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  headcount: number;
  open_positions: number;
  children: DepartmentNode[];
}

// ─── HRIS Enhancement Pack — Feature 7: Dashboard Stats ──────────────────────

export interface HeadcountTrendItem {
  month: string;   // "2025-01"
  count: number;
}

export interface PkwtAlertItem {
  employee_id: number;
  employee_no: string;
  full_name: string;
  end_date: string;
  days_remaining: number;
}

export interface DeptAttendanceItem {
  dept: string;
  rate_pct: number;
}

export interface HrisDashboardStats {
  total_employees: number;
  active: number;
  probation: number;
  terminated_ytd: number;
  hired_ytd: number;
  headcount_trend: HeadcountTrendItem[];
  pkwt_expiring_30d: number;
  pkwt_expiring_60d: number;
  pkwt_expiring_90d: number;
  pkwt_expiring_list: PkwtAlertItem[];
  leave_liability_days: number;
  attendance_rate_pct: number;
  dept_attendance: DeptAttendanceItem[];
}

// ─── HRIS Enhancement Pack — Feature 1: Holiday Calendar ─────────────────────

export interface HolidayCalendar {
  id: number;
  date: string;          // YYYY-MM-DD
  name: string;
  is_national: boolean;
  year: number;
  created_at: string;
}

export interface HolidayCalendarCreate {
  date: string;
  name: string;
  is_national?: boolean;
}

// ─── HRIS Enhancement Pack — Feature 6a: Overtime Requests ───────────────────

export type OvertimeRequestStatus = "draft" | "submitted" | "approved" | "rejected";

export interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee_name: string | null;
  date: string;           // YYYY-MM-DD
  planned_hours: number;
  reason: string;
  status: OvertimeRequestStatus;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  attendance_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimeRequestCreate {
  date: string;
  planned_hours: number;
  reason: string;
}

// ─── HRIS Enhancement Pack — Feature 6b: Data Change Requests ────────────────

export type DataChangeStatus = "pending" | "approved" | "rejected";

export interface EmployeeDataChangeRequest {
  id: number;
  employee_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string;
  reason: string | null;
  status: DataChangeStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataChangeRequestCreate {
  field_name: string;
  new_value: string;
  reason?: string;
}

// ─── HRIS Enhancement Pack — Feature 6c: Leave Calendar ──────────────────────

export interface LeaveCalendarItem {
  employee_id: number;
  employee_name: string;
  dept: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
}

// ─── HRIS Enhancement Pack — Feature 6d: My Documents ────────────────────────

export interface MyDocumentItem {
  doc_type: string;       // "payslip" | EmpDocType
  name: string;
  date: string;
  file_url: string;
  period_label: string | null;
}
