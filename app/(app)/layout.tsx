"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useRole } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import NewExpenseModal from "@/components/spending/new-expense-modal";
import { CommandPalette } from "@/components/command-palette";
import { ForcePasswordChange } from "@/components/auth/force-password-change";
import Link from "next/link";
import {
  LayoutDashboard, Receipt, CheckSquare, Settings,
  Plus, Fingerprint, CalendarDays, Home, Banknote,
} from "lucide-react";
import { recordRecentModule } from "@/lib/recent-modules";

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

const NAV_TABS_DEFAULT = [
  { href: "/dashboard",     menuKey: "dashboard",     icon: LayoutDashboard, label: "Home"     },
  { href: "/spending",      menuKey: "spending",      icon: Receipt,         label: "Spending" },
  { href: "/action-center", menuKey: "action_center", icon: CheckSquare,     label: "Aksi"     },
  { href: "/settings",      menuKey: "settings",      icon: Settings,        label: "Setelan"  },
] as const;

const NAV_TABS_WORKER = [
  { href: "/hris/me",             menuKey: null,                icon: Home,         label: "Beranda"  },
  { href: "/hris/me/attendance",  menuKey: "hris_attendance",  icon: Fingerprint,  label: "Absensi"  },
  { href: "/hris/me/leave",       menuKey: "hris_leave",       icon: CalendarDays, label: "Cuti"     },
  { href: "/hris/me/payslip",     menuKey: "hris_my_payslip",  icon: Banknote,     label: "Slip Gaji"},
] as const;

function BottomNav({
  pathname,
  isSelfService,
  canAccessMenu,
}: {
  pathname: string;
  isSelfService: boolean;
  canAccessMenu: (key: string) => boolean;
}) {
  const hasSelfServiceAccess = ["hris_attendance", "hris_leave", "hris_my_payslip"]
    .some(key => canAccessMenu(key));
  const tabs = (isSelfService ? NAV_TABS_WORKER : NAV_TABS_DEFAULT).filter(tab =>
    tab.menuKey === null ? hasSelfServiceAccess : canAccessMenu(tab.menuKey)
  );
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 sm:hidden flex safe-area-inset-bottom">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] transition-colors min-h-[56px]",
              active ? "text-gray-900 font-semibold" : "text-gray-400",
            ].join(" ")}
          >
            <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
            <span className="leading-none mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Mobile FAB (non-worker only) ──────────────────────────────────────────────
function MobileFAB({ canAccess }: { canAccess: boolean }) {
  const router = useRouter();
  if (!canAccess) return null;
  return (
    <button
      onClick={() => router.push("/spending?new=1")}
      className="fixed bottom-20 right-4 z-40 flex sm:hidden w-14 h-14 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95"
      aria-label="Tambah pengeluaran baru"
    >
      <Plus size={24} />
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, canAccessMenu, firstAllowedPath } = useAuth();
  const { isWorker, isSelfService } = useRole();
  const router   = useRouter();
  const pathname = usePathname();
  const canSearch = ["project_command", "spending", "action_center", "revenue_ar", "legal", "inventory"]
    .some((key) => canAccessMenu(key));

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [expenseOpen,  setExpenseOpen]  = useState(false);
  const [paletteOpen,  setPaletteOpen]  = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (user) recordRecentModule(pathname, user.id);
  }, [pathname, user]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (canSearch) setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSearch]);

  // HRIS admin guard + general menu access guard
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const HRIS_ADMIN_PREFIXES = [
      "/hris/employees", "/hris/attendance", "/hris/leave",
      "/hris/payroll", "/hris/recruitment", "/hris/settings", "/hris",
    ];
    // WORKER and STAFF are self-service only — redirect any admin HRIS path to /hris/me
    if (isSelfService && HRIS_ADMIN_PREFIXES.some(p => pathname.startsWith(p)) && !pathname.startsWith("/hris/me")) {
      router.replace("/hris/me");
      return;
    }

    const key = menuKeyForPath(pathname);
    if (key && !canAccessMenu(key)) {
      router.replace(firstAllowedPath());
    }
  }, [canAccessMenu, firstAllowedPath, isAuthenticated, isLoading, isSelfService, isWorker, pathname, router]);

  // Show spinner while loading auth state, or while redirecting after logout.
  // Both branches return before the shell renders to prevent content flash.
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column — no left margin on mobile, 250px on sm+ */}
      <div className="sm:ml-[250px]">
        <Topbar
          onNewExpense={() => setExpenseOpen(true)}
          onSearchOpen={() => setPaletteOpen(true)}
          onMenuOpen={()  => setSidebarOpen(true)}
        />
        <main className="pt-14 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="p-4 sm:p-6 pb-20 sm:pb-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav
        pathname={pathname}
        isSelfService={isSelfService}
        canAccessMenu={canAccessMenu}
      />

      {/* Mobile FAB — only for full ERP users who have spending access (not self-service) */}
      {!isSelfService && <MobileFAB canAccess={canAccessMenu("spending")} />}

      <NewExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      {canSearch && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
      <ForcePasswordChange />
    </div>
  );
}

function menuKeyForPath(pathname: string): string | null {
  if (pathname === "/home")                  return null; // always accessible, no key needed
  if (pathname.startsWith("/dashboard"))     return "dashboard";
  if (pathname.startsWith("/action-center")) return "action_center";
  if (pathname.startsWith("/projects"))      return "project_command";
  if (pathname.startsWith("/revenue"))       return "revenue_ar";
  if (pathname.startsWith("/spending"))      return "spending";
  if (pathname.startsWith("/inventory"))     return "inventory";
  if (pathname.startsWith("/legal"))         return "legal";
  if (pathname.startsWith("/reports"))       return "reports";
  if (pathname.startsWith("/settings"))      return "settings";
  if (pathname.startsWith("/vault"))         return "vault";
  // HRIS self-service (more specific first)
  if (pathname.startsWith("/hris/me/payslip"))    return "hris_my_payslip";
  if (pathname.startsWith("/hris/me/documents"))  return "hris_my_payslip";
  if (pathname.startsWith("/hris/me/overtime"))   return "hris_attendance";
  if (pathname.startsWith("/hris/me/leave"))      return "hris_leave";
  if (pathname.startsWith("/hris/me/attendance")) return "hris_attendance";
  if (pathname === "/hris/me")                    return null;
  // HRIS admin
  if (pathname.startsWith("/hris/employees"))     return "hris_employees";
  if (pathname.startsWith("/hris/attendance"))    return "hris_attendance";
  if (pathname.startsWith("/hris/leave"))         return "hris_leave";
  if (pathname.startsWith("/hris/payroll"))       return "hris_payroll";
  if (pathname.startsWith("/hris/recruitment"))   return "hris_recruitment";
  if (pathname.startsWith("/hris/settings"))      return "hris_settings";
  if (pathname.startsWith("/hris"))               return "hris_dashboard";
  return null;
}
