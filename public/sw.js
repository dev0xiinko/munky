/*
 * CashflowOS service worker (hand-rolled, no build step).
 * - Precaches the offline shell.
 * - Navigations: network-first, fall back to cache, then /offline.
 * - Same-origin static assets (_next chunks, icons, fonts): stale-while-revalidate.
 * - Cross-origin (Supabase, Google Fonts) is left untouched so sync works online
 *   and fails gracefully offline (the app is local-first either way).
 *
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 */
const CACHE_VERSION = "cashflowos-v1";
const OFFLINE_URL = "/offline";
const CORE = ["/", "/offline", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(CORE.map((u) => new Request(u, { cache: "reload" }))).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  // Navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, net.clone());
          return net;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match(req)) ||
            (await cache.match("/")) ||
            (await cache.match(OFFLINE_URL)) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/") || /\.(?:js|css|png|svg|ico|json|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })(),
    );
  }
});
