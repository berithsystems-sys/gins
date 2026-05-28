const CACHE_NAME = 'gins-erp-v2';
const OFFLINE_URL = '/index.html';

// Assets to cache immediately on install
const INITIAL_CACHED_RESOURCES = [
  '/',
  OFFLINE_URL,
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(INITIAL_CACHED_RESOURCES);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API Calls: Network Only (or Network First if offline support needed for data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // 2. Navigation requests (HTML): Network First
  // This prevents the "blank screen" by ensuring we always try to get the latest index.html
  // which contains the correct links to the latest hashed JS/CSS files.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version but trigger a background update
        fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {}); // Ignore background fetch errors
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
