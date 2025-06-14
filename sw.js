const CACHE_NAME = 'gchat-v1';
const urlsToCache = [
    'index.html',
    'style.css',
    'script.js',
    // Add paths to icons once they are available, e.g., 'icons/icon-192x192.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core assets:', urlsToCache);
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Activate worker immediately
            .catch(error => {
                console.error('Service Worker: Failed to cache core assets:', error);
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of uncontrolled clients
    );
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', event => {
    // We only want to cache GET requests for our assets
    if (event.request.method !== 'GET') {
        return;
    }

    // For navigation requests (HTML), use a network-first strategy to ensure freshness,
    // falling back to cache. For other assets, use cache-first.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If response is valid, cache it
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed, try to serve from cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // If not in cache and network failed (e.g. for index.html on first offline visit)
                            // you might want to return a specific offline page here,
                            // but for now, it will just fail.
                        });
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Cache hit - return response
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Not in cache - fetch from network
                    return fetch(event.request).then(
                        networkResponse => {
                            // If response is valid, cache it
                            if (networkResponse && networkResponse.status === 200) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                            return networkResponse;
                        }
                    ).catch(error => {
                        console.error('Service Worker: Fetch failed for:', event.request.url, error);
                        // Optionally, return a fallback asset like a placeholder image
                    });
                })
        );
    }
});
