"use client";
import { Search, Plus, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/ui/notification-bell";

const PAGE_CRUMBS: Record<string, { label: string; parent?: string }> = {
  "/home":          { label: "Home" },
  "/dashboard":     { label: "Dashboard" },
  "/action-center": { label: "Action Center" },
  "/projects":      { label: "Project Command" },
  "/revenue":       { label: "Revenue",           parent: "Finance"    },
  "/spending":      { label: "Spending",           parent: "Finance"    },
  "/inventory":     { label: "Inventory & Stock",  parent: "Operations" },
  "/legal":         { label: "Legal & Proposals" },
  "/reports":       { label: "Reports" },
  "/vault":         { label: "Vault" },
  "/settings":      { label: "Settings" },
  "/hris":          { label: "HRIS" },
};

interface TopbarProps {
  onNewExpense?:  () => void;
  onSearchOpen?:  () => void;
  onMenuOpen?:    () => void;
}

export function Topbar({ onNewExpense, onSearchOpen, onMenuOpen }: TopbarProps) {
  const pathname = usePathname();
  const { canAccessMenu } = useAuth();
  const canSearch = ["project_command", "spending", "action_center", "revenue_ar", "legal", "inventory"]
    .some((key) => canAccessMenu(key));

  // Build breadcrumb label: find longest matching key
  const crumbKey = Object.keys(PAGE_CRUMBS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  const crumb = crumbKey ? PAGE_CRUMBS[crumbKey] : { label: "GPA ERP" };

  return (
    <header
      className={cn(
        "fixed left-0 sm:left-[250px] right-0 top-0 h-14 z-30",
        "flex items-center px-4 sm:px-5 gap-3",
        // Frosted glass per design spec
        "bg-[rgba(255,255,255,0.92)] backdrop-blur-[8px]",
        "border-b border-[#E7E5DF]",
      )}
    >

      {/* ── Hamburger (mobile only) ──────────────────────────────────────────── */}
      <button
        onClick={onMenuOpen}
        className="sm:hidden p-2 -ml-1 rounded-lg text-[#5E7186] hover:bg-[#F8FAF9] transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Breadcrumb (desktop) ─────────────────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#94A3B8] shrink-0">
        <Link href="/home" className="hover:text-[#5E7186] transition-colors">
          Home
        </Link>
        {crumb.parent && (
          <>
            <ChevronRight size={10} className="opacity-50" />
            <span>{crumb.parent}</span>
          </>
        )}
        <ChevronRight size={10} className="opacity-50" />
        <span className="font-semibold text-[#33445A]">{crumb.label}</span>
      </div>

      {/* ── Page title (mobile) ──────────────────────────────────────────────── */}
      <span className="sm:hidden text-[13px] font-semibold text-[#0C2138] flex-1 truncate">
        {crumb.label}
      </span>

      {/* ── Search trigger ────────────────────────────────────────────────────── */}
      {canSearch && <div className="flex-1 hidden sm:flex items-center max-w-[360px]">
        <button
          onClick={onSearchOpen}
          className={cn(
            "relative w-full flex items-center gap-2 pl-8 pr-10 py-[7px]",
            "text-[12px] text-[#94A3B8]",
            "bg-[#F8FAF9] border border-[#E7E5DF] rounded-[8px]",
            "hover:bg-white hover:border-[#C4C0B6] transition-all text-left",
          )}
        >
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B0BEC5] pointer-events-none" />
          <span>Search expenses, projects, invoices…</span>
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-[#94A3B8] bg-[#F0EEE9] border border-[#E7E5DF] rounded px-1 py-px font-mono">
            ⌘K
          </kbd>
        </button>
      </div>}

      {/* ── Right actions ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Mobile search icon */}
        {canSearch && <button
          onClick={onSearchOpen}
          className="sm:hidden p-2 rounded-lg text-[#5E7186] hover:bg-[#F8FAF9] transition-colors"
          aria-label="Search"
        >
          <Search size={18} />
        </button>}

        {/* Notification bell — bell dot colour changed to gold via CSS var */}
        <NotificationBell />

        {canAccessMenu("spending") && (
          <button
            onClick={onNewExpense}
            className={cn(
              "hidden sm:flex items-center gap-1.5",
              "bg-[#06294A] hover:bg-[#021B33] text-white",
              "text-[12px] font-semibold px-[14px] py-[7px] rounded-[8px]",
              "transition-colors duration-[180ms]",
            )}
          >
            <Plus size={13} />
            New Expense
          </button>
        )}
      </div>
    </header>
  );
}
