
const CACHE_NAME = 'campusdata-v3.0';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache).catch(err => console.warn('PWA Cache setup skip:', err));
    })
  );
});

self.addEventListener('fetch', event => {
  // Netzwerk-Zuerst Strategie für TSX/TS Dateien wegen dynamischer Transpilierung
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    })
  );
});
