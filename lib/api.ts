import axios from "axios";
import type {
  AccountReceivable, ApprovalRule, ApprovalRuleCreate, AuditLog,
  CostCentre, CostCentreCreate, CostCode, CostCodeCreate, Expense, ExpenseStats,
  InventoryItem, InventoryItemCreate, InventoryTxn, InventoryTxnCreate,
  LegalDocument, LegalDocCreate, MessageResponse,
  MenuPermissionsResponse, Notification, PaginatedResponse, PettyCashReport, Project,
  ProjectDocument, ProjectImportResult, TokenResponse, User, UserCreate,
  // HRIS H1
  BulkAccountResponse,
  Department, DepartmentCreate, Employee, EmployeeCreate, EmployeeDocument,
  JobGrade, JobGradeCreate,
  // HRIS H2
  AttendanceRecord, AttendanceSummaryItem, WorkLocation,
  LeaveType, LeaveTypeCreate, LeaveBalance, LeaveRequest, LeaveRequestCreate,
  // HRIS H3
  SalaryComponent, SalaryComponentCreate, SalaryAssignment, SalaryAssignmentCreate,
  PayrollPeriod, PayrollRun, PayslipSlip,
  // HRIS H4
  JobPosting, JobPostingCreate, Applicant, ApplicantCreate, Interview, OnboardingTask,
  // HRIS Self-service
  MyProfile, MyAttendanceResponse, MyLeaveBalance, MyLeaveRequest,
  MyPayslipSummary, MyPayslipDetail, MyDocumentItem,
  // Work Groups
  WorkGroup, WorkGroupCreate,
  // Enhancement Pack
  DepartmentNode, HrisDashboardStats,
  HolidayCalendar, HolidayCalendarCreate,
  OvertimeRequest, OvertimeRequestCreate,
  EmployeeDataChangeRequest, DataChangeRequestCreate,
  LeaveCalendarItem,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const TOKEN_KEY = "gpa_access_token";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// On 401, redirect to /login — but only if not already there,
// to avoid an infinite reload loop on the initial unauthenticated load.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const res = await api.post<TokenResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, res.data.access_token);
    }
    return res;
  },
  me: () => api.get<User>("/auth/me"),
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
    return api.post<{ detail: string }>("/auth/logout");
  },
  menuPermissions: () => api.get<MenuPermissionsResponse>("/auth/menu-permissions"),
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list:   (params?: { status?: string; archived?: boolean; include_archived?: boolean; search?: string; skip?: number; limit?: number }) =>
    api.get<PaginatedResponse<Project>>("/projects", { params }),
  get:    (id: number)  => api.get<Project>(`/projects/${id}`),
  documents: (id: number) => api.get<ProjectDocument[]>(`/projects/${id}/documents`),
  documentUrl: (projectId: number, docId: number) =>
    `${BASE_URL}/projects/${projectId}/documents/${docId}/file`,
  create: (data: unknown) => api.post<Project>("/projects", data),
  update: (id: number, data: unknown) => api.patch<Project>(`/projects/${id}`, data),
  delete: (id: number)  => api.delete<MessageResponse>(`/projects/${id}`),
  importFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ProjectImportResult>("/projects/import-excel", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Cost Codes ───────────────────────────────────────────────────────────────

export const costCodesApi = {
  list:       (activeOnly = true) =>
    api.get<CostCode[]>("/vault/cost-codes", { params: { active_only: activeOnly } }),
  create:     (data: CostCodeCreate) => api.post<CostCode>("/vault/cost-codes", data),
  update:     (id: number, data: Partial<CostCodeCreate>) =>
    api.patch<CostCode>(`/vault/cost-codes/${id}`, data),
  deactivate: (id: number) => api.delete<MessageResponse>(`/vault/cost-codes/${id}`),
};

export const costCentresApi = {
  list:       (activeOnly = true) =>
    api.get<CostCentre[]>("/vault/cost-centres", { params: { active_only: activeOnly } }),
  create:     (data: CostCentreCreate) => api.post<CostCentre>("/vault/cost-centres", data),
  update:     (id: number, data: Partial<CostCentreCreate>) =>
    api.patch<CostCentre>(`/vault/cost-centres/${id}`, data),
  deactivate: (id: number) => api.delete<MessageResponse>(`/vault/cost-centres/${id}`),
};

// ─── Receivables ──────────────────────────────────────────────────────────────

export const receivablesApi = {
  list:    (params?: { project_id?: number; ar_status?: string; search?: string; payment_state?: string; skip?: number; limit?: number }) =>
    api.get<PaginatedResponse<AccountReceivable>>("/receivables", { params }),
  create:  (data: unknown)  => api.post<AccountReceivable>("/receivables", data),
  update:  (id: number, data: unknown) => api.patch<AccountReceivable>(`/receivables/${id}`, data),
  confirm: (id: number)     => api.post<AccountReceivable>(`/receivables/${id}/confirm`),
  delete:  (id: number)     => api.delete<MessageResponse>(`/receivables/${id}`),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expensesApi = {
  list: (params?: {
    project_id?: number; status?: string; my_queue?: boolean; search?: string;
    skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<Expense>>("/expenses", { params }),
  stats: (params?: { project_id?: number; date_from?: string; date_to?: string }) =>
    api.get<ExpenseStats>("/expenses/stats", { params }),
  get:     (id: number)         => api.get<Expense>(`/expenses/${id}`),
  create:  (data: {
    expense_type?: "regular" | "reimbursement";
    project_id?: number | null;
    cost_code_id: number;
    cost_centre_id?: number;
    amount: number;
    description: string;
    vendor_name?: string;
    reference_no?: string;
    receipt_url?: string;
  }) => api.post<Expense>("/expenses", data),
  update:  (id: number, data: unknown) => api.patch<Expense>(`/expenses/${id}`, data),
  submit:  (id: number, note?: string) => api.post<Expense>(`/expenses/${id}/submit`, { note }),
  verify:  (id: number, note?: string) => api.post<Expense>(`/expenses/${id}/verify`, { note }),
  approve: (id: number, note?: string) => api.post<Expense>(`/expenses/${id}/approve`, { note }),
  pay:     (id: number, note?: string) => api.post<Expense>(`/expenses/${id}/pay`, { note }),
  lock:    (id: number)                => api.post<Expense>(`/expenses/${id}/lock`),
  reject:  (id: number, reason: string) =>
    api.post<Expense>(`/expenses/${id}/reject`, { reason }),
  audit:   (id: number)         => api.get<AuditLog[]>(`/expenses/${id}/audit`),
  uploadReceipt: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ url: string; filename: string }>("/expenses/upload-receipt", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const pettyCashReportsApi = {
  list: (params?: {
    project_id?: number; month?: string; status?: string;
    skip?: number; limit?: number;
  }) => api.get<PettyCashReport[]>("/petty-cash-reports", { params }),
  get:    (id: number)    => api.get<PettyCashReport>(`/petty-cash-reports/${id}`),
  create: (data: unknown) => api.post<PettyCashReport>("/petty-cash-reports", data),
  update: (id: number, data: unknown) => api.patch<PettyCashReport>(`/petty-cash-reports/${id}`, data),
  post:   (id: number)    => api.post<PettyCashReport>(`/petty-cash-reports/${id}/post`),
  export: (params?: { report_id?: number; date_from?: string; date_to?: string }) =>
    api.get<Blob>("/petty-cash-reports/export", { params, responseType: "blob" }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  payrollSummary: (year: number, month: number) =>
    api.get<Blob>("/reports/payroll-summary", { params: { year, month }, responseType: "blob" }),
  projectFinancial: (year?: number, status?: string) =>
    api.get<Blob>("/reports/project-financial", { params: { year, status }, responseType: "blob" }),
  pettyCashExport: (params?: { report_id?: number; date_from?: string; date_to?: string }) =>
    api.get<Blob>("/petty-cash-reports/export", { params, responseType: "blob" }),
};

// ─── Vault ────────────────────────────────────────────────────────────────────

export const vaultApi = {
  listRules:     () => api.get<ApprovalRule[]>("/vault/approval-rules"),
  createRule:    (data: ApprovalRuleCreate) => api.post<ApprovalRule>("/vault/approval-rules", data),
  updateRule:    (id: number, data: Partial<ApprovalRuleCreate>) =>
    api.patch<ApprovalRule>(`/vault/approval-rules/${id}`, data),
  deactivateRule:(id: number) =>
    api.delete<MessageResponse>(`/vault/approval-rules/${id}`),
  auditLog: (params?: { entity_type?: string; entity_id?: number }) =>
    api.get<AuditLog[]>("/vault/audit-log", { params }),
};

// ─── Legal Documents ──────────────────────────────────────────────────────────

export const legalApi = {
  list:   (params?: { doc_type?: string; status?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<PaginatedResponse<LegalDocument>>("/legal", { params }),
  get:    (id: number) => api.get<LegalDocument>(`/legal/${id}`),
  create: (data: LegalDocCreate) => api.post<LegalDocument>("/legal", data),
  update: (id: number, data: Partial<LegalDocCreate>) =>
    api.patch<LegalDocument>(`/legal/${id}`, data),
  submit: (id: number) => api.post<LegalDocument>(`/legal/${id}/submit`),
  sign:   (id: number) => api.post<LegalDocument>(`/legal/${id}/sign`),
  reject: (id: number, note: string) =>
    api.post<LegalDocument>(`/legal/${id}/reject`, { note }),
  delete: (id: number) => api.delete<MessageResponse>(`/legal/${id}`),
  pdfUrl: (id: number) =>
    `${BASE_URL}/legal/${id}/pdf`,
  mdSignatureStatus: () => api.get<{ exists: boolean; path: string }>("/legal/signature/md"),
  uploadMdSignature: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<MessageResponse>("/legal/signature/md", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Inventory ───────────────────────────────────────────────────────────────

export const inventoryApi = {
  list:   (params?: { category?: string; low_stock?: boolean; q?: string; skip?: number; limit?: number }) =>
    api.get<PaginatedResponse<InventoryItem>>("/inventory", { params }),
  get:    (id: number) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (data: InventoryItemCreate) => api.post<InventoryItem>("/inventory", data),
  update: (id: number, data: Partial<InventoryItemCreate>) =>
    api.patch<InventoryItem>(`/inventory/${id}`, data),
  delete: (id: number) => api.delete<MessageResponse>(`/inventory/${id}`),
  txn:    (id: number, data: InventoryTxnCreate) =>
    api.post<InventoryItem>(`/inventory/${id}/txn`, data),
  txns:   (id: number) => api.get<InventoryTxn[]>(`/inventory/${id}/txns`),
};

// ─── Global Search ────────────────────────────────────────────────────────────

export interface SearchResults {
  projects:    { id: number; code: string; name: string; status: string }[];
  expenses:    { id: number; description: string; amount: number; status: string }[];
  receivables: { id: number; invoice_no: string | null; customer_name: string | null; amount: number; status: string }[];
  legal_docs:  { id: number; doc_number: string | null; title: string; doc_type: string; status: string }[];
  inventory:   { id: number; code: string; name: string; category: string; qty_on_hand: number; unit: string }[];
}

export const searchApi = {
  global: (q: string, limit = 5) =>
    api.get<SearchResults>("/search", { params: { q, limit } }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list:   () => api.get<User[]>("/users"),
  create: (data: UserCreate) => api.post<User>("/users", data),
  roles:  () => api.get<{ id: number; name: string }[]>("/users/roles"),
  updateMe: (data: { full_name: string }) =>
    api.patch<User>("/users/me", data),
  updatePassword: (data: { current_password: string; new_password: string }) =>
    api.patch<{ message: string }>("/users/me/password", data),
  update: (id: number, data: { role_id?: number; is_active?: boolean; full_name?: string }) =>
    api.patch<User>(`/users/${id}`, data),
  resetPassword: (id: number) =>
    api.post<{ message: string; temp_password: string }>(`/users/${id}/reset-password`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list:        () => api.get<Notification[]>("/notifications"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markRead:    (id: number) => api.post<MessageResponse>(`/notifications/${id}/read`),
  markAllRead: () => api.post<MessageResponse>("/notifications/read-all"),
};

// ─── HRIS — Departments ────────────────────────────────────────────────────────

export const hrisDepartmentsApi = {
  list:   (activeOnly = true) =>
    api.get<Department[]>("/hris/departments", { params: { active_only: activeOnly } }),
  tree:   () => api.get<DepartmentNode[]>("/hris/departments/tree"),
  create: (data: DepartmentCreate) => api.post<Department>("/hris/departments", data),
  update: (id: number, data: Partial<DepartmentCreate>) =>
    api.patch<Department>(`/hris/departments/${id}`, data),
};

// ─── HRIS — Job Grades ─────────────────────────────────────────────────────────

export const hrisJobGradesApi = {
  list:   (activeOnly = true) =>
    api.get<JobGrade[]>("/hris/job-grades", { params: { active_only: activeOnly } }),
  create: (data: JobGradeCreate) => api.post<JobGrade>("/hris/job-grades", data),
  update: (id: number, data: Partial<JobGradeCreate>) =>
    api.patch<JobGrade>(`/hris/job-grades/${id}`, data),
};

// ─── HRIS — Employees ─────────────────────────────────────────────────────────

export const hrisEmployeesApi = {
  list: (params?: {
    search?: string; dept_id?: number; tipe?: string; status?: string;
    skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<Employee>>("/hris/employees", { params }),
  get:    (id: number) => api.get<Employee>(`/hris/employees/${id}`),
  create: (data: EmployeeCreate) => api.post<Employee>("/hris/employees", data),
  update: (id: number, data: Partial<EmployeeCreate>) =>
    api.patch<Employee>(`/hris/employees/${id}`, data),
  uploadPhoto: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ url: string }>(`/hris/employees/${id}/photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadDocument: (id: number, docType: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    return api.post<EmployeeDocument>(
      `/hris/employees/${id}/documents?doc_type=${encodeURIComponent(docType)}`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },
  bulkCreateAccounts: (items: { employee_id: number; role_name: string }[]) =>
    api.post<BulkAccountResponse>("/hris/employees/bulk-create-accounts", items),
  createFromUser: (userId: number) =>
    api.post<Employee>(`/hris/employees/from-user/${userId}`),
};

// ─── HRIS H2 — Absensi & Cuti ─────────────────────────────────────────────────

export const hrisAttendanceApi = {
  list: (params?: {
    employee_id?: number; date_from?: string; date_to?: string;
    dept_id?: number; work_group_id?: number;
    skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<AttendanceRecord>>("/hris/attendance", { params }),

  summary: (params: { year: number; month: number; dept_id?: number }) =>
    api.get<AttendanceSummaryItem[]>("/hris/attendance/summary", { params }),

  manualCreate: (data: {
    employee_id: number; date: string;
    clock_in?: string; clock_out?: string;
    is_weekend?: boolean; is_holiday?: boolean; note?: string;
  }) => api.post<AttendanceRecord>("/hris/attendance", data),

  clockIn: (payload: {
    employee_id?: number; latitude?: number; longitude?: number;
    accuracy?: number; note?: string; selfie?: File;
  }) => {
    const fd = new FormData();
    if (payload.employee_id != null) fd.append("employee_id", String(payload.employee_id));
    if (payload.latitude  != null) fd.append("latitude",  String(payload.latitude));
    if (payload.longitude != null) fd.append("longitude", String(payload.longitude));
    if (payload.accuracy  != null) fd.append("accuracy",  String(payload.accuracy));
    if (payload.note)              fd.append("note",      payload.note);
    if (payload.selfie)            fd.append("selfie",    payload.selfie);
    return api.post<AttendanceRecord>("/hris/attendance/clock-in", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  clockOut: (params?: {
    employee_id?: number; is_holiday?: boolean; is_weekend?: boolean; note?: string;
  }) => api.post<AttendanceRecord>("/hris/attendance/clock-out", null, { params }),

  export: (params?: {
    date_from?: string; date_to?: string; dept_id?: number;
    employee_id?: number; fmt?: "xlsx" | "csv";
  }) => api.get("/hris/attendance/export", { params, responseType: "blob" }),

  /** [DEBUG] Delete today's attendance record so clock-in can be re-tested */
  debugResetToday: (employee_id?: number) =>
    api.delete<{ detail: string }>("/hris/attendance/debug-reset", {
      params: employee_id != null ? { employee_id } : undefined,
    }),
};

// ─── HRIS — Work Locations ─────────────────────────────────────────────────────

export const hrisWorkLocationApi = {
  list: (active_only = true) =>
    api.get<WorkLocation[]>("/hris/work-locations", { params: { active_only } }),

  create: (data: {
    name: string; location_type: string;
    latitude: number; longitude: number;
    radius_meters: number; is_active?: boolean;
  }) => api.post<WorkLocation>("/hris/work-locations", data),

  update: (id: number, data: Partial<{
    name: string; location_type: string;
    latitude: number; longitude: number;
    radius_meters: number; is_active: boolean;
  }>) => api.patch<WorkLocation>(`/hris/work-locations/${id}`, data),

  assignToEmployee: (employeeId: number, workLocationId: number | null) =>
    api.patch(`/hris/employees/${employeeId}/work-location`, null, {
      params: { work_location_id: workLocationId },
    }),
};

// ─── HRIS — Work Groups ────────────────────────────────────────────────────────

export const hrisWorkGroupsApi = {
  list: (params?: { role?: string; is_active?: boolean }) =>
    api.get<WorkGroup[]>("/hris/work-groups", { params }),

  create: (data: WorkGroupCreate) =>
    api.post<WorkGroup>("/hris/work-groups", data),

  update: (id: number, data: { name?: string; description?: string | null; is_active?: boolean }) =>
    api.patch<WorkGroup>(`/hris/work-groups/${id}`, data),

  assignEmployee: (employeeId: number, workGroupId: number | null) =>
    api.patch(`/hris/employees/${employeeId}/work-group`, null, {
      params: { work_group_id: workGroupId },
    }),
};

export const hrisLeaveApi = {
  listTypes: () => api.get<LeaveType[]>("/hris/leave-types"),
  createType: (data: LeaveTypeCreate) => api.post<LeaveType>("/hris/leave-types", data),

  getBalances: (employeeId: number) =>
    api.get<LeaveBalance[]>(`/hris/leave-balance/${employeeId}`),

  seedBalances: () => api.post<{ seeded: number }>("/hris/leave-balance/seed"),

  listRequests: (params?: {
    employee_id?: number; status?: string; skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<LeaveRequest>>("/hris/leave-requests", { params }),

  create: (data: LeaveRequestCreate) =>
    api.post<LeaveRequest>("/hris/leave-requests", data),

  approve: (id: number, note?: string) =>
    api.post<LeaveRequest>(`/hris/leave-requests/${id}/approve`, { note }),

  reject: (id: number, note?: string) =>
    api.post<LeaveRequest>(`/hris/leave-requests/${id}/reject`, { note }),
};

// ─── HRIS H3 — Payroll ────────────────────────────────────────────────────────

export const hrisSalaryApi = {
  listComponents: () => api.get<SalaryComponent[]>("/hris/salary-components"),
  createComponent: (data: SalaryComponentCreate) =>
    api.post<SalaryComponent>("/hris/salary-components", data),

  listAssignments: (employee_id?: number) =>
    api.get<SalaryAssignment[]>("/hris/salary-assignments", { params: { employee_id } }),
  createAssignment: (data: SalaryAssignmentCreate) =>
    api.post<SalaryAssignment>("/hris/salary-assignments", data),
  deleteAssignment: (id: number) =>
    api.delete(`/hris/salary-assignments/${id}`),
};

export const hrisPayrollApi = {
  listPeriods: () => api.get<PayrollPeriod[]>("/hris/payroll/periods"),
  createPeriod: (year: number, month: number) =>
    api.post<PayrollPeriod>("/hris/payroll/periods", { year, month }),
  lockPeriod: (id: number) =>
    api.post<PayrollPeriod>(`/hris/payroll/periods/${id}/lock`),
  calculate: (id: number, pph21_method?: string, include_thr?: boolean) =>
    api.post<PayrollRun[]>(`/hris/payroll/periods/${id}/calculate`, null, {
      params: { pph21_method, include_thr },
    }),

  listRuns: (params?: { period_id?: number; employee_id?: number }) =>
    api.get<PayrollRun[]>("/hris/payroll/runs", { params }),
  adjustRun: (id: number, data: Partial<{ gross_salary: number; thr_amount: number; pph21_method: string; cost_centre_id: number }>) =>
    api.patch<PayrollRun>(`/hris/payroll/runs/${id}`, data),
  getSlip: (id: number) =>
    api.get<PayslipSlip>(`/hris/payroll/runs/${id}/slip`),
  downloadSlipPdf: (id: number) =>
    api.get<Blob>(`/hris/payroll/runs/${id}/slip.pdf`, { responseType: "blob" }),
  postPeriod: (id: number) =>
    api.post<PayrollPeriod>(`/hris/payroll/periods/${id}/post`),
  exportBankCsv: (id: number, bank?: string) =>
    api.get<Blob>(`/hris/payroll/periods/${id}/export/bank`, {
      params: { bank },
      responseType: "blob",
    }),
  exportBpjs: (id: number) =>
    api.get<Blob>(`/hris/payroll/periods/${id}/export/bpjs`, { responseType: "blob" }),
  exportForm1721: (employeeId: number, year?: number) =>
    api.get<Blob>(`/hris/payroll/employees/${employeeId}/form-1721`, {
      params: { year },
      responseType: "blob",
    }),
};

// ─── HRIS H4 — Recruitment ────────────────────────────────────────────────────

export const hrisRecruitmentApi = {
  listPostings: (params?: { status?: string; dept_id?: number }) =>
    api.get<JobPosting[]>("/hris/job-postings", { params }),
  createPosting: (data: JobPostingCreate) =>
    api.post<JobPosting>("/hris/job-postings", data),
  updatePosting: (id: number, data: Record<string, unknown>) =>
    api.patch<JobPosting>(`/hris/job-postings/${id}`, data),

  listApplicants: (params?: { posting_id?: number; stage?: string; search?: string }) =>
    api.get<Applicant[]>("/hris/applicants", { params }),
  createApplicant: (data: ApplicantCreate) =>
    api.post<Applicant>("/hris/applicants", data),
  moveStage: (id: number, stage: string) =>
    api.patch<Applicant>(`/hris/applicants/${id}/stage`, null, { params: { stage } }),
  hire: (id: number, data: { department_id?: number; grade_id?: number; join_date?: string; create_user?: boolean }) =>
    api.post<Applicant>(`/hris/applicants/${id}/hire`, data),

  createInterview: (data: { applicant_id: number; scheduled_at: string; interviewer_id?: number; notes?: string }) =>
    api.post<Interview>("/hris/interviews", data),
  updateInterview: (id: number, result: string, notes?: string) =>
    api.patch<Interview>(`/hris/interviews/${id}`, null, { params: { result, notes } }),

  getOnboarding: (applicant_id: number) =>
    api.get<OnboardingTask[]>(`/hris/onboarding/${applicant_id}`),
  completeTask: (id: number, is_completed?: boolean) =>
    api.patch<OnboardingTask>(`/hris/onboarding/tasks/${id}`, null, {
      params: { is_completed: is_completed ?? true },
    }),
};

// ─── HRIS Self-Service — /hris/me/* (worker / employee portal) ───────────────

export const hrisMeApi = {
  getProfile: () =>
    api.get<MyProfile>("/hris/me"),
  getAttendance: (year?: number, month?: number) =>
    api.get<MyAttendanceResponse>("/hris/me/attendance", { params: { year, month } }),
  getLeaveBalance: (year?: number) =>
    api.get<MyLeaveBalance[]>("/hris/me/leave-balance", { params: { year } }),
  getLeaveRequests: (status?: string) =>
    api.get<MyLeaveRequest[]>("/hris/me/leave-requests", { params: { status } }),
  getPayslips: () =>
    api.get<MyPayslipSummary[]>("/hris/me/payslips"),
  getPayslipDetail: (run_id: number) =>
    api.get<MyPayslipDetail>(`/hris/me/payslips/${run_id}`),
  // Feature 6: Enhancement Pack
  getOvertimeRequests: () =>
    api.get<OvertimeRequest[]>("/hris/me/overtime-requests"),
  getDataChangeRequests: () =>
    api.get<EmployeeDataChangeRequest[]>("/hris/me/data-change-requests"),
  submitDataChangeRequest: (data: DataChangeRequestCreate) =>
    api.post<EmployeeDataChangeRequest>("/hris/me/data-change-requests", data),
  getDocuments: () =>
    api.get<MyDocumentItem[]>("/hris/me/documents"),
};

// ─── HRIS Dashboard Stats (Feature 7) ────────────────────────────────────────

export const hrisDashboardApi = {
  getStats: (year?: number, month?: number) =>
    api.get<HrisDashboardStats>("/hris/dashboard/stats", { params: { year, month } }),
};

// ─── HRIS Holiday Calendar (Feature 1) ───────────────────────────────────────

export const hrisHolidayCalendarApi = {
  list: (year?: number) =>
    api.get<HolidayCalendar[]>("/hris/holiday-calendar", { params: { year } }),
  create: (data: HolidayCalendarCreate) =>
    api.post<HolidayCalendar>("/hris/holiday-calendar", data),
  delete: (id: number) =>
    api.delete<MessageResponse>(`/hris/holiday-calendar/${id}`),
};

// ─── HRIS Overtime Requests (Feature 6a) ─────────────────────────────────────

export const hrisOvertimeApi = {
  submit: (data: OvertimeRequestCreate) =>
    api.post<OvertimeRequest>("/hris/overtime-requests", data),
  list: (params?: { status?: string; employee_id?: number; date_from?: string; date_to?: string }) =>
    api.get<OvertimeRequest[]>("/hris/overtime-requests", { params }),
  approve: (id: number, note?: string) =>
    api.post<OvertimeRequest>(`/hris/overtime-requests/${id}/approve`, { note }),
  reject: (id: number, note?: string) =>
    api.post<OvertimeRequest>(`/hris/overtime-requests/${id}/reject`, { note }),
};

// ─── HRIS Data Change Requests (Feature 6b) ──────────────────────────────────

export const hrisDataChangeApi = {
  list: (params?: { status?: string; employee_id?: number }) =>
    api.get<EmployeeDataChangeRequest[]>("/hris/data-change-requests", { params }),
  approve: (id: number, note?: string) =>
    api.post<EmployeeDataChangeRequest>(`/hris/data-change-requests/${id}/approve`, { note }),
  reject: (id: number, note?: string) =>
    api.post<EmployeeDataChangeRequest>(`/hris/data-change-requests/${id}/reject`, { note }),
};

// ─── HRIS Leave Calendar (Feature 6c) ────────────────────────────────────────

export const hrisLeaveCalendarApi = {
  get: (params: { year: number; month: number; dept_id?: number }) =>
    api.get<LeaveCalendarItem[]>("/hris/leave-requests/calendar", { params }),
};
