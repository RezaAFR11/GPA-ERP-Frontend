"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import NewExpenseModal from "@/components/spending/new-expense-modal";
import { CommandPalette } from "@/components/command-palette";
import Link from "next/link";
import {
  LayoutDashboard, Receipt, CheckSquare, Settings, Plus,
} from "lucide-react";

// ── Mobile bottom nav tabs ────────────────────────────────────────────────────
const NAV_TABS = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Home" },
  { href: "/spending",      icon: Receipt,         label: "Spending" },
  { href: "/action-center", icon: CheckSquare,     label: "Aksi" },
  { href: "/settings",      icon: Settings,        label: "Setelan" },
] as const;

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 sm:hidden flex">
      {NAV_TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] transition-colors",
              active ? "text-gray-900 font-semibold" : "text-gray-400",
            ].join(" ")}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Mobile FAB ────────────────────────────────────────────────────────────────
function MobileFAB() {
  const router = useRouter();
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
  const { isAuthenticated, isLoading, canAccessMenu, firstAllowedPath } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [expenseOpen,  setExpenseOpen]  = useState(false);
  const [paletteOpen,  setPaletteOpen]  = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const key = menuKeyForPath(pathname);
    if (key && !canAccessMenu(key)) {
      router.replace(firstAllowedPath());
    }
  }, [canAccessMenu, firstAllowedPath, isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="ml-[220px]">
        <Topbar onNewExpense={() => setExpenseOpen(true)} onSearchOpen={() => setPaletteOpen(true)} />
        <main className="pt-14 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="p-6 pb-16 sm:pb-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav pathname={pathname} />

      {/* Mobile FAB */}
      <MobileFAB />

      <NewExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function menuKeyForPath(pathname: string): string | null {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/action-center")) return "action_center";
  if (pathname.startsWith("/projects")) return "project_command";
  if (pathname.startsWith("/revenue")) return "revenue_ar";
  if (pathname.startsWith("/spending")) return "spending";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/legal")) return "legal";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/vault")) return "vault";
  // HRIS routes — more specific paths first
  if (pathname.startsWith("/hris/employees"))  return "hris_employees";
  if (pathname.startsWith("/hris/attendance")) return "hris_attendance";
  if (pathname.startsWith("/hris/leave"))      return "hris_leave";
  if (pathname.startsWith("/hris/payroll"))    return "hris_payroll";
  if (pathname.startsWith("/hris/recruitment"))return "hris_recruitment";
  if (pathname.startsWith("/hris"))            return "hris_dashboard";
  return null;
}
