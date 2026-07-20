import type { UserSummary } from "./core";

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

export interface InventoryItemUpdate {
  name?:       string;
  category?:   ItemCategory;
  unit?:       string;
  min_stock?:  number;
  unit_cost?:  number;
  location?:   string;
  notes?:      string;
  is_active?:  boolean;
}

export interface InventorySummary {
  total_items:     number;
  low_stock_count: number;
  total_value:     number;
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

// --- EPC operational workspaces --------------------------------------------

export type OperationalStatus =
  | "draft" | "submitted" | "in_review" | "approved" | "active"
  | "rejected" | "completed" | "cancelled" | "closed";

export type OperationalPriority = "low" | "normal" | "high" | "critical";

export interface OperationalModule {
  key: string;
  label: string;
  description: string;
  path: string;
  record_types: Record<string, string>;
  statuses: OperationalStatus[];
  can_approve: boolean;
}

export interface OperationalWorkflowEvent {
  action: string;
  from_status: string | null;
  to_status: string;
  user_id: number;
  timestamp: string;
  note: string | null;
}

export interface OperationalRecord {
  id: number;
  module: string;
  record_type: string;
  reference_no: string;
  title: string;
  description: string | null;
  status: OperationalStatus;
  priority: OperationalPriority;
  project_id: number | null;
  partner_name: string | null;
  amount: number;
  currency: string;
  progress: number;
  due_date: string | null;
  owner_id: number | null;
  created_by: number;
  approved_by: number | null;
  approved_at: string | null;
  closed_at: string | null;
  details: Record<string, unknown>;
  workflow_history: OperationalWorkflowEvent[];
  created_at: string;
  updated_at: string;
}

export interface OperationalRecordInput {
  record_type: string;
  reference_no?: string;
  title: string;
  description?: string;
  priority: OperationalPriority;
  project_id?: number | null;
  partner_name?: string;
  amount: number;
  currency: string;
  progress: number;
  due_date?: string | null;
  owner_id?: number | null;
  details?: Record<string, unknown>;
}

export interface OperationalSummary {
  total: number;
  total_amount: number;
  overdue: number;
  due_soon: number;
  average_progress: number;
  by_status: Record<string, number>;
}
