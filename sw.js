// Add a logger object for the service worker (console.log for sw is different)
const logger = {
  debug: (...args) => console.log('[SW DEBUG]', ...args),
  info: (...args) => console.info('[SW INFO]', ...args),
  error: (...args) => console.error('[SW ERROR]', ...args)
};

const CACHE_NAME = 'gchat-v1';
const urlsToCache = [
  '/', // Alias for index.html
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json', // It's good to cache the manifest too
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // Add other static assets if/when they are created
];

// Install event: opens cache and adds core files
self.addEventListener('install', event => {
  logger.info('Service Worker: Install event in progress.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        logger.info('Service Worker: Cache opened, adding core files to cache.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        logger.info('Service Worker: All core files successfully cached.');
        return self.skipWaiting(); // Force the waiting service worker to become the active service worker.
      })
      .catch(error => {
        logger.error('Service Worker: Cache addAll failed:', error);
      })
  );
});

// Activate event: cleans up old caches
self.addEventListener('activate', event => {
  logger.info('Service Worker: Activate event in progress.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            logger.info(`Service Worker: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      logger.info('Service Worker: Claiming clients.');
      return self.clients.claim(); // Take control of all open clients.
    })
  );
});

// Fetch event: serves assets from cache or fetches from network
self.addEventListener('fetch', event => {
  logger.info(`Service Worker: Fetch event for ${event.request.url}`);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          logger.info(`Service Worker: Serving from cache: ${event.request.url}`);
          return response;
        }
        logger.info(`Service Worker: Not in cache, fetching from network: ${event.request.url}`);
        return fetch(event.request)
          .then(networkResponse => {
            // Optionally, cache new requests dynamically
            // For this basic setup, we are only pre-caching essentials.
            // If you want to cache other things (e.g., API responses for offline),
            // you'd need to clone the response and put it in the cache here.
            return networkResponse;
          })
          .catch(error => {
            logger.error(`Service Worker: Fetch failed for ${event.request.url}:`, error);
            // Optionally, return a fallback offline page here
            // For instance, if event.request.mode === 'navigate'
            // return caches.match('/offline.html');
          });
      })
  );
});
