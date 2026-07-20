import type { RoleName, UserSummary } from "./core";

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
  timezone_name: string;
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
  category?: LeaveType["category"];
  requires_doctor_cert?: boolean;
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
  doctor_cert_url: string | null;
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
  doctor_cert_url?: string;
}

export interface LeaveDurationPreview {
  days: number;
  excluded_holidays: { date: string; name: string }[];
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
  employee_id: number | null;
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

export interface HireResult {
  applicant: Applicant;
  employee_id: number;
  employee_no: string;
  user_id: number | null;
  user_email: string | null;
  temp_password: string | null;
  leave_balances_created: number;
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
  summary: { attendance_days: number; total_hours: number };
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
  status: LeaveRequestStatus;
  doctor_cert_url: string | null;
  current_approver_role: string | null;
  submitted_at: string | null;
  approval_history: {
    actor: string;
    role: string | null;
    action: "submit" | "approve" | "reject" | string;
    note?: string | null;
    at: string | null;
  }[];
}

export interface MyPayslipSummary {
  run_id: number;
  year: number;
  month: number;
  period_label: string;
  gross_salary: number;
  total_earnings: number;
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
  tax_allowance: number;
  employee: {
    id: number;
    employee_no: string;
    full_name: string;
    bank_name: string | null;
    bank_account: string | null;
  };
  components: {
    component_id: number | null;
    component_name: string;
    component_type: string | null;
    is_taxable?: boolean | null;
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
  id: number;
  employee_no: string;
  full_name: string;
  dept: string | null;
  end_date: string;
  days_left: number;
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
  employment_type_counts: Record<string, number>;
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
