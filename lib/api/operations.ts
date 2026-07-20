import type {
  AuditLog,
  InventoryItem,
  InventoryItemCreate,
  InventoryItemUpdate,
  InventorySummary,
  InventoryTxn,
  InventoryTxnCreate,
  LegalDocument,
  LegalDocCreate,
  MessageResponse,
  OperationalModule,
  OperationalRecord,
  OperationalRecordInput,
  OperationalSummary,
  PaginatedResponse,
} from "../types";
import { api, type TableSortParams } from "./client";

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
  downloadPdf: (id: number) =>
    api.get<Blob>(`/legal/${id}/pdf`, { responseType: "blob" }),
  mdSignatureStatus: () => api.get<{ exists: boolean }>("/legal/signature/md"),
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
  list:   (params?: { category?: string; low_stock?: boolean; is_active?: boolean; q?: string; skip?: number; limit?: number } & TableSortParams) =>
    api.get<PaginatedResponse<InventoryItem>>("/inventory", { params }),
  summary: () => api.get<InventorySummary>("/inventory/summary"),
  get:    (id: number) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (data: InventoryItemCreate) => api.post<InventoryItem>("/inventory", data),
  update: (id: number, data: InventoryItemUpdate) =>
    api.patch<InventoryItem>(`/inventory/${id}`, data),
  delete: (id: number) => api.delete<MessageResponse>(`/inventory/${id}`),
  txn:    (id: number, data: InventoryTxnCreate) =>
    api.post<InventoryItem>(`/inventory/${id}/txn`, data),
  txns:   (id: number) => api.get<InventoryTxn[]>(`/inventory/${id}/txns`),
};

// --- EPC operational workspaces --------------------------------------------

export const operationsApi = {
  modules: () => api.get<OperationalModule[]>("/operations/modules"),
  actionQueue: () => api.get<OperationalRecord[]>("/operations/action-queue"),
  list: (
    module: string,
    params?: {
      project_id?: number;
      record_type?: string;
      status?: string;
      search?: string;
      skip?: number;
      limit?: number;
    } & TableSortParams,
  ) => api.get<PaginatedResponse<OperationalRecord>>(`/operations/${module}`, { params }),
  summary: (module: string) =>
    api.get<OperationalSummary>(`/operations/${module}/summary`),
  get: (module: string, id: number) =>
    api.get<OperationalRecord>(`/operations/${module}/${id}`),
  create: (module: string, data: OperationalRecordInput) =>
    api.post<OperationalRecord>(`/operations/${module}`, data),
  update: (module: string, id: number, data: Partial<OperationalRecordInput>) =>
    api.patch<OperationalRecord>(`/operations/${module}/${id}`, data),
  transition: (module: string, id: number, action: string, note?: string) =>
    api.post<OperationalRecord>(`/operations/${module}/${id}/transition`, { action, note }),
  delete: (module: string, id: number) =>
    api.delete<MessageResponse>(`/operations/${module}/${id}`),
  audit: (module: string, id: number) =>
    api.get<AuditLog[]>(`/operations/${module}/${id}/audit`),
};
