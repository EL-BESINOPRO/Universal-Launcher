// Service Worker simple: cache shell + apps.json for offline browsing (básico)
const CACHE_NAME = 'launcher-v1';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/apps.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Stale-while-revalidate for apps manifest and shell
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(res => {
        if (res && res.status === 200) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        return res.clone();
      }).catch(()=> null);
      return cached || network;
    })
  );
});