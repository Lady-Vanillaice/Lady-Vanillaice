const CACHE_NAME = "lvi-admin-shell-v2";
const APP_ASSETS = [
  "/admin-manifest.webmanifest",
  "/admin-icon-192.png",
  "/admin-icon-512.png"
];

async function clearBadge() {
  if ("clearAppBadge" in self.navigator) {
    try {
      await self.navigator.clearAppBadge();
    } catch (error) {
      console.warn("LVI Admin app badge could not be cleared", error);
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!APP_ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_APP_BADGE") return;
  event.waitUntil(clearBadge());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title ?? "LVI Admin", {
        body: data.body ?? "Neue Buchungsanfrage",
        icon: "/admin-icon-192.png",
        badge: "/admin-icon-192.png",
        tag: data.tag ?? "new-booking",
        data: { url: data.url ?? "/admin/termine" },
      }),
      "setAppBadge" in self.navigator ? self.navigator.setAppBadge(1) : Promise.resolve(),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/admin/termine", self.location.origin).href;
  event.waitUntil(
    Promise.all([
      clearBadge(),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
        const existing = clients.find((client) => client.url.startsWith(self.location.origin));
        if (existing) {
          await existing.navigate(target);
          return existing.focus();
        }
        return self.clients.openWindow(target);
      }),
    ]),
  );
});
