// Push only: never cache authenticated pages, API responses or files.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* fallback below */ }
  const expired = payload.expires_at && Date.parse(payload.expires_at) <= Date.now();
  event.waitUntil(self.registration.showNotification(expired ? "Attendance reminder" : payload.title || "GPA ERP", {
    body: expired ? "Check your attendance status in the app." : payload.body || "Open GPA ERP to view your attendance.",
    tag: payload.tag || "attendance", data: { url: "/hris/me/attendance" },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL("/hris/me/attendance", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target); return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
