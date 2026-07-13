"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-action-title">
      <div
        className="absolute inset-0 bg-[rgba(15,23,42,0.42)] modal-backdrop animate-fade-in"
        onClick={() => { if (!pending) onCancel(); }}
      />

      <div className="relative w-full max-w-[300px] bg-white rounded-xl shadow-modal animate-slide-up overflow-hidden">
        <div className="relative px-[22px] pt-5 pb-4 border-b border-[#E7E5DF]">
          <h2 id="confirm-action-title" className="w-full text-center text-[16px] font-bold text-[#0C2138]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Close confirmation"
            className="absolute right-[22px] top-5 p-1.5 rounded-lg hover:bg-[#F8FAF9] text-[#94A3B8] hover:text-[#0C2138] transition-colors disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-[22px] py-7 text-center">
          <p className="text-[13px] leading-relaxed text-[#33445A]">{message}</p>
        </div>

        <div className="flex items-center justify-center gap-3 px-[22px] py-5 border-t border-[#E7E5DF] bg-[#F8FAF9]">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
