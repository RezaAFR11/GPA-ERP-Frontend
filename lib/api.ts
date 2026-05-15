import axios from "axios";
import type {
  AccountReceivable, ApprovalRule, ApprovalRuleCreate, AuditLog,
  CostCentre, CostCentreCreate, CostCode, CostCodeCreate, Expense, ExpenseStats,
  InventoryItem, InventoryItemCreate, InventoryTxn, InventoryTxnCreate,
  LegalDocument, LegalDocCreate, MessageResponse,
  MenuPermissionsResponse, Notification, PaginatedResponse, PettyCashReport, Project,
  ProjectDocument, ProjectImportResult, TokenResponse, User, UserCreate,
  // HRIS H1
  Department, DepartmentCreate, Employee, EmployeeCreate, EmployeeDocument,
  JobGrade, JobGradeCreate,
  // HRIS H2
  AttendanceRecord, AttendanceSummaryItem,
  LeaveType, LeaveTypeCreate, LeaveBalance, LeaveRequest, LeaveRequestCreate,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gpa_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and reload to /login
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("gpa_token");
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api.post<TokenResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  me: () => api.get<User>("/auth/me"),
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
  create:  (data: unknown)      => api.post<Expense>("/expenses", data),
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
  registerFace: (id: number, photo: File) => {
    const fd = new FormData();
    fd.append("photo", photo);
    return api.post<{ message: string }>(`/hris/employees/${id}/face`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── HRIS H2 — Absensi & Cuti ─────────────────────────────────────────────────

export const hrisAttendanceApi = {
  list: (params?: {
    employee_id?: number; date_from?: string; date_to?: string;
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
    employee_id: number; latitude?: number; longitude?: number;
    accuracy?: number; note?: string; selfie?: File;
  }) => {
    const fd = new FormData();
    fd.append("employee_id", String(payload.employee_id));
    if (payload.latitude  != null) fd.append("latitude",  String(payload.latitude));
    if (payload.longitude != null) fd.append("longitude", String(payload.longitude));
    if (payload.accuracy  != null) fd.append("accuracy",  String(payload.accuracy));
    if (payload.note)              fd.append("note",      payload.note);
    if (payload.selfie)            fd.append("selfie",    payload.selfie);
    return api.post<AttendanceRecord>("/hris/attendance/clock-in", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  clockOut: (params: {
    employee_id: number; is_holiday?: boolean; is_weekend?: boolean; note?: string;
  }) => api.post<AttendanceRecord>("/hris/attendance/clock-out", null, { params }),
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
