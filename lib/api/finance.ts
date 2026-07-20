import type {
  AccountReceivable,
  ApprovalRule,
  ApprovalRuleCreate,
  ApprovalRuleUpdate,
  AuditLog,
  CostCentre,
  CostCentreCreate,
  CostCode,
  CostCodeCreate,
  Expense,
  ExpenseStats,
  MessageResponse,
  PaginatedResponse,
  PettyCashReport,
  Project,
  ProjectDocument,
  ProjectImportResult,
  ReceivablesSummary,
} from "../types";
import { api, BASE_URL, type TableSortParams } from "./client";

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list:   (params?: { status?: string; archived?: boolean; include_archived?: boolean; search?: string; skip?: number; limit?: number } & TableSortParams) =>
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
  list:    (params?: { project_id?: number; ar_status?: string; search?: string; payment_state?: string; skip?: number; limit?: number } & TableSortParams) =>
    api.get<PaginatedResponse<AccountReceivable>>("/receivables", { params }),
  summary: (params?: { project_id?: number; ar_status?: string; search?: string; payment_state?: string }) =>
    api.get<ReceivablesSummary>("/receivables/summary", { params }),
  create:  (data: unknown)  => api.post<AccountReceivable>("/receivables", data),
  update:  (id: number, data: unknown) => api.patch<AccountReceivable>(`/receivables/${id}`, data),
  confirm: (id: number)     => api.post<AccountReceivable>(`/receivables/${id}/confirm`, {}),
  delete:  (id: number)     => api.delete<MessageResponse>(`/receivables/${id}`),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expensesApi = {
  list: (params?: {
    project_id?: number; status?: string; my_queue?: boolean; search?: string;
    currency?: string; skip?: number; limit?: number;
  }) => api.get<PaginatedResponse<Expense>>("/expenses", { params }),
  stats: (params?: { project_id?: number; date_from?: string; date_to?: string }) =>
    api.get<ExpenseStats>("/expenses/stats", { params }),
  actionQueue: () => api.get<Expense[]>("/expenses/action-queue"),
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
  delete:  (id: number)         => api.delete<MessageResponse>(`/expenses/${id}`),
  audit:   (id: number)         => api.get<AuditLog[]>(`/expenses/${id}/audit`),
  uploadReceipt: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ url: string; filename: string }>("/expenses/upload-receipt", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  export: (params?: {
    project_id?: number; status?: string; date_from?: string; date_to?: string; currency?: string;
  }) => api.get<Blob>("/expenses/export", { params, responseType: "blob" }),
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
  dashboardTrend: (currency: string) => api.get<{
    months: { month: string; spent: number; revenue: number }[];
    pending_expenses: number;
  }>("/reports/dashboard-trend", { params: { currency } }),
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
  updateRule:    (id: number, data: ApprovalRuleUpdate) =>
    api.patch<ApprovalRule>(`/vault/approval-rules/${id}`, data),
  deactivateRule:(id: number) =>
    api.delete<MessageResponse>(`/vault/approval-rules/${id}`),
  auditLog: (params?: { entity_type?: string; entity_id?: number; changed_by?: number; skip?: number; limit?: number } & TableSortParams) =>
    api.get<PaginatedResponse<AuditLog>>("/vault/audit-log", { params }),
  auditEntityTypes: () => api.get<string[]>("/vault/audit-log/entity-types"),
};
