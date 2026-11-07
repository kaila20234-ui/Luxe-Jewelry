/* ============================================
   LUXE JEWELRY MOBILE APP - SERVICE WORKER
   PWA Offline Support & Caching Strategy
   ============================================ */

const CACHE_NAME = 'luxe-jewelry-mobile-v1';
const STATIC_ASSETS = [
  '/mobile/index.html',
  '/mobile/css/mobile-styles.css',
  '/mobile/js/mobile-app.js',
  '/mobile/js/api-client.js',
  '/mobile/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker installed');
        return globalThis.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return globalThis.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache first with network fallback
  event.respondWith(cacheFirst(request));
});

// Cache first strategy (for static assets)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response?.status === 200) {
      const clonedResponse = response.clone();
      cache.put(request, clonedResponse);
    }

    return response;
  } catch (error) {
    console.error('Fetch failed:', error);

    // Return offline page if available
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('You are offline', { status: 503 });
  }
}

// Network first strategy (for API calls)
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Cache successful API responses
    if (response?.status === 200) {
      const clonedResponse = response.clone();
      cache.put(request, clonedResponse);
    }

    return response;
  } catch (error) {
    console.error('Network request failed:', error);

    // Return cached response if available
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'You are offline. Some features may not be available.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);

  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncCart() {
  console.log('Syncing cart with server...');
  // Implement cart sync logic
}

async function syncOrders() {
  console.log('Syncing orders with server...');
  // Implement orders sync logic
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || {};
  const title = data.title || 'Luxe Jewelry';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
    tag: data.tag || 'notification',
  };

  event.waitUntil(globalThis.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/mobile/index.html';

  event.waitUntil(
    globalThis.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if app isn't open
      if (globalThis.clients.openWindow) {
        return globalThis.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message handler for client-service worker communication
self.addEventListener('message', (event) => {
  // Verify the origin of the received message
  if (!event.origin || typeof event.data !== 'object') {
    console.warn('Rejected message from untrusted source');
    return;
  }

  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    globalThis.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('Cache cleared');
    });
  }
});

console.log('Service Worker loaded');
