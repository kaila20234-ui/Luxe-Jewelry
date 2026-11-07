/**
 * Service Worker Registration and Caching Strategy
 * Enables offline functionality and advanced caching
 */

// Service Worker file path: /public/service-worker.js
const SW_CODE = `
const CACHE_VERSION = 'v1-' + Date.now();
const CACHE_NAMES = {
  static: CACHE_VERSION + '-static',
  api: CACHE_VERSION + '-api',
  images: CACHE_VERSION + '-images'
};

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAMES.static).then(cache => {
        return cache.addAll([
          '/',
          '/index.html',
          '/css/style.css',
          '/js/main.js'
        ]);
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !Object.values(CACHE_NAMES).includes(name))
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests: Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAMES.api);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Offline: return cached response
          return caches.match(request).then(cached => {
            return cached || new Response(
              JSON.stringify({ error: 'offline' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Static assets: Cache first, fallback to network
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request))
        .catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Images: Cache first, fallback to network
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAMES.images)
        .then(cache => {
          return cache.match(request)
            .then(cached => {
              if (cached) return cached;
              
              return fetch(request)
                .then(response => {
                  if (response.ok) {
                    cache.put(request, response.clone());
                  }
                  return response;
                });
            });
        })
        .catch(() => new Response('Image not available', { status: 503 }))
    );
    return;
  }

  // Default: Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => response.ok ? response : caches.match(request))
      .catch(() => caches.match(request))
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  try {
    const cart = await getFromIndexedDB('cart');
    const response = await fetch('/api/cart/sync', {
      method: 'POST',
      body: JSON.stringify(cart),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      await clearIndexedDB('cart');
    }
  } catch (err) {
    console.error('[SW] Sync failed:', err);
    throw err; // Retry
  }
}

async function getFromIndexedDB(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('siwes-db', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(store, 'readonly');
      const objectStore = tx.objectStore(store);
      const getRequest = objectStore.getAll();
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

async function clearIndexedDB(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('siwes-db', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      const clearRequest = objectStore.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}
`;

/**
 * Service worker registration endpoint
 */
function registerServiceWorker(app) {
  // Serve service worker file
  app.get('/service-worker.js', (req, res) => {
    res.type('application/javascript');
    res.send(SW_CODE);
  });

  // Registration endpoint
  app.get('/api/sw-register', (req, res) => {
    res.json({
      registered: true,
      message: 'Service Worker registration available',
      features: [
        'offline-support',
        'push-notifications',
        'background-sync',
        'cache-strategies'
      ]
    });
  });

  console.log('[PWA] Service Worker support enabled');
}

module.exports = { registerServiceWorker, SW_CODE };
