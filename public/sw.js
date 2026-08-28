/**
 * BiteLog Service Worker v4
 * Strategy: Stale-While-Revalidate for pages, Cache-First for assets, Network-First for API
 * v4: pre-cache list now includes booking/trip-plan/catch-value/fishdex/alerts
 *     (previously missing — offline visits to those routes had no cache).
 */

const CACHE_NAME = "bitelog-v4";
const API_CACHE = "bitelog-api-v2"; // bumped: v1 held bad 200-status offline fallbacks

const STATIC_PAGES = [
  "/",
  "/feed",
  "/ranking",
  "/record",
  "/records",
  "/stats",
  "/settings",
  "/bite-forecast",
  "/concierge",
  "/news",
  "/regulations",
  "/season-forecast",
  "/booking",
  "/trip-plan",
  "/catch-value",
  "/fishdex",
  "/alerts",
  "/manifest.json",
];

// Install — pre-cache critical pages.
// addAll은 한 페이지만 실패해도 install 전체가 죽어 SW 업데이트가 막힌다
// (약전계 — 방파제·선상 — 사용자에게 치명). 페이지별로 격리해 실패한
// 것만 빠지고 업데이트는 진행되게 한다.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(STATIC_PAGES.map((page) => cache.add(page))),
      ),
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  const keepCaches = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !keepCaches.includes(k))
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and Firebase internals
  if (request.method !== "GET") return;
  if (!url.origin.includes(self.location.origin)) return;
  if (url.hostname.includes("firestore") || url.hostname.includes("googleapis"))
    return;

  // API routes (/api/*) — Network First, fallback to cache. 15s: several
  // routes proxy an external site with their own ~10s connect timeout
  // (e.g. thefishing.kr), so this needs to outlast that or the SW cuts the
  // request off before the route ever gets to return its own real
  // success/error response.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 15000));
    return;
  }

  // Static assets (JS, CSS, images) — Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Pages — Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
});

// === Strategies ===

async function networkFirstWithTimeout(request, cacheName, timeout) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // No cached copy — return a real error status, not a fake 200. A
    // synthetic `Response(json, {})` defaults to status 200, so any caller
    // that only checks `res.ok` (the normal, correct thing to check) reads
    // this as success and gets a body shape it doesn't recognize instead of
    // hitting its own error handling. Concretely: /api/boat-listings times
    // out reaching thefishing.kr around 10s, longer than this function's
    // 5s budget — the SW gives up first and used to paper over that with
    // {error:"offline"} at 200, which the booking page's `Array.isArray
    // (data.boats)` guard silently turned into "0 boats match your
    // filters" instead of the actual "couldn't load" state.
    return new Response(JSON.stringify({ error: "offline", items: [], data: [] }), {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

// === Helpers ===

function isStaticAsset(pathname) {
  return (
    /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(
      pathname,
    ) || pathname.startsWith("/_next/static/")
  );
}

// Listen for skip-waiting message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
