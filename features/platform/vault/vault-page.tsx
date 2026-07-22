"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ProtectedRoute } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { ApprovalMatrixTab } from "./components/approval-matrix-tab";
import { AuditLogTab } from "./components/audit-log-tab";
import { CostCentresTab } from "./components/cost-centres-tab";
import { CostCodesTab } from "./components/cost-codes-tab";

const TABS = ["Approval Matrix", "Cost Codes", "Cost Centres", "Audit Log"] as const;
type VaultTab = (typeof TABS)[number];

export default function VaultPage() {
  const [tab, setTab] = useState<VaultTab>("Approval Matrix");

  return (
    <ProtectedRoute
      roles={["SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShieldCheck size={36} className="text-gray-300 mb-4" />
          <p className="text-sm font-semibold text-gray-500">Access Restricted</p>
          <p className="text-xs text-gray-400 mt-1">The Vault is only accessible to Super Admins.</p>
        </div>
      }
    >
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
            <ShieldCheck size={17} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vault</h1>
            <p className="text-sm text-gray-400">Super Admin · System configuration</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0",
                tab === t ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Approval Matrix" && <ApprovalMatrixTab />}
        {tab === "Cost Codes"      && <CostCodesTab />}
        {tab === "Cost Centres"    && <CostCentresTab />}
        {tab === "Audit Log"       && <AuditLogTab />}
      </div>
    </ProtectedRoute>
  );
}
