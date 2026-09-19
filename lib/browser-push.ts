import { api } from "./api/client";

export async function disableBrowserPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    try {
      await api.post("/browser-push/unsubscribe", { endpoint: subscription.endpoint }, { timeout: 5000 });
    } finally {
      await subscription.unsubscribe();
    }
  }
}

export async function enableBrowserPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Perangkat belum mendukung notifikasi. Pada iPhone, tambahkan aplikasi ke Home Screen lalu buka dari sana.");
  }
  // Ask directly from the button click (required on iOS).
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Izinkan notifikasi melalui pengaturan browser/perangkat.");
  const { data } = await api.get<{ enabled: boolean; public_key: string }>("/browser-push/config");
  if (!data.enabled) throw new Error("Pengingat mobile belum diaktifkan oleh administrator.");
  await navigator.serviceWorker.register("/attendance-sw.js", { scope: "/" });
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const raw = atob(data.public_key.replace(/-/g, "+").replace(/_/g, "/"));
    const key = Uint8Array.from(raw, char => char.charCodeAt(0));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  await api.post("/browser-push/subscriptions", subscription.toJSON());
}
