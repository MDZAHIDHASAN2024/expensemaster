const CACHE_NAME = 'expensemaster-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install — static assets cache করো
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Activate — পুরনো cache মুছো
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — Network first, cache fallback
self.addEventListener('fetch', (event) => {
  // API calls cache করব না
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Successful response cache এ রাখো
        if (res && res.status === 200 && event.request.method === 'GET') {
          const resClone = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, resClone));
        }
        return res;
      })
      .catch(() => {
        // Offline হলে cache থেকে দাও
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // HTML request হলে index.html দাও
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      }),
  );
});
