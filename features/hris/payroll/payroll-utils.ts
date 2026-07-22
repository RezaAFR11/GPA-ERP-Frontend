export const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export function fmtRp(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export const STATUS_STYLE: Record<string, string> = {
  OPEN:   "bg-blue-50 text-blue-700 border-blue-200",
  LOCKED: "bg-amber-50 text-amber-700 border-amber-200",
  POSTED: "bg-teal-50 text-teal-700 border-teal-200",
};

/* ─── Blob download helper ───────────────────────────────────────────────── */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
