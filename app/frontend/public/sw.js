/**
 * Project Ease — Service Worker (Task #160 PWA)
 * Strategy: Cache-first for static assets, network-first for API calls.
 */

const CACHE_NAME    = "project-ease-v1";
const OFFLINE_URL   = "/offline.html";

// Static assets to pre-cache on install
const PRECACHE_URLS = [
    "/",
    "/offline.html",
    "/manifest.json",
    "/favicon.ico",
];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Pass through non-GET and cross-origin requests
    if (request.method !== "GET" || !url.origin.includes(self.location.origin)) {
        return;
    }

    // Network-first for API routes
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") ||
        url.pathname.startsWith("/clients") || url.pathname.startsWith("/matters") ||
        url.pathname.startsWith("/invoices") || url.pathname.startsWith("/hearings") ||
        url.pathname.startsWith("/upload") || url.pathname.startsWith("/documents")) {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Cache-first for static assets (JS, CSS, fonts, images)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type === "opaque") {
                        return response;
                    }
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(OFFLINE_URL));
        })
    );
});
