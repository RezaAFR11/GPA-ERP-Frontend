"use client";
import type { ApprovalEvent } from "@/lib/types";

// ── Label translations ────────────────────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  created:    "Dibuat",
  draft:      "Draft",
  submitted:  "Disubmit",
  verified:   "Diverifikasi",
  approved:   "Disetujui",
  paid:       "Dibayar",
  rejected:   "Ditolak",
  hard_locked:"Dikunci",
};

function translateAction(action: string): string {
  return ACTION_LABEL[action.toLowerCase()] ?? action;
}

// ── Dot colour per action ─────────────────────────────────────────────────────
function dotClass(action: string): string {
  const a = action.toLowerCase();
  if (["approved", "verified", "paid"].includes(a)) return "bg-green-500";
  if (a === "rejected") return "bg-red-500";
  if (a === "submitted") return "bg-blue-500";
  return "bg-gray-400"; // created / draft / hard_locked
}

// ── Timestamp formatter ───────────────────────────────────────────────────────
const ID_MONTHS = [
  "Jan","Feb","Mar","Apr","Mei","Jun",
  "Jul","Agu","Sep","Okt","Nov","Des",
];

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const day   = d.getDate();
  const month = ID_MONTHS[d.getMonth()];
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2, "0");
  const mm    = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} · ${hh}:${mm}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface ApprovalTimelineProps {
  history: ApprovalEvent[];
}

export function ApprovalTimeline({ history }: ApprovalTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-2 px-1 italic">
        Belum ada riwayat persetujuan.
      </p>
    );
  }

  return (
    <ol className="relative pl-5 space-y-4 py-2">
      {/* Vertical connector line */}
      <span
        className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200"
        aria-hidden="true"
      />

      {history.map((event, idx) => (
        <li key={idx} className="relative flex flex-col gap-0.5">
          {/* Dot */}
          <span
            className={[
              "absolute -left-5 top-[3px] w-3 h-3 rounded-full border-2 border-white shrink-0",
              dotClass(event.action),
            ].join(" ")}
          />

          {/* Action + timestamp */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-800">
              {translateAction(event.action)}
            </span>
            {event.role && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                {event.role}
              </span>
            )}
            <span className="text-[10px] text-gray-400 num ml-auto whitespace-nowrap">
              {formatTs(event.timestamp)}
            </span>
          </div>

          {/* Note */}
          {event.note && (
            <p className="text-[11px] text-gray-500 italic leading-snug">
              {event.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
