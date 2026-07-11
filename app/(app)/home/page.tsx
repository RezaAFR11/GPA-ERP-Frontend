"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Inbox, FolderKanban,
  CreditCard, TrendingUp, BarChart2,
  Package, FileText, ShieldCheck,
  HeartPulse, Users, Fingerprint, CalendarDays,
  Banknote, UserPlus, Search, ArrowUpRight,
} from "lucide-react";
import { useAuth, useRole } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useActionCenterCount } from "@/lib/hooks/use-action-center-count";

// ── Time-aware Indonesian greeting ────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function getEyebrow(): string {
  const now = new Date();
  const days = ["MINGGU","SENIN","SELASA","RABU","KAMIS","JUMAT","SABTU"];
  const months = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
  return `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ── Module data ────────────────────────────────────────────────────────────────

type Section = "workspace" | "finance" | "operations" | "hris";

interface ModuleItem {
  href:     string;
  menuKey:  string;
  label:    string;
  icon:     React.ElementType;
  color:    string;
  section:  Section;
  badge?:   number;
}

const MODULES: ModuleItem[] = [
  { href: "/dashboard",        menuKey: "dashboard",        label: "Dashboard",          icon: LayoutDashboard, color: "#2563EB", section: "workspace"  },
  { href: "/action-center",    menuKey: "action_center",    label: "Action Center",      icon: Inbox,           color: "#F59E0B", section: "workspace"  },
  { href: "/projects",         menuKey: "project_command",  label: "Project Command",    icon: FolderKanban,    color: "#0D9488", section: "workspace"  },
  { href: "/spending",         menuKey: "spending",         label: "Spending",           icon: CreditCard,      color: "#DC2626", section: "finance"    },
  { href: "/revenue",          menuKey: "revenue_ar",       label: "Revenue",            icon: TrendingUp,      color: "#16A34A", section: "finance"    },
  { href: "/reports",          menuKey: "reports",          label: "Reports",            icon: BarChart2,       color: "#334155", section: "finance"    },
  { href: "/inventory",        menuKey: "inventory",        label: "Inventory & Assets", icon: Package,         color: "#0E7490", section: "operations" },
  { href: "/legal",            menuKey: "legal",            label: "Legal & Proposals",  icon: FileText,        color: "#EA580C", section: "operations" },
  { href: "/vault",            menuKey: "vault",            label: "Vault",              icon: ShieldCheck,     color: "#475569", section: "operations" },
  { href: "/hris",             menuKey: "hris_dashboard",   label: "HRIS Dashboard",     icon: HeartPulse,      color: "#7C3AED", section: "hris"       },
  { href: "/hris/employees",   menuKey: "hris_employees",   label: "Data Karyawan",      icon: Users,           color: "#0D9488", section: "hris"       },
  { href: "/hris/attendance",  menuKey: "hris_attendance",  label: "Absensi & Lembur",   icon: Fingerprint,     color: "#7C3AED", section: "hris"       },
  { href: "/hris/leave",       menuKey: "hris_leave",       label: "Cuti & Izin",        icon: CalendarDays,    color: "#2563EB", section: "hris"       },
  { href: "/hris/payroll",     menuKey: "hris_payroll",     label: "Penggajian",         icon: Banknote,        color: "#EA580C", section: "hris"       },
  { href: "/hris/recruitment", menuKey: "hris_recruitment", label: "Rekrutmen",          icon: UserPlus,        color: "#16A34A", section: "hris"       },
];

const SECTIONS: { key: Section; label: string; sub: string; dot: string }[] = [
  { key: "workspace",  label: "Workspace",  sub: "Operasi harian",      dot: "#2563EB" },
  { key: "finance",    label: "Finance",    sub: "Keuangan & laporan",   dot: "#D97706" },
  { key: "operations", label: "Operations", sub: "Logistik & dokumen",   dot: "#0D9488" },
  { key: "hris",       label: "HRIS",       sub: "Sumber daya manusia",  dot: "#7C3AED" },
];

// ── Recently opened (static sample) ───────────────────────────────────────────
const RECENTS = [
  { href: "/spending",       label: "Spending",        color: "#DC2626", icon: CreditCard,   time: "5 mnt lalu"    },
  { href: "/action-center",  label: "Action Center",   color: "#F59E0B", icon: Inbox,        time: "22 mnt lalu"   },
  { href: "/hris/payroll",   label: "Penggajian",      color: "#EA580C", icon: Banknote,     time: "1 jam lalu"    },
  { href: "/projects",       label: "Project Command", color: "#0D9488", icon: FolderKanban, time: "Kemarin 16:40" },
  { href: "/hris/employees", label: "Data Karyawan",   color: "#0D9488", icon: Users,        time: "Kemarin 11:02" },
];

// ── Single launcher tile (horizontal, Variation A) ────────────────────────────
function ModuleTile({ item, sectionLabel }: { item: ModuleItem; sectionLabel: string }) {
  const Icon = item.icon;
  const tint = item.color + "14"; // 8% opacity
  return (
    <Link
      href={item.href}
      className="group bg-white border border-[#E7E4DB] rounded-[14px] p-[14px_15px] flex items-center gap-3 shadow-[0_1px_3px_rgba(17,24,39,0.05)] hover:-translate-y-[3px] hover:shadow-[0_14px_28px_-16px_rgba(17,24,39,0.3)] hover:border-[#DCD8CC] transition-all duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: tint }}
      >
        <Icon size={22} style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13.5px] font-semibold text-[#111827] leading-snug truncate">{item.label}</p>
          {item.badge !== undefined && (
            <span className="text-[10px] font-bold font-mono bg-[#F59E0B] text-[#111827] px-1.5 py-0.5 rounded-full leading-none shrink-0">{item.badge}</span>
          )}
        </div>
        <p className="text-[9.5px] font-mono tracking-[0.13em] uppercase text-[#A8A498] mt-0.5">
          {sectionLabel}
        </p>
      </div>
      <ArrowUpRight size={15} className="text-[#CFCBC0] shrink-0 group-hover:text-[#9CA3AF] transition-colors" />
    </Link>
  );
}

// ── Recent pill ───────────────────────────────────────────────────────────────
function RecentPill({ item }: { item: typeof RECENTS[0] }) {
  const Icon = item.icon;
  const tint = item.color + "20";
  return (
    <Link
      href={item.href}
      className="flex items-center gap-1.5 bg-white border border-[#E7E4DB] rounded-full pr-4 pl-[7px] py-[6px] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_-4px_rgba(17,24,39,0.15)] transition-all duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0"
    >
      <div
        className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: tint }}
      >
        <Icon size={14} style={{ color: item.color }} />
      </div>
      <span className="text-[12.5px] font-semibold text-[#111827] whitespace-nowrap">{item.label}</span>
      <span className="text-[9.5px] font-mono text-[#A8A498] whitespace-nowrap ml-0.5">{item.time}</span>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, canAccessMenu } = useAuth();
  const { isSelfService } = useRole();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const actionCenterCount = useActionCenterCount(canAccessMenu("action_center"));

  // Self-service users (WORKER/STAFF) should never reach /home
  useEffect(() => {
    if (isSelfService) router.replace("/hris/me");
  }, [isSelfService, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleModules = MODULES
    .filter(m => canAccessMenu(m.menuKey))
    .map(m => m.menuKey === "action_center" && actionCenterCount > 0
      ? { ...m, badge: actionCenterCount }
      : m
    );
  const visibleRecents = RECENTS.filter(r => visibleModules.some(m => m.href === r.href));

  const filtered = search.trim()
    ? visibleModules.filter(m =>
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.section.toLowerCase().includes(search.toLowerCase())
      )
    : visibleModules;

  const sectionMap = Object.fromEntries(SECTIONS.map(s => [s.key, s.label]));

  return (
    <div className="px-8 py-10 max-w-[1280px]">

      {/* ── Greeting ── */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold font-mono tracking-[0.16em] uppercase text-[#A8A498] mb-2">
          {getEyebrow()}
        </p>
        <h1 className="text-[27px] font-bold text-[#111827] leading-[1.2] tracking-[-0.025em]">
          {getGreeting()}, {user?.full_name}
        </h1>
      </div>

      {/* ── Search hero ── */}
      <div className="bg-white border border-[#E7E4DB] rounded-[14px] px-[18px] py-[15px] shadow-[0_1px_3px_rgba(17,24,39,0.05)] flex items-center gap-3 mb-6">
        <Search size={18} className="text-[#9CA3AF] shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari modul, proyek, ekspor, atau karyawan…"
          className="flex-1 bg-transparent text-[15px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
        />
        <span className="text-[9px] font-mono text-[#A8A498] bg-white border border-[#E7E4DB] rounded-[3px] px-1.5 py-0.5 leading-none select-none">⌘K</span>
      </div>

      {/* ── Recently opened ── */}
      {!search && (
        <div className="mb-8">
          <p className="text-[10px] font-semibold font-mono tracking-[0.16em] uppercase text-[#A8A498] mb-3">
            Terakhir dibuka
          </p>
          <div className="flex gap-2 flex-wrap">
            {visibleRecents.map(r => <RecentPill key={r.href} item={r} />)}
          </div>
        </div>
      )}

      {/* ── Launcher ── */}
      <div>
        <div className="flex items-baseline gap-2 mb-5">
          <h2 className="text-[14px] font-bold text-[#111827]">Semua modul</h2>
          <span className="text-[12px] text-[#9CA3AF]">
            Luncurkan ruang kerja apa pun · dikelompokkan menurut fungsi
          </span>
        </div>

        {SECTIONS.map(section => {
          const mods = filtered.filter(m => m.section === section.key);
          if (!mods.length) return null;
          return (
            <div key={section.key} className="mb-7">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: section.dot }} />
                <span className="text-[13px] font-semibold text-[#111827]">{section.label}</span>
                <span className="text-[12px] text-[#9CA3AF]">{section.sub}</span>
                <span className="ml-auto text-[10px] font-mono text-[#A8A498]">{mods.length} modul</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mods.map(item => (
                  <ModuleTile key={item.href} item={item} sectionLabel={sectionMap[item.section]} />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-[13px] text-[#9CA3AF] py-8 text-center">
            Tidak ada modul yang cocok dengan &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
