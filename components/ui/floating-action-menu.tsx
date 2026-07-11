"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface FloatingActionMenuProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
  estimatedHeight?: number;
  className?: string;
}

export function FloatingActionMenu({
  open,
  anchorRef,
  onClose,
  children,
  widthClass = "w-48",
  className,
}: FloatingActionMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 12;

      setStyle({
        top: rect.bottom + window.scrollY + gap,
        right: Math.max(viewportPadding, window.innerWidth - rect.right),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  if (!open || !mounted || !style) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={style}
        className={cn(
          "absolute z-50 bg-white border border-gray-100 rounded-xl shadow-modal py-1 text-left",
          widthClass,
          className
        )}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
