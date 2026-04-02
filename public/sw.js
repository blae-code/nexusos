/**
 * NexusOS Service Worker
 * Cache strategy per spec:
 *   CACHE_FIRST:            / /app /icons/ /fonts/ CSS JS bundles
 *   NETWORK_FIRST:          /api/
 *   STALE_WHILE_REVALIDATE: /api/wiki/ /api/status
 *   NEVER CACHE:            /auth/ /api/auth/ /api/functions/auth/
 */

const CACHE_NAME = 'nexusos-v1';

const CACHE_FIRST_PATTERNS = [
  /\/icons\//,
  /\/fonts\//,
  /\/video\//,
  /\.(?:js|css|woff2?|ttf|svg|png|jpg|ico)(\?|$)/,
];

const NEVER_CACHE_PATTERNS = [
  /\/api\/functions\/auth\//,
  /\/api\/auth\//,
  /\/auth\//,
];

const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/api\/wiki\//,
  /\/api\/status/,
  /\/api\/functions\/verseStatus/,
];

const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
];

self.addEventListener('install', (event) => {
  // Activate immediately — don't wait for old tabs to close
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never cache auth endpoints
  if (NEVER_CACHE_PATTERNS.some((p) => p.test(url))) return;

  // Stale-while-revalidate: serve cache, update in background
  if (STALE_WHILE_REVALIDATE_PATTERNS.some((p) => p.test(url))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Network-first: try network, fall back to cache
  if (NETWORK_FIRST_PATTERNS.some((p) => p.test(url))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first: serve cache, fetch if missing
  if (CACHE_FIRST_PATTERNS.some((p) => p.test(url))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests (HTML) — network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}
