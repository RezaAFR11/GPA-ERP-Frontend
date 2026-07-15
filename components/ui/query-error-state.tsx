"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { getErrorMessage } from "@/lib/utils";

interface QueryErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function QueryErrorState({ error, onRetry, compact = false }: QueryErrorStateProps) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 text-red-700 ${compact ? "p-3" : "p-4"}`}>
      <AlertCircle size={18} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Data gagal dimuat</p>
        <p className="mt-0.5 break-words text-xs text-red-600">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-red-100"
        >
          <RefreshCw size={13} />
          Coba lagi
        </button>
      )}
    </div>
  );
}
