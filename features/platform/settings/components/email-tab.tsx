"use client";

import { Mail } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmailTab() {
  const fields: { label: string; env: string; example: string }[] = [
    { label: "SMTP Host",     env: "SMTP_HOST",     example: "smtp.gmail.com" },
    { label: "SMTP Port",     env: "SMTP_PORT",     example: "587" },
    { label: "SMTP User",     env: "SMTP_USER",     example: "noreply@yourcompany.com" },
    { label: "SMTP Password", env: "SMTP_PASSWORD", example: "••••••••" },
    { label: "From address",  env: "SMTP_FROM",     example: "GPA ERP <noreply@gpa.local>" },
    { label: "Use TLS",       env: "SMTP_USE_TLS",  example: "true" },
  ];

  return (
    <div className="space-y-5 max-w-lg">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={15} className="text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900">Notifikasi Email</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Konfigurasi SMTP dilakukan di file <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">.env</code> pada server.
          Isi <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">SMTP_HOST</code> untuk mengaktifkan
          notifikasi email otomatis. Jika kosong, hanya notifikasi in-app yang dikirim.
        </p>

        <div className="space-y-2">
          {fields.map(({ label, env, example }) => (
            <div key={env} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Contoh: {example}</p>
              </div>
              <code className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded shrink-0">
                {env}
              </code>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-600 text-xs font-bold">!</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800 mb-1">Konfigurasi server-side</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Kredensial SMTP tidak ditampilkan di UI demi keamanan. Edit file{" "}
              <code className="bg-gray-100 px-1 rounded font-mono">.env</code> pada server backend,
              lalu restart aplikasi. Notifikasi email dikirim secara otomatis di background
              tanpa memblokir alur utama aplikasi.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
