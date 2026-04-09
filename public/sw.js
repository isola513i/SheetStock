const STATIC_CACHE = 'sheetstock-static-v2';
const DATA_CACHE = 'sheetstock-data-v1';

const DATA_URLS = ['/api/inventory', '/api/catalog', '/api/auth/me'];

function isDataRequest(url) {
  return DATA_URLS.some((path) => url.pathname.startsWith(path));
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // API data requests: network-first with cache fallback
  if (isDataRequest(requestUrl)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.open(DATA_CACHE).then((cache) => cache.match(event.request))
        )
        .then((response) => response || new Response(JSON.stringify({ items: [], total: 0, offline: true }), {
          headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  // Static assets: cache-first
  if (requestUrl.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Pages: network-first with cache fallback for offline shell
  if (requestUrl.pathname === '/' || requestUrl.pathname === '/catalog' || requestUrl.pathname === '/pricing') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.open(STATIC_CACHE).then((cache) => cache.match(event.request)))
        .then((response) => response || fetch(event.request))
    );
    return;
  }

  // Everything else: network only
  event.respondWith(fetch(event.request));
});
