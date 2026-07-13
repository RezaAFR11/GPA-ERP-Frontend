"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Lock, Users, Shield, Eye, EyeOff,
  Plus, CheckCircle2, XCircle, SlidersHorizontal,
  ChevronRight, Trash2, X, Check, Pencil, Mail, KeyRound, Copy, IdCard,
} from "lucide-react";
import { useAuth, useRole } from "@/lib/auth-context";
import { usersApi, vaultApi, costCodesApi, costCentresApi, legalApi, hrisEmployeesApi } from "@/lib/api";
import { getBranding, setBranding, type Branding } from "@/lib/branding";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CURRENCIES, cn, ROLE_LABEL, getErrorMessage, formatCurrency,
  getStoredCurrency, setStoredCurrency, type CurrencyCode,
} from "@/lib/utils";
import { fmtDate } from "@/lib/utils";
import type {
  ApprovalRule, ApprovalRuleCreate, CostCentreCreate, CostCode, CostCodeCreate,
  CostCodeCategory, RoleName, User as UserType, UserCreate,
} from "@/lib/types";
import axios from "axios";

const TABS = ["Profile", "Security", "Users", "Email"] as const;
type Tab = typeof TABS[number];

const COST_CODE_CATS: CostCodeCategory[] = ["Direct", "Site", "Personnel", "Overhead", "Other"];
const ROLES: RoleName[] = ["SUPER_ADMIN", "MD", "PM", "COST_CONTROL", "FINANCE", "GA", "STAFF", "WORKER"];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in",
      ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {msg}
    </div>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const { isSuperAdmin } = useRole();
  const [name, setName]   = useState(user?.full_name ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(() => getStoredCurrency());
  const [branding, setBrandingState] = useState<Branding>(() => getBranding());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const canManageSignature = isSuperAdmin || user?.role.name === "MD";

  const { data: sigStatus } = useQuery({
    queryKey: ["md-signature-status"],
    queryFn: () => legalApi.mdSignatureStatus().then((r) => r.data),
    enabled: canManageSignature,
  });

  const uploadSignature = useMutation({
    mutationFn: (file: File) => legalApi.uploadMdSignature(file),
    onSuccess: () => showToast("MD signature uploaded", true),
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const updateMe = useMutation({
    mutationFn: (full_name: string) => usersApi.updateMe({ full_name }),
    onSuccess: async () => {
      await refreshUser();
      showToast("Profile updated", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { showToast("Name cannot be empty", false); return; }
    updateMe.mutate(name.trim());
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-lg">
      {toast && <Toast {...toast} />}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Personal information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Email address
            </label>
            <input
              value={user?.email ?? ""}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed. Contact your admin.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Role
            </label>
            <div className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
              <Shield size={13} className="text-primary shrink-0" />
              <span className="text-sm text-gray-700 font-medium">
                {user ? ROLE_LABEL[user.role.name] ?? user.role.name : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" size="sm" disabled={updateMe.isPending}>
            {updateMe.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Currency preference</h2>
        <p className="text-xs text-gray-400 mb-4">Used as the default for dashboards, reports, and new transactions.</p>
        <select
          value={currency}
          onChange={(e) => {
            const next = e.target.value as CurrencyCode;
            setCurrency(next);
            setStoredCurrency(next);
            showToast("Currency updated", true);
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Header branding</h2>
        <p className="text-xs text-gray-400 mb-4">Controls the logo text and sidebar header.</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Logo</label>
            <input
              value={branding.logo}
              onChange={(e) => setBrandingState((b) => ({ ...b, logo: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
            <input
              value={branding.title}
              onChange={(e) => setBrandingState((b) => ({ ...b, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subtitle</label>
            <input
              value={branding.subtitle}
              onChange={(e) => setBrandingState((b) => ({ ...b, subtitle: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => { setBranding(branding); showToast("Header updated", true); }}>
            Save header
          </Button>
        </div>
      </Card>

      {canManageSignature && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">MD signature</h2>
          <p className="text-xs text-gray-400 mb-4">
            Automatically applied to legal proposal PDFs after MD signs.
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-1 rounded-full border",
              sigStatus?.exists
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {sigStatus?.exists ? "Signature saved" : "No signature uploaded"}
            </span>
            <label className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-gray-800">
              Upload signature
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadSignature.mutate(file);
                }}
              />
            </label>
          </div>
        </Card>
      )}
    </form>
  );
}

// ─── Security tab ────────────────────────────────────────────────────────────
function SecurityTab() {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const changePassword = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      usersApi.updatePassword(data),
    onSuccess: () => {
      showToast("Password updated successfully", true);
      setCurrent(""); setNext(""); setConfirm("");
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { showToast("Passwords do not match", false); return; }
    if (next.length < 8)  { showToast("Password must be at least 8 characters", false); return; }
    changePassword.mutate({ current_password: current, new_password: next });
  }

  const strength = next.length === 0 ? null
    : next.length < 8  ? "weak"
    : /[A-Z]/.test(next) && /\d/.test(next) && /[^A-Za-z0-9]/.test(next) ? "strong"
    : "medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {toast && <Toast {...toast} />}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Change password</h2>
        <div className="space-y-4">
          {[
            { label: "Current password", value: current, set: setCurrent },
            { label: "New password",     value: next,    set: setNext },
            { label: "Confirm new",      value: confirm, set: setConfirm },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          ))}

          {/* Strength indicator */}
          {strength && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {["weak","medium","strong"].map((s) => (
                  <div key={s} className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    strength === "weak"   && s === "weak"   ? "bg-red-500"   :
                    strength === "medium" && s !== "strong" ? "bg-amber-400" :
                    strength === "strong"                   ? "bg-green-500" :
                    "bg-gray-200"
                  )} />
                ))}
              </div>
              <p className={cn("text-[11px] font-medium capitalize",
                strength === "weak" ? "text-red-500" : strength === "medium" ? "text-amber-500" : "text-green-600"
              )}>
                {strength} password
              </p>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" size="sm" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Session</h2>
        <p className="text-xs text-gray-400 mb-4">JWT tokens expire after 8 hours. You are automatically signed out.</p>
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <span className="text-xs text-green-700 font-medium">Active session · This device</span>
        </div>
      </Card>
    </form>
  );
}

// ─── User Edit Modal ──────────────────────────────────────────────────────────
interface EditUserModalProps {
  user: UserType;
  roles: { id: number; name: string }[];
  onClose: () => void;
  onSave: (data: { role_id?: number; is_active?: boolean; full_name?: string }) => void;
  isPending: boolean;
}

function EditUserModal({ user, roles, onClose, onSave, isPending }: EditUserModalProps) {
  const [roleId,    setRoleId]    = useState(user.role?.id ?? 0);
  const [isActive,  setIsActive]  = useState(user.is_active);
  const [fullName,  setFullName]  = useState(user.full_name);

  function handleSave() {
    onSave({
      role_id:   roleId   !== user.role?.id      ? roleId   : undefined,
      is_active: isActive !== user.is_active     ? isActive : undefined,
      full_name: fullName !== user.full_name     ? fullName : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Edit User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* User identity */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary text-[11px] font-bold">
              {user.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{user.full_name}</p>
            <p className="text-[11px] text-gray-400 font-mono">{user.email}</p>
          </div>
        </div>

        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Role
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{ROLE_LABEL[r.name as RoleName] ?? r.name}</option>
            ))}
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-gray-700">Account active</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isActive ? "User can sign in" : "User is blocked from signing in"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v: boolean) => !v)}
            className={cn(
              "relative w-10 h-5.5 rounded-full transition-colors shrink-0",
              isActive ? "bg-green-500" : "bg-gray-300"
            )}
            style={{ height: "22px", width: "40px" }}
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
              isActive ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            onClick={handleSave}
            disabled={isPending || !fullName.trim()}
          >
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Users tab (Super Admin only) ─────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [toast,      setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm,   setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [newUser,    setNewUser]  = useState<UserCreate>({
    email: "", password: "", full_name: "", role_id: 3,
  });

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn:  () => usersApi.list().then((r) => r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn:  () => usersApi.roles().then((r) => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/users/${id}`, {
        withCredentials: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User deactivated", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const editUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role_id?: number; is_active?: boolean; full_name?: string } }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User updated", true);
      setEditingUser(null);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const resetPassword = useMutation({
    mutationFn: (id: number) => usersApi.resetPassword(id).then((r) => r.data),
    onSuccess: (data, id) => {
      const u = users.find((x) => x.id === id);
      setResetResult({ name: u?.full_name ?? "User", password: data.temp_password });
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const createEmployee = useMutation({
    mutationFn: (id: number) => hrisEmployeesApi.createFromUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["hris", "employees"] });
      showToast("Data pegawai dibuat & ditautkan", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const createUser = useMutation({
    mutationFn: () => usersApi.create(newUser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User created", true);
      setShowForm(false);
      setNewUser({ email: "", password: "", full_name: "", role_id: 3 });
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  return (
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      {/* Edit modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          isPending={editUser.isPending}
          onSave={(data) => {
            // Only send fields that actually changed
            const payload: { role_id?: number; is_active?: boolean; full_name?: string } = {};
            if (data.role_id   !== undefined) payload.role_id   = data.role_id;
            if (data.is_active !== undefined) payload.is_active = data.is_active;
            if (data.full_name !== undefined) payload.full_name = data.full_name;
            if (Object.keys(payload).length === 0) { setEditingUser(null); return; }
            editUser.mutate({ id: editingUser.id, data: payload });
          }}
        />
      )}

      {/* Temp password result modal */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setResetResult(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-gray-900">Password Reset</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Temporary password for <span className="font-medium text-gray-900">{resetResult.name}</span>.
              They&apos;ll be asked to change it on next login. Share it securely — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 p-2.5 mb-4">
              <code className="flex-1 text-sm font-mono text-gray-900 select-all break-all">{resetResult.password}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(resetResult.password); showToast("Copied", true); }}
                className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setResetResult(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""} total</p>
        <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowForm((v) => !v)}>
          New user
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">New User</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
              <input
                value={newUser.full_name}
                onChange={(e) => setNewUser((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role *</label>
              <select
                value={newUser.role_id}
                onChange={(e) => setNewUser((f) => ({ ...f, role_id: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{ROLE_LABEL[r.name as RoleName] ?? r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              variant="primary" size="sm"
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !newUser.email || !newUser.full_name || !newUser.password}
            >
              {createUser.isPending ? "Creating…" : "Create User"}
            </Button>
          </div>
        </Card>
      )}

      <Card padding={false}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="th">Name</th>
              <th className="th hidden sm:table-cell">Email</th>
              <th className="th hidden md:table-cell">Role</th>
              <th className="th hidden lg:table-cell">Joined</th>
              <th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="td">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary text-[10px] font-bold">
                            {u.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                          {u.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="td hidden sm:table-cell">
                      <span className="text-xs text-gray-500 font-mono">{u.email}</span>
                    </td>
                    <td className="td hidden md:table-cell">
                      <span className="text-xs font-medium text-gray-700">
                        {ROLE_LABEL[u.role?.name] ?? u.role?.name}
                      </span>
                    </td>
                    <td className="td hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{fmtDate(u.created_at)}</span>
                    </td>
                    <td className="td">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        u.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-green-500" : "bg-gray-400")} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900 font-medium transition-colors"
                          title="Edit user"
                        >
                          <Pencil size={11} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Reset password for ${u.full_name}? A new temporary password will be generated.`))
                              resetPassword.mutate(u.id);
                          }}
                          disabled={resetPassword.isPending}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary font-medium transition-colors disabled:opacity-50"
                          title="Reset password"
                        >
                          <KeyRound size={11} />
                          Reset PW
                        </button>
                        {!u.employee_id && (
                          <button
                            onClick={() => {
                              if (confirm(`Create a linked employee (pegawai) record for ${u.full_name}? You can complete the details in Data Karyawan.`))
                                createEmployee.mutate(u.id);
                            }}
                            disabled={createEmployee.isPending}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-600 font-medium transition-colors disabled:opacity-50"
                            title="Create linked employee record"
                          >
                            <IdCard size={11} />
                            Buat Pegawai
                          </button>
                        )}
                        {u.is_active && (
                          <button
                            onClick={() => {
                              if (confirm(`Deactivate ${u.full_name}?`)) deactivate.mutate(u.id);
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            Deactivate
                          </button>
                        )}
                        {!u.is_active && (
                          <button
                            onClick={() => editUser.mutate({ id: u.id, data: { is_active: true } })}
                            className="text-[11px] text-green-600 hover:text-green-800 font-medium transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Config tab (Super Admin only) ───────────────────────────────────────────
function ConfigTab() {
  const qc = useQueryClient();
  const [section,    setSection]  = useState<"cost-codes" | "cost-centres" | "approval-rules">("cost-codes");
  const [toast,      setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [showCCForm, setShowCC]   = useState(false);
  const [showCentreForm, setShowCentreForm] = useState(false);
  const [showARForm, setShowAR]   = useState(false);
  const [editingAR, setEditingAR] = useState<ApprovalRule | null>(null);
  const [ccForm, setCcForm]       = useState<CostCodeCreate>({ code: "", name: "", category: "Direct" });
  const [centreForm, setCentreForm] = useState<CostCentreCreate>({ code: "", name: "", description: "" });
  const [arForm, setArForm]       = useState<ApprovalRuleCreate>({
    min_amount: 0, required_role: "PM", priority: 10,
  });

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const { data: costCodes = [], isLoading: ccLoading } = useQuery({
    queryKey: ["cost-codes", "all"],
    queryFn: () => costCodesApi.list(false).then((r) => r.data),
  });

  const { data: rules = [], isLoading: arLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: () => vaultApi.listRules().then((r) => r.data),
  });

  const { data: costCentres = [], isLoading: centreLoading } = useQuery({
    queryKey: ["cost-centres", "all"],
    queryFn: () => costCentresApi.list(false).then((r) => r.data),
  });

  const createCC = useMutation({
    mutationFn: () => costCodesApi.create(ccForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-codes"] });
      showToast("Cost code created", true);
      setShowCC(false);
      setCcForm({ code: "", name: "", category: "Direct" });
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const deactivateCC = useMutation({
    mutationFn: (id: number) => costCodesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-codes"] });
      showToast("Cost code deactivated", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const createCentre = useMutation({
    mutationFn: () => costCentresApi.create(centreForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-centres"] });
      showToast("Cost centre created", true);
      setShowCentreForm(false);
      setCentreForm({ code: "", name: "", description: "" });
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const deactivateCentre = useMutation({
    mutationFn: (id: number) => costCentresApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-centres"] });
      showToast("Cost centre deactivated", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const createAR = useMutation({
    mutationFn: () => vaultApi.createRule(arForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-rules"] });
      showToast("Approval rule created", true);
      setShowAR(false);
      setArForm({ min_amount: 0, required_role: "PM", priority: 10 });
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const updateAR = useMutation({
    mutationFn: () => vaultApi.updateRule(editingAR!.id, arForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-rules"] });
      showToast("Approval rule updated", true);
      setShowAR(false);
      setEditingAR(null);
      setArForm({ min_amount: 0, required_role: "PM", priority: 10 });
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const deactivateAR = useMutation({
    mutationFn: (id: number) => vaultApi.deactivateRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-rules"] });
      showToast("Rule deactivated", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && <Toast {...toast} />}

      {/* Section switcher */}
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {(["cost-codes", "cost-centres", "approval-rules"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
              section === s
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {s === "cost-codes" ? "Cost Codes" : s === "cost-centres" ? "Cost Centres" : "Approval Matrix"}
          </button>
        ))}
      </div>

      {/* ── Cost Codes ──────────────────────────────────────────────────────── */}
      {section === "cost-codes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {costCodes.length} cost code{costCodes.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" icon={<Plus size={12} />} onClick={() => setShowCC((v) => !v)}>
              Add Code
            </Button>
          </div>

          {showCCForm && (
            <Card className="border-primary/30 bg-primary/2">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">New Cost Code</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Code *</label>
                  <input
                    value={ccForm.code}
                    onChange={(e) => setCcForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="D-001"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category *</label>
                  <select
                    value={ccForm.category}
                    onChange={(e) => setCcForm((f) => ({ ...f, category: e.target.value as CostCodeCategory }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {COST_CODE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input
                    value={ccForm.name}
                    onChange={(e) => setCcForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Material & Equipment"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCC(false)}>Cancel</Button>
                <Button
                  variant="primary" size="sm"
                  onClick={() => createCC.mutate()}
                  disabled={createCC.isPending || !ccForm.code || !ccForm.name}
                >
                  {createCC.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </Card>
          )}

          <Card padding={false}>
            {ccLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="th">Code</th>
                    <th className="th">Name</th>
                    <th className="th hidden sm:table-cell">Category</th>
                    <th className="th hidden md:table-cell">Status</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {costCodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td text-center text-gray-400 py-8 text-xs">
                        No cost codes yet
                      </td>
                    </tr>
                  ) : costCodes.map((cc) => (
                    <tr key={cc.id} className={cn("hover:bg-gray-50/60 transition-colors", !cc.is_active && "opacity-50")}>
                      <td className="td">
                        <span className="font-mono text-xs font-semibold text-gray-600">{cc.code}</span>
                      </td>
                      <td className="td">
                        <span className="text-sm text-gray-900">{cc.name}</span>
                      </td>
                      <td className="td hidden sm:table-cell">
                        <span className="text-xs text-gray-500">{cc.category}</span>
                      </td>
                      <td className="td hidden md:table-cell">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          cc.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          {cc.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="td text-right">
                        {cc.is_active && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Deactivate cost code ${cc.code}?`))
                                deactivateCC.mutate(cc.id);
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {section === "cost-centres" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {costCentres.length} funding pocket{costCentres.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" icon={<Plus size={12} />} onClick={() => setShowCentreForm((v) => !v)}>
              Add Centre
            </Button>
          </div>

          {showCentreForm && (
            <Card className="border-primary/30 bg-primary/2">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">New Cost Centre</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Code *</label>
                  <input
                    value={centreForm.code}
                    onChange={(e) => setCentreForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="CAPEX"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input
                    value={centreForm.name}
                    onChange={(e) => setCentreForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Capital expenditure"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input
                    value={centreForm.description ?? ""}
                    onChange={(e) => setCentreForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Which source of money this centre represents"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCentreForm(false)}>Cancel</Button>
                <Button
                  variant="primary" size="sm"
                  onClick={() => createCentre.mutate()}
                  disabled={createCentre.isPending || !centreForm.code || !centreForm.name}
                >
                  {createCentre.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </Card>
          )}

          <Card padding={false}>
            {centreLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="th">Code</th>
                    <th className="th">Name</th>
                    <th className="th hidden md:table-cell">Description</th>
                    <th className="th hidden sm:table-cell">Status</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {costCentres.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td text-center text-gray-400 py-8 text-xs">
                        No cost centres yet
                      </td>
                    </tr>
                  ) : costCentres.map((centre) => (
                    <tr key={centre.id} className={cn("hover:bg-gray-50/60 transition-colors", !centre.is_active && "opacity-50")}>
                      <td className="td">
                        <span className="font-mono text-xs font-semibold text-gray-600">{centre.code}</span>
                      </td>
                      <td className="td">
                        <span className="text-sm text-gray-900">{centre.name}</span>
                      </td>
                      <td className="td hidden md:table-cell">
                        <span className="text-xs text-gray-500">{centre.description ?? "-"}</span>
                      </td>
                      <td className="td hidden sm:table-cell">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          centre.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          {centre.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="td text-right">
                        {centre.is_active && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Deactivate cost centre ${centre.code}?`))
                                deactivateCentre.mutate(centre.id);
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── Approval Rules ──────────────────────────────────────────────────── */}
      {section === "approval-rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {rules.length} active rule{rules.length !== 1 ? "s" : ""} — applied at expense submit
            </p>
            <Button size="sm" icon={<Plus size={12} />} onClick={() => {
              setEditingAR(null);
              setArForm({ min_amount: 0, required_role: "PM", priority: 10 });
              setShowAR((v) => !v);
            }}>
              Add Rule
            </Button>
          </div>

          {showARForm && (
            <Card className="border-primary/30">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">
                {editingAR ? "Edit Approval Rule" : "New Approval Rule"}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Amount (IDR) *</label>
                  <input
                    type="number"
                    value={arForm.min_amount}
                    onChange={(e) => setArForm((f) => ({ ...f, min_amount: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Amount (leave empty = unlimited)</label>
                  <input
                    type="number"
                    value={arForm.max_amount ?? ""}
                    onChange={(e) => setArForm((f) => ({
                      ...f, max_amount: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                    placeholder="∞"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Required Role *</label>
                  <select
                    value={arForm.required_role}
                    onChange={(e) => setArForm((f) => ({ ...f, required_role: e.target.value as RoleName }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority (lower = first)</label>
                  <input
                    type="number"
                    value={arForm.priority}
                    onChange={(e) => setArForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowAR(false); setEditingAR(null); }}>Cancel</Button>
                <Button
                  variant="primary" size="sm"
                  onClick={() => editingAR ? updateAR.mutate() : createAR.mutate()}
                  disabled={createAR.isPending || updateAR.isPending}
                >
                  {createAR.isPending || updateAR.isPending ? "Saving..." : editingAR ? "Save Rule" : "Create Rule"}
                </Button>
              </div>
            </Card>
          )}

          <Card padding={false}>
            {arLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="th">Amount Range</th>
                    <th className="th hidden sm:table-cell">Category</th>
                    <th className="th">Required Role</th>
                    <th className="th hidden md:table-cell text-right">Priority</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td text-center text-gray-400 py-8 text-xs">
                        No approval rules defined
                      </td>
                    </tr>
                  ) : rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="td">
                        <span className="num text-xs font-semibold text-gray-700">
                          {formatCurrency(rule.min_amount)} —{" "}
                          {rule.max_amount ? formatCurrency(rule.max_amount) : "∞"}
                        </span>
                      </td>
                      <td className="td hidden sm:table-cell">
                        <span className="text-xs text-gray-500">
                          {rule.cost_code_category ?? "All"}
                        </span>
                      </td>
                      <td className="td">
                        <span className="text-xs font-medium text-gray-900">
                          {ROLE_LABEL[rule.required_role] ?? rule.required_role}
                        </span>
                      </td>
                      <td className="td hidden md:table-cell text-right">
                        <span className="num text-xs text-gray-400">{rule.priority}</span>
                      </td>
                      <td className="td text-right">
                        <button
                          onClick={() => {
                            setEditingAR(rule);
                            setArForm({
                              min_amount: rule.min_amount,
                              max_amount: rule.max_amount ?? undefined,
                              cost_code_category: rule.cost_code_category ?? undefined,
                              required_role: rule.required_role,
                              priority: rule.priority,
                            });
                            setShowAR(true);
                          }}
                          className="text-[11px] text-gray-500 hover:text-gray-900 font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Deactivate this rule?"))
                              deactivateAR.mutate(rule.id);
                          }}
                          className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Email tab (Super Admin only) ─────────────────────────────────────────────
function EmailTab() {
  const fields: { label: string; env: string; example: string }[] = [
    { label: "SMTP Host",     env: "SMTP_HOST",     example: "smtp.gmail.com" },
    { label: "SMTP Port",     env: "SMTP_PORT",     example: "587" },
    { label: "SMTP User",     env: "SMTP_USER",     example: "noreply@yourcompany.com" },
    { label: "SMTP Password", env: "SMTP_PASSWORD", example: "••••••••" },
    { label: "From address",  env: "SMTP_FROM",     example: "GPA ERP <noreply@gpa.local>" },
    { label: "Use TLS",       env: "SMTP_USE_TLS",  example: "true" },
  ];

  return (
    <div className="space-y-5 max-w-lg">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={15} className="text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900">Notifikasi Email</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Konfigurasi SMTP dilakukan di file <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">.env</code> pada server.
          Isi <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">SMTP_HOST</code> untuk mengaktifkan
          notifikasi email otomatis. Jika kosong, hanya notifikasi in-app yang dikirim.
        </p>

        <div className="space-y-2">
          {fields.map(({ label, env, example }) => (
            <div key={env} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Contoh: {example}</p>
              </div>
              <code className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded shrink-0">
                {env}
              </code>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-600 text-xs font-bold">!</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800 mb-1">Konfigurasi server-side</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Kredensial SMTP tidak ditampilkan di UI demi keamanan. Edit file{" "}
              <code className="bg-gray-100 px-1 rounded font-mono">.env</code> pada server backend,
              lalu restart aplikasi. Notifikasi email dikirim secara otomatis di background
              tanpa memblokir alur utama aplikasi.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab]      = useState<Tab>("Profile");
  const { isSuperAdmin }   = useRole();

  const visibleTabs = TABS.filter((t) =>
    t !== "Users" && t !== "Email" ? true : isSuperAdmin
  );

  const TAB_ICONS: Record<Tab, React.ReactNode> = {
    Profile:  <User size={14} />,
    Security: <Lock size={14} />,
    Users:    <Users size={14} />,
    Email:    <Mail size={14} />,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account and workspace preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              tab === t
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {TAB_ICONS[t]}
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Profile"  && <ProfileTab />}
      {tab === "Security" && <SecurityTab />}
      {tab === "Users"    && isSuperAdmin && <UsersTab />}
      {tab === "Email"    && isSuperAdmin && <EmailTab />}
    </div>
  );
}
