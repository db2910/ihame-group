// Phase 7 PWA offline hardening. Deliberately narrow in scope: the POS
// (/sale) is the one screen actually spec'd to survive an outage, so this
// only makes that screen's shell available offline — it is not a general
// app-wide offline cache. The sale-completion logic itself doesn't depend
// on this file at all (src/lib/offline/ is pure IndexedDB + fetch); what
// this adds on top is specifically surviving a reload/relaunch *during* an
// outage, which needs the browser to have something cached to serve before
// any of that JS can even run.
//
// Hand-rolled rather than a precache-manifest tool (Serwist etc, which
// Next's own docs point to for exhaustive precaching) — this caches
// opportunistically, whatever was actually fetched while online, not a
// build-time list of every asset. Bump CACHE_NAME if this file's caching
// logic changes, so `activate` clears out the previous version's entries.
const CACHE_NAME = "ihame-pos-shell-v1";
const RUNTIME_CACHEABLE_PATHS = ["/sale"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Next's own build output is content-hashed per file — safe to serve from
  // cache indefinitely without ever re-checking the network.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // A hard navigation to /sale (reload, relaunch, typed URL) — not a
  // client-side route change, which Next's own router handles as an RSC
  // fetch, not `mode: "navigate"`, and isn't touched here. Network-first: an
  // online cashier always gets the live catalogue/stock. Only once the
  // network genuinely fails does this fall back to whatever the last
  // successful load looked like, so the app has *something* to boot from —
  // stale catalogue/stock beats a blank error screen mid-outage, and the
  // page's own JS (src/lib/offline/) picks up from there against the
  // durable IndexedDB queue regardless of what the catalogue shows.
  if (request.mode === "navigate" && RUNTIME_CACHEABLE_PATHS.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    );
  }
});
