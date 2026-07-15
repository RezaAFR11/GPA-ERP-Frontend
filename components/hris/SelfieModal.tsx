"use client";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { AuthenticatedImage } from "@/components/ui/authenticated-image";

interface SelfieModalProps {
  open:            boolean;
  onClose:         () => void;
  selfie_url:      string;
  face_verified:   boolean;
  face_confidence: number | null;
  employee_name:   string;
  date:            string;
}

export function SelfieModal({
  open, onClose,
  selfie_url, face_verified, face_confidence,
  employee_name, date,
}: SelfieModalProps) {
  if (!open) return null;

  const pct = face_confidence != null ? `${(face_confidence * 100).toFixed(0)}%` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{employee_name}</p>
            <p className="text-gray-400 text-xs">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selfie image */}
        <AuthenticatedImage
          src={selfie_url}
          alt={`Selfie ${employee_name}`}
          className="w-full object-cover"
          style={{ maxHeight: 400 }}
        />

        {/* Verification footer */}
        <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
          {face_verified ? (
            <>
              <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
              <span className="text-sm text-teal-700 font-medium">
                Wajah terdeteksi {pct && `· ${pct}`}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <span className="text-sm text-amber-700 font-medium">
                Perlu ditinjau HR
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
