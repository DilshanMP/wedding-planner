/* Wedding OS service worker: makes the installed app open and work offline.
 * - Hashed build assets (/_next/static) are cache-first: they never change.
 * - Pages and route data are network-first, falling back to the last copy.
 * Wedding data itself lives in the browser (local mode), so planning keeps
 * working with no connection. API and Supabase requests are never cached. */
const VERSION = "wos-v1";
const SHELL = ["/", "/dashboard", "/tasks", "/guests", "/budget", "/vendors", "/timeline", "/documents", "/reports", "/assistant", "/settings", "/wedding-day", "/simulator", "/onboarding", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts CDN, WhatsApp…
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/rsvp/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreVary: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("/dashboard")) || Response.error();
        return Response.error();
      }),
  );
});
