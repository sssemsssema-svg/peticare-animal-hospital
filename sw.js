/* =========================================================================
 * PetiCare Service Worker — v47 (Production Refactored)
 * Aggressive cache-busting: Network-First for HTML/JS + immediate claim
 * ========================================================================= */

const CACHE_NAME = 'peticare-cache-v49-20261111';
const PRECACHE_ASSETS = [
  './',
  './visit.html',
  './doctor.html',
  './index.html',
  './client.html',
  './patient.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/data.js',
  './assets/js/speech_parser.js',
  './assets/js/image_storage.js',
  './assets/js/doctor.js',
  './assets/js/medical_corrector.js',
  './assets/js/cloud_sync.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(e => console.warn('Cache prefetch partial:', e));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Purging outdated PWA cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First Strategy: always prefer fresh network response for scripts/docs
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache POST/PUT (UltraMsg API, sync)

  const url = new URL(req.url);
  // Exclude third-party APIs, APK binaries, and UltraMsg
  if (url.origin !== self.location.origin || url.pathname.includes('.apk') || url.pathname.includes('api.')) {
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, cloned);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
