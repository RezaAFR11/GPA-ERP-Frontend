import {
  CheckCircle2,
  Clock,
  PenLine,
  XCircle,
} from "lucide-react";
import type { DocStatus, DocType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  proposal:     "Surat Penawaran",
  berita_acara: "Berita Acara",
  surat_jalan:  "Surat Jalan",
  other:        "Surat Lainnya",
};

const STATUS_CONFIG: Record<DocStatus, { label: string; icon: React.ElementType; cls: string }> = {
  draft:     { label: "Draft",     icon: PenLine,      cls: "bg-gray-100 text-gray-600 border-gray-200" },
  submitted: { label: "Menunggu",  icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200" },
  signed:    { label: "Ditandatangani", icon: CheckCircle2, cls: "bg-green-50 text-green-700 border-green-200" },
  rejected:  { label: "Ditolak",   icon: XCircle,      cls: "bg-red-50 text-red-700 border-red-200" },
};

export function StatusBadge({ status }: { status: DocStatus }) {
  const cfg  = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
      cfg.cls
    )}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}
