"use client";
import { useState } from "react";
import { enableBrowserPush, disableBrowserPush } from "@/lib/browser-push";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PushReminderButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function change(enable: boolean) {
    setBusy(true); setMessage("");
    try {
      if (enable) await enableBrowserPush(); else await disableBrowserPush();
      setMessage(enable ? "Pengingat pulang aktif di perangkat ini." : "Pengingat perangkat dinonaktifkan.");
    } catch (e) { setMessage(getErrorMessage(e)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><div className="flex flex-wrap gap-2">
    <Button size="sm" disabled={busy} onClick={() => change(true)}>Aktifkan pengingat pulang</Button>
    <Button size="sm" disabled={busy} onClick={() => change(false)}>Nonaktifkan</Button>
  </div><p className="text-xs text-gray-500">iPhone: pasang ke Home Screen dan izinkan notifikasi. Pengingat mengikuti jadwal, dengan koneksi internet dan izin perangkat.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
