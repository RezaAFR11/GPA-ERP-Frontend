"use client";

import { useState } from "react";
import { Lock, Mail, User, Users } from "lucide-react";
import { useRole } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { EmailTab } from "./components/email-tab";
import { ProfileTab } from "./components/profile-tab";
import { SecurityTab } from "./components/security-tab";
import { UsersTab } from "./components/users-tab";

const TABS = ["Profile", "Security", "Users", "Email"] as const;
type Tab = typeof TABS[number];

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
