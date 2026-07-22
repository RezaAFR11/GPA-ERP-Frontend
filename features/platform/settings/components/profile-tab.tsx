"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { useAuth, useRole } from "@/lib/auth-context";
import { legalApi, settingsApi, usersApi } from "@/lib/api";
import { getBranding, setBranding, type Branding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CURRENCIES,
  ROLE_LABEL,
  cn,
  getErrorMessage,
  getStoredCurrency,
  setStoredCurrency,
  type CurrencyCode,
} from "@/lib/utils";
import { Toast } from "./settings-toast";

export function ProfileTab() {
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();
  const { isSuperAdmin } = useRole();
  const [name, setName]   = useState(user?.full_name ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(() => getStoredCurrency());
  const [branding, setBrandingState] = useState<Branding>(() => getBranding());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const canManageSignature = isSuperAdmin || user?.role.name === "MD";

  const { data: sharedBranding } = useQuery({
    queryKey: ["workspace-branding"],
    queryFn: () => settingsApi.branding().then((response) => response.data),
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (!sharedBranding) return;
    setBrandingState(sharedBranding);
    setBranding(sharedBranding);
  }, [sharedBranding]);

  const { data: sigStatus } = useQuery({
    queryKey: ["md-signature-status"],
    queryFn: () => legalApi.mdSignatureStatus().then((r) => r.data),
    enabled: canManageSignature,
  });

  const uploadSignature = useMutation({
    mutationFn: (file: File) => legalApi.uploadMdSignature(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["md-signature-status"] });
      showToast("MD signature uploaded", true);
    },
    onError: (e) => showToast(getErrorMessage(e), false),
  });

  const saveBranding = useMutation({
    mutationFn: () => settingsApi.updateBranding(branding),
    onSuccess: ({ data }) => {
      setBranding(data);
      qc.setQueryData(["workspace-branding"], data);
      showToast("Header updated", true);
    },
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
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Reporting currency</h2>
        <p className="text-xs text-gray-400 mb-4">
          Filters dashboard and report totals and becomes the default for new projects. Existing values are never relabelled or converted.
        </p>
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

      {isSuperAdmin && <Card>
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
          <Button type="button" size="sm" onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending}>
            {saveBranding.isPending ? "Savingâ€¦" : "Save header"}
          </Button>
        </div>
      </Card>}

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
