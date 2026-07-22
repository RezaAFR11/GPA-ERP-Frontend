"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, getErrorMessage } from "@/lib/utils";
import { Toast } from "./settings-toast";

export function SecurityTab() {
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
