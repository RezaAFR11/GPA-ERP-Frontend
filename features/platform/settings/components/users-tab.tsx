"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, IdCard, KeyRound, Pencil, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { hrisEmployeesApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { sortTableRows, useTableSort } from "@/lib/table-sort";
import type { RoleName, User as UserType, UserCreate } from "@/lib/types";
import { ROLE_LABEL, cn, fmtDate, getErrorMessage } from "@/lib/utils";
import { Toast } from "./settings-toast";

type UserSortKey = "name" | "email" | "role" | "joined" | "status";

interface EditUserModalProps {
  user: UserType;
  roles: { id: number; name: string }[];
  isSelf: boolean;
  onClose: () => void;
  onSave: (data: { role_id?: number; is_active?: boolean; full_name?: string }) => void;
  isPending: boolean;
}

function EditUserModal({ user, roles, isSelf, onClose, onSave, isPending }: EditUserModalProps) {
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
            disabled={isSelf}
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
            disabled={isSelf}
            className={cn(
              "relative w-10 h-5.5 rounded-full transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50",
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
export function UsersTab() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [toast,      setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm,   setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [newUser,    setNewUser]  = useState<UserCreate>({
    email: "", password: "", full_name: "", role_id: 0,
  });
  const userSort = useTableSort<UserSortKey>("name", "asc");

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn:  () => usersApi.list().then((r) => r.data),
  });
  const sortedUsers = sortTableRows(users, userSort.sortKey, userSort.sortDirection, {
    name: (user) => user.full_name,
    email: (user) => user.email,
    role: (user) => user.role?.name,
    joined: (user) => user.created_at,
    status: (user) => user.is_active,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn:  () => usersApi.roles().then((r) => r.data),
  });
  const { data: userSummary } = useQuery({
    queryKey: ["users", "summary"],
    queryFn: () => usersApi.summary().then((r) => r.data),
  });
  const defaultRoleId = roles.find((role) => role.name === "STAFF")?.id ?? roles[0]?.id ?? 0;

  const deactivate = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
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
      setNewUser({ email: "", password: "", full_name: "", role_id: defaultRoleId });
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
          isSelf={editingUser.id === currentUser?.id}
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
        <p className="text-xs text-gray-400">
          Showing {users.length} of {userSummary?.total ?? users.length} users
        </p>
        <Button size="sm" icon={<Plus size={13} />} onClick={() => {
          setNewUser((current) => ({
            ...current,
            role_id: current.role_id || defaultRoleId,
          }));
          setShowForm((value) => !value);
        }}>
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
              disabled={createUser.isPending || !newUser.email || !newUser.full_name || !newUser.password || !newUser.role_id}
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
              <SortableTableHeader label="Name" column="name" sortKey={userSort.sortKey} sortDirection={userSort.sortDirection} onSort={userSort.toggleSort} />
              <SortableTableHeader label="Email" column="email" sortKey={userSort.sortKey} sortDirection={userSort.sortDirection} onSort={userSort.toggleSort} className="hidden sm:table-cell" />
              <SortableTableHeader label="Role" column="role" sortKey={userSort.sortKey} sortDirection={userSort.sortDirection} onSort={userSort.toggleSort} className="hidden md:table-cell" />
              <SortableTableHeader label="Joined" column="joined" sortKey={userSort.sortKey} sortDirection={userSort.sortDirection} onSort={userSort.toggleSort} className="hidden lg:table-cell" />
              <SortableTableHeader label="Status" column="status" sortKey={userSort.sortKey} sortDirection={userSort.sortDirection} onSort={userSort.toggleSort} />
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
              : sortedUsers.map((u) => (
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
                        {u.id !== currentUser?.id && <button
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
                        </button>}
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
                        {u.is_active && u.id !== currentUser?.id && (
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

// ─── Email tab (Super Admin only) ─────────────────────────────────────────────
