"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, FolderKanban, TrendingUp, CreditCard,
  Package, FileText, BarChart2, ShieldCheck,
  LogOut, Settings, HeartPulse, Users, Fingerprint, CalendarDays, Banknote, UserPlus,
  X, SlidersHorizontal, Home, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useRole } from "@/lib/auth-context";
import { useActionCenterCount } from "@/lib/hooks/use-action-center-count";
import { ROLE_LABEL } from "@/lib/utils";
import { getBranding } from "@/lib/branding";

interface NavItem {
  href:       string;
  menuKey:    string;
  label:      string;
  icon:       React.ElementType;
  badge?:     number;
  adminOnly?: boolean;
}

const WORKSPACE_ITEMS: NavItem[] = [
  { href: "/dashboard",     menuKey: "dashboard",       label: "Dashboard",        icon: LayoutDashboard },
  { href: "/action-center", menuKey: "action_center",   label: "Action Center",    icon: Inbox },
  { href: "/projects",      menuKey: "project_command", label: "Project Command",  icon: FolderKanban    },
];

const FINANCE_ITEMS: NavItem[] = [
  { href: "/spending",      menuKey: "spending",        label: "Spending",         icon: CreditCard      },
  { href: "/revenue",       menuKey: "revenue_ar",      label: "Revenue",          icon: TrendingUp      },
  { href: "/reports",       menuKey: "reports",         label: "Reports",          icon: BarChart2       },
];

const OPERATIONS_ITEMS: NavItem[] = [
  { href: "/inventory",     menuKey: "inventory",       label: "Inventory & Assets", icon: Package       },
  { href: "/legal",         menuKey: "legal",           label: "Legal & Proposals",  icon: FileText      },
  { href: "/vault",         menuKey: "vault",           label: "Vault",              icon: ShieldCheck, adminOnly: true },
];

const HRIS_ITEMS: NavItem[] = [
  { href: "/hris",              menuKey: "hris_dashboard",   label: "HRIS Dashboard",   icon: HeartPulse      },
  { href: "/hris/employees",    menuKey: "hris_employees",   label: "Data Karyawan",    icon: Users           },
  { href: "/hris/attendance",   menuKey: "hris_attendance",  label: "Absensi & Lembur", icon: Fingerprint     },
  { href: "/hris/leave",        menuKey: "hris_leave",       label: "Cuti & Izin",      icon: CalendarDays    },
  { href: "/hris/payroll",      menuKey: "hris_payroll",     label: "Penggajian",       icon: Banknote        },
  { href: "/hris/recruitment",  menuKey: "hris_recruitment", label: "Rekrutmen",        icon: UserPlus        },
  { href: "/hris/settings",     menuKey: "hris_settings",    label: "Pengaturan HRIS",  icon: SlidersHorizontal },
];

const SELF_SERVICE_ITEMS: NavItem[] = [
  { href: "/hris/me",             menuKey: "hris_attendance", label: "Beranda",        icon: Home        },
  { href: "/hris/me/attendance",  menuKey: "hris_attendance", label: "Absensi Saya",   icon: Fingerprint },
  { href: "/hris/me/leave",       menuKey: "hris_leave",      label: "Cuti & Izin",    icon: CalendarDays},
  { href: "/hris/me/payslip",     menuKey: "hris_my_payslip", label: "Slip Gaji Saya", icon: Banknote    },
];

interface SidebarProps {
  open:    boolean;
  onClose: () => void;
}

// ── Section header with colored dot ───────────────────────────────────────────
function SbSection({ label, dot }: { label: string; dot: string }) {
  return (
    <div className="flex items-center gap-1.5 px-[9px] mt-4 mb-0.5 first:mt-2">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      <span className="text-[9px] font-bold tracking-[0.16em] uppercase text-[#6B7280]">{label}</span>
    </div>
  );
}

// ── Nav item link ─────────────────────────────────────────────────────────────
function NavLink({ item, active, onClose }: { item: NavItem; active: boolean; onClose: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-[11px] w-full px-[11px] py-2 rounded-[9px] text-[13px] font-medium transition-all duration-[150ms] relative mb-px",
        active
          ? "nav-active text-white"
          : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F3F4F6]"
      )}
    >
      <Icon
        size={15}
        strokeWidth={1.9}
        className={cn("shrink-0 transition-colors", active ? "text-[#F59E0B]" : "")}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className={cn(
          "text-[10px] font-bold font-mono px-[7px] py-0.5 rounded-full min-w-[18px] text-center leading-none",
          active
            ? "bg-[#F59E0B] text-[#111827]"
            : "bg-[#374151] text-[#D1D5DB]"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ── Sidebar content (shared between desktop + mobile drawer) ──────────────────
function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout, canAccessMenu } = useAuth();
  const { isSuperAdmin, isSelfService } = useRole();
  const [branding, setBrandingState] = useState(getBranding);

  useEffect(() => {
    const refresh = () => setBrandingState(getBranding());
    window.addEventListener("gpa_branding_changed", refresh);
    return () => window.removeEventListener("gpa_branding_changed", refresh);
  }, []);

  const isActive = (item: NavItem) =>
    pathname === item.href || pathname.startsWith(item.href + "/");

  const visibleWorkspace  = WORKSPACE_ITEMS.filter(i => canAccessMenu(i.menuKey));
  const visibleFinance    = FINANCE_ITEMS.filter(i => canAccessMenu(i.menuKey));
  const visibleOps        = OPERATIONS_ITEMS.filter(i => {
    if (i.adminOnly && !isSuperAdmin) return false;
    return canAccessMenu(i.menuKey);
  });
  const visibleHris       = isSelfService ? [] : HRIS_ITEMS.filter(i => canAccessMenu(i.menuKey));
  const visibleSelfSvc    = SELF_SERVICE_ITEMS.filter(i => canAccessMenu(i.menuKey));
  const showSelfSvc       = isSelfService || (visibleSelfSvc.length > 0 && visibleHris.length === 0);
  const showSettings      = canAccessMenu("settings");
  const actionCenterCount = useActionCenterCount(canAccessMenu("action_center"));

  const initials = user?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) ?? "?";

  return (
    <>
      {/* ── Brand row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-[18px] border-b border-[#1F2937] shrink-0">
        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#F59E0B] flex items-center justify-center shrink-0">
          <span className="text-[#111827] font-black text-[11px] tracking-tight leading-none font-mono">GPA</span>
        </div>
        <div className="flex flex-col leading-tight flex-1 min-w-0">
          <span className="text-white font-bold text-[14px] tracking-[-0.2px]">GPA ERP</span>
          <span className="text-[#6B7280] text-[8.5px] tracking-[0.18em] uppercase font-semibold mt-0.5 font-mono">
            Enterprise Platform
          </span>
        </div>
        <button
          onClick={onClose}
          className="sm:hidden p-1 rounded-[6px] text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-[10px] py-3">

        {/* Home launchpad — always visible for non-self-service */}
        {!isSelfService && (
          <Link
            href="/home"
            onClick={onClose}
            className={cn(
              "flex items-center gap-[11px] w-full px-[11px] py-2 rounded-[9px] text-[13px] font-medium transition-all duration-[150ms] relative mb-px mt-1",
              pathname === "/home"
                ? "nav-active text-white"
                : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F3F4F6]"
            )}
          >
            <LayoutGrid
              size={15}
              strokeWidth={1.9}
              className={cn("shrink-0", pathname === "/home" ? "text-[#F59E0B]" : "")}
            />
            Home
          </Link>
        )}

        {visibleWorkspace.length > 0 && (
          <>
            <SbSection label="Workspace" dot="#2563EB" />
            {visibleWorkspace.map(item => {
              const navItem = item.menuKey === "action_center" && actionCenterCount > 0
                ? { ...item, badge: actionCenterCount }
                : item;
              return <NavLink key={item.href} item={navItem} active={isActive(item)} onClose={onClose} />;
            })}
          </>
        )}

        {visibleFinance.length > 0 && (
          <>
            <SbSection label="Finance" dot="#D97706" />
            {visibleFinance.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item)} onClose={onClose} />
            ))}
          </>
        )}

        {visibleOps.length > 0 && (
          <>
            <SbSection label="Operations" dot="#0D9488" />
            {visibleOps.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item)} onClose={onClose} />
            ))}
          </>
        )}

        {visibleHris.length > 0 && (
          <>
            <SbSection label="HRIS" dot="#7C3AED" />
            {visibleHris.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item)} onClose={onClose} />
            ))}
          </>
        )}

        {showSelfSvc && (
          <>
            <SbSection label="Portal Saya" dot="#6B7280" />
            {visibleSelfSvc.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item)} onClose={onClose} />
            ))}
          </>
        )}

        {showSettings && (
          <>
            <SbSection label="Manage" dot="#6B7280" />
            <Link
              href="/settings"
              onClick={onClose}
              className={cn(
                "flex items-center gap-[11px] w-full px-[11px] py-2 rounded-[9px] text-[13px] font-medium transition-all duration-[150ms] relative mb-px",
                pathname.startsWith("/settings")
                  ? "nav-active text-white"
                  : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F3F4F6]"
              )}
            >
              <Settings
                size={15}
                strokeWidth={1.9}
                className={cn("shrink-0", pathname.startsWith("/settings") ? "text-[#F59E0B]" : "")}
              />
              Settings
            </Link>
          </>
        )}

      </nav>

      {/* ── User footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-[#1F2937] px-3 py-3 shrink-0">
        <div className="flex items-center gap-[9px]">
          <div className="w-8 h-8 rounded-full bg-[#1E40AF] flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 leading-[1.3]">
            <p className="text-white text-[12.5px] font-medium truncate">{user?.full_name}</p>
            <p className="text-[#6B7280] text-[10px] truncate">
              {user ? ROLE_LABEL[user.role.name] : ""}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-[5px] rounded-[6px] text-[#6B7280] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Exported Sidebar component ─────────────────────────────────────────────────
export function Sidebar({ open, onClose }: SidebarProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Desktop (always visible ≥ 860px) ──────────────────────────────── */}
      <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-[250px] flex-col z-40 bg-[#111827] border-r border-[#1F2937]">
        <SidebarContent onClose={onClose} />
      </aside>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "sm:hidden fixed inset-0 z-40 bg-[rgba(15,23,42,0.55)] transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "sm:hidden fixed left-0 top-0 bottom-0 w-[260px] flex flex-col z-50",
          "bg-[#111827] border-r border-[#1F2937]",
          "transition-transform duration-[250ms] ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}
