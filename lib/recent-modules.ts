export interface RecentModuleEntry {
  href: string;
  openedAt: number;
}

const TRACKED_MODULE_PATHS = [
  "/hris/recruitment", "/hris/attendance", "/hris/employees", "/hris/payroll",
  "/hris/leave", "/action-center", "/dashboard", "/inventory", "/projects",
  "/spending", "/revenue", "/reports", "/legal", "/vault", "/hris",
];

function storageKey(userId: number): string {
  return `gpa_recent_modules_${userId}`;
}

function moduleHref(pathname: string): string | null {
  return TRACKED_MODULE_PATHS.find(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  ) ?? null;
}

export function loadRecentModules(userId: number): RecentModuleEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentModuleEntry =>
      typeof entry?.href === "string" && Number.isFinite(entry?.openedAt)
    ).slice(0, 5);
  } catch {
    return [];
  }
}

export function recordRecentModule(pathname: string, userId: number): void {
  if (typeof window === "undefined") return;
  const href = moduleHref(pathname);
  if (!href) return;
  const entries = loadRecentModules(userId).filter((entry) => entry.href !== href);
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify([{ href, openedAt: Date.now() }, ...entries].slice(0, 5)),
  );
}

export function formatRecentTime(openedAt: number): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - openedAt) / 60_000));
  if (elapsedMinutes < 1) return "Baru saja";
  if (elapsedMinutes < 60) return `${elapsedMinutes} mnt lalu`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} jam lalu`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "Kemarin" : `${elapsedDays} hari lalu`;
}
