import type {
  MenuPermissionsResponse,
  MessageResponse,
  Notification,
  PasswordChangeResponse,
  TokenResponse,
  User,
  UserCreate,
  UserListSummary,
  WorkspaceBranding,
} from "../types";
import { api } from "./client";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api.post<TokenResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  me: () => api.get<User>("/auth/me"),
  logout: () => api.post<{ detail: string }>("/auth/logout"),
  menuPermissions: () => api.get<MenuPermissionsResponse>("/auth/menu-permissions"),
};

// ─── Global Search ────────────────────────────────────────────────────────────

export interface SearchResults {
  projects:    { id: number; code: string; name: string; status: string }[];
  expenses:    { id: number; description: string; amount: number; status: string }[];
  receivables: { id: number; invoice_no: string | null; customer_name: string | null; amount: number; status: string }[];
  legal_docs:  { id: number; doc_number: string | null; title: string; doc_type: string; status: string }[];
  inventory:   { id: number; code: string; name: string; category: string; qty_on_hand: number; unit: string }[];
  operational_records: { id: number; module: string; reference_no: string; title: string; status: string; path: string }[];
}

export const searchApi = {
  global: (q: string, limit = 5) =>
    api.get<SearchResults>("/search", { params: { q, limit } }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list:   () => api.get<User[]>("/users"),
  summary: () => api.get<UserListSummary>("/users/summary"),
  create: (data: UserCreate) => api.post<User>("/users", data),
  roles:  () => api.get<{ id: number; name: string }[]>("/users/roles"),
  updateMe: (data: { full_name: string }) =>
    api.patch<User>("/users/me", data),
  updatePassword: (data: { current_password: string; new_password: string }) =>
    api.patch<PasswordChangeResponse>("/users/me/password", data),
  update: (id: number, data: { role_id?: number; is_active?: boolean; full_name?: string }) =>
    api.patch<User>(`/users/${id}`, data),
  resetPassword: (id: number) =>
    api.post<{ message: string; temp_password: string }>(`/users/${id}/reset-password`),
  deactivate: (id: number) => api.delete<{ message: string }>(`/users/${id}`),
};

export const settingsApi = {
  branding: () => api.get<WorkspaceBranding>("/settings/branding"),
  updateBranding: (data: WorkspaceBranding) =>
    api.put<WorkspaceBranding>("/settings/branding", data),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list:        () => api.get<Notification[]>("/notifications"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markRead:    (id: number) => api.post<MessageResponse>(`/notifications/${id}/read`),
  markAllRead: () => api.post<MessageResponse>("/notifications/read-all"),
};
