"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, CircleHelp, LogOut, Mail, Menu,
  Search, Settings, UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, ROLE_LABEL } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useActionCenterCount } from "@/lib/hooks/use-action-center-count";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { hasSearchAccess } from "@/lib/menu-access";


const PAGE_CRUMBS: Record<string, { label: string; parent?: string }> = {
  "/home": { label: "Home" },
  "/dashboard": { label: "Dashboard" },
  "/action-center": { label: "Action Center" },
  "/projects": { label: "Project Command" },
  "/revenue": { label: "Revenue", parent: "Finance" },
  "/spending": { label: "Spending", parent: "Finance" },
  "/accounts-payable": { label: "Accounts Payable", parent: "Finance" },
  "/accounting-tax": { label: "Accounting & Tax", parent: "Finance" },
  "/budget-bi": { label: "Budget & BI", parent: "Finance" },
  "/reports": { label: "Reports", parent: "Finance" },
  "/project-execution": { label: "Project Execution", parent: "Project & EPC" },
  "/procurement": { label: "Procurement", parent: "Project & EPC" },
  "/engineering-documents": { label: "Engineering Documents", parent: "Project & EPC" },
  "/quality-control": { label: "QA / QC", parent: "Project & EPC" },
  "/hse": { label: "HSE", parent: "Project & EPC" },
  "/inventory": { label: "Inventory & Stock", parent: "Operations" },
  "/warehouse-logistics": { label: "Warehouse & Logistics", parent: "Operations" },
  "/equipment-assets": { label: "Equipment & Assets", parent: "Operations" },
  "/legal": { label: "Legal & Proposals", parent: "Operations" },
  "/contracts": { label: "Contract Management", parent: "Operations" },
  "/crm-tenders": { label: "CRM & Tenders", parent: "Operations" },
  "/vault": { label: "Vault", parent: "Operations" },
  "/settings": { label: "Settings" },
  "/hris/manpower": { label: "Manpower Operations", parent: "HRIS" },
  "/hris": { label: "HRIS" },
};

interface TopbarProps {
  onSearchOpen?: () => void;
  onMenuOpen?: () => void;
}


export function Topbar({ onSearchOpen, onMenuOpen }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, canAccessMenu } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const canSearch = hasSearchAccess(canAccessMenu);
  const actionCount = useActionCenterCount(canAccessMenu("action_center"));

  // Longest prefix wins so /hris/manpower is not labelled as the HRIS root.
  const crumbKey = Object.keys(PAGE_CRUMBS)
    .filter(key => pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  const crumb = crumbKey ? PAGE_CRUMBS[crumbKey] : { label: "GPA ERP" };
  const initials = user?.full_name.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  useEffect(() => {
    if (!profileOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [profileOpen]);

  async function handleLogout() {
    setProfileOpen(false);
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <header
        className={cn(
          "fixed left-0 sm:left-[250px] right-0 top-0 h-14 z-30",
          "flex items-center px-4 sm:px-5 gap-3",
          "bg-[rgba(255,255,255,0.92)] backdrop-blur-[8px]",
          "border-b border-[#E7E5DF]",
        )}
      >
        <button
          onClick={onMenuOpen}
          className="sm:hidden p-2 -ml-1 rounded-lg text-[#5E7186] hover:bg-[#F8FAF9] transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#94A3B8] shrink-0">
          <Link href="/home" className="hover:text-[#5E7186] transition-colors">Home</Link>
          {crumb.parent && (
            <>
              <ChevronRight size={10} className="opacity-50" />
              <span>{crumb.parent}</span>
            </>
          )}
          <ChevronRight size={10} className="opacity-50" />
          <span className="font-semibold text-[#33445A]">{crumb.label}</span>
        </div>

        <span className="sm:hidden text-[13px] font-semibold text-[#0C2138] flex-1 truncate">{crumb.label}</span>

        {canSearch && (
          <div className="flex-1 hidden sm:flex items-center max-w-[360px] lg:ml-3">
            <button
              onClick={onSearchOpen}
              className={cn(
                "relative w-full flex items-center gap-2 pl-8 pr-10 py-[7px]",
                "text-[12px] text-[#94A3B8] bg-[#F8FAF9] border border-[#E7E5DF] rounded-[8px]",
                "hover:bg-white hover:border-[#C4C0B6] transition-all text-left",
              )}
            >
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B0BEC5]" />
              <span className="truncate">Cari menu, data, laporan...</span>
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-[#94A3B8] bg-[#F0EEE9] border border-[#E7E5DF] rounded px-1 py-px font-mono">
                Ctrl K
              </kbd>
            </button>
          </div>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0">
          {canSearch && (
            <button onClick={onSearchOpen} className="sm:hidden topbar-icon" aria-label="Search"><Search size={18} /></button>
          )}

          {canAccessMenu("action_center") && (
            <Link href="/action-center" className="topbar-icon relative" aria-label="Action Center" title="Action Center">
              <Mail size={17} />
              {actionCount > 0 && <TopbarCount value={actionCount} />}
            </Link>
          )}

          <NotificationBell />

          <button onClick={() => setHelpOpen(true)} className="topbar-icon" aria-label="Help" title="Help">
            <CircleHelp size={17} />
          </button>

          <div ref={profileRef} className="relative ml-1">
            <button
              onClick={() => setProfileOpen(value => !value)}
              className="flex items-center gap-2 rounded-lg p-1 sm:pr-2 hover:bg-[#F8FAF9] transition-colors"
              aria-label="Open account menu"
            >
              <span className="w-7 h-7 rounded-full bg-[#D9DEE3] text-[#5E7186] flex items-center justify-center text-[10px] font-bold">{initials}</span>
              <span className="hidden xl:block max-w-[120px] text-[12px] font-semibold text-[#33445A] truncate">{user?.full_name}</span>
              <ChevronDown size={13} className="hidden sm:block text-[#5E7186]" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-[#E7E5DF] rounded-lg shadow-modal overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[#E7E5DF]">
                  <p className="text-[12px] font-semibold text-[#0C2138] truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">{user?.email}</p>
                  {user && <p className="text-[9px] font-bold tracking-[0.08em] uppercase text-[#D97706] mt-1.5">{ROLE_LABEL[user.role.name]}</p>}
                </div>
                <Link href="/settings" onClick={() => setProfileOpen(false)} className="profile-menu-item">
                  <Settings size={14} /> Account Settings
                </Link>
                <button type="button" onClick={handleLogout} className="profile-menu-item text-red-600 hover:bg-red-50">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="GPA ERP Help"
        subtitle="System assistance and support"
        size="sm"
        footer={<Button variant="secondary" onClick={() => setHelpOpen(false)}>Close</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-[#E7E5DF] p-3">
            <UserRound size={17} className="text-[#0A3A63]" />
            <div><p className="text-[12px] font-semibold text-[#0C2138]">System Administrator</p><p className="text-[11px] text-[#5E7186]">Contact your GPA ERP administrator for access or data support.</p></div>
          </div>
          <div className="rounded-lg bg-[#F8FAF9] px-3 py-2.5 text-[11px] text-[#5E7186]">GPA ERP V5.0 · Enterprise Platform</div>
        </div>
      </Modal>
    </>
  );
}


function TopbarCount({ value }: { value: number }) {
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
      {value > 99 ? "99+" : value}
    </span>
  );
}
