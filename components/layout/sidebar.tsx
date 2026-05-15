"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, FolderKanban, TrendingUp, CreditCard,
  Package, FileText, BarChart2, ShieldCheck, ChevronDown,
  LogOut, Settings, HeartPulse, Users, Fingerprint, CalendarDays, Banknote, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useRole } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/utils";
import { getBranding } from "@/lib/branding";

interface NavItem {
  href:    string;
  menuKey: string;
  label:   string;
  icon:    React.ElementType;
  badge?:  number;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",      menuKey: "dashboard",       label: "Dashboard",               icon: LayoutDashboard },
  { href: "/action-center",  menuKey: "action_center",   label: "Action Center",           icon: Inbox },
  { href: "/projects",       menuKey: "project_command", label: "Project Command",         icon: FolderKanban },
  { href: "/revenue",        menuKey: "revenue_ar",      label: "Revenue",                 icon: TrendingUp },
  { href: "/spending",       menuKey: "spending",        label: "Spending",                icon: CreditCard },
  { href: "/inventory",      menuKey: "inventory",       label: "Inventory & Assets",      icon: Package },
  { href: "/legal",          menuKey: "legal",           label: "Legal & Proposals",       icon: FileText },
  { href: "/reports",        menuKey: "reports",         label: "Reports",                 icon: BarChart2 },
  { href: "/vault",          menuKey: "vault",           label: "Vault",                   icon: ShieldCheck,    adminOnly: true },
];

const HRIS_ITEMS: NavItem[] = [
  { href: "/hris",              menuKey: "hris_dashboard",   label: "HRIS Dashboard",    icon: HeartPulse  },
  { href: "/hris/employees",    menuKey: "hris_employees",   label: "Data Karyawan",     icon: Users       },
  { href: "/hris/attendance",   menuKey: "hris_attendance",  label: "Absensi & Lembur",  icon: Fingerprint },
  { href: "/hris/leave",        menuKey: "hris_leave",       label: "Cuti & Izin",       icon: CalendarDays},
  { href: "/hris/payroll",      menuKey: "hris_payroll",     label: "Penggajian",        icon: Banknote    },
  { href: "/hris/recruitment",  menuKey: "hris_recruitment", label: "Rekrutmen",         icon: UserPlus    },
];

export function Sidebar() {
  const pathname    = usePathname();
  const { user, logout, canAccessMenu } = useAuth();
  const { isSuperAdmin } = useRole();
  const [branding, setBrandingState] = useState(getBranding);

  useEffect(() => {
    const refresh = () => setBrandingState(getBranding());
    window.addEventListener("gpa_branding_changed", refresh);
    return () => window.removeEventListener("gpa_branding_changed", refresh);
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isSuperAdmin) return false;
    return canAccessMenu(item.menuKey);
  });
  const visibleHrisItems = HRIS_ITEMS.filter((item) => canAccessMenu(item.menuKey));
  const showSettings = canAccessMenu("settings");

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-sidebar flex flex-col z-40 border-r border-sidebar-border">
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm tracking-tight">{branding.logo.slice(0, 3)}</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white font-semibold text-sm tracking-tight">{branding.title}</span>
          <span className="text-sidebar-text text-[9px] tracking-[0.15em] uppercase font-medium">
            {branding.subtitle}
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <p className="px-2 mb-2 text-[9px] font-semibold tracking-[0.15em] uppercase text-sidebar-heading">
          Workspace
        </p>

        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "nav-active text-white"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-accent" : "text-sidebar-text group-hover:text-gray-200"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none",
                    active
                      ? "bg-accent text-gray-900"
                      : "bg-sidebar-active text-gray-300"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* ── HRIS Section ─────────────────────────────────────────────────── */}
        {visibleHrisItems.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-2">
              <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-sidebar-heading">
                HRIS
              </p>
            </div>
            {visibleHrisItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon   = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                    active
                      ? "nav-active text-white"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
                  )}
                >
                  <Icon
                    size={15}
                    className={cn(
                      "shrink-0 transition-colors",
                      active ? "text-[#5eead4]" : "text-sidebar-text group-hover:text-gray-200"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}

        <div className="pt-3 pb-1 px-2">
          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-sidebar-heading">
            Manage
          </p>
        </div>

        {showSettings && (
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all"
          >
            <Settings size={15} className="shrink-0 text-sidebar-text" />
            Settings
          </Link>
        )}
      </nav>

      {/* ── User ─────────────────────────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2) ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
            <p className="text-sidebar-text text-[10px] truncate">
              {user ? ROLE_LABEL[user.role.name] : ""}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1 rounded text-sidebar-text hover:text-red-400 transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
