/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'oms-cache-v1';
const STATIC_CACHE = 'oms-static-v1';
const DYNAMIC_CACHE = 'oms-dynamic-v1';
const API_CACHE = 'oms-api-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes to cache
const CACHEABLE_API_ROUTES = [
  '/api/v1/user/profile',
  '/api/v1/employees',
  '/api/v1/tasks',
  '/api/v1/projects',
];

// Max age for different cache types (in seconds)
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60, // 7 days
  dynamic: 24 * 60 * 60, // 1 day
  api: 5 * 60, // 5 minutes
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return (
              key !== STATIC_CACHE &&
              key !== DYNAMIC_CACHE &&
              key !== API_CACHE
            );
          })
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Default: network first with cache fallback
  event.respondWith(handleDynamicRequest(request));
});

// Handle API requests: Network first, cache fallback with timeout
async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Only cache specific API routes
  const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
    url.pathname.includes(route)
  );
  
  if (!isCacheable) {
    return fetch(request);
  }
  
  try {
    // Try network first with timeout
    const networkResponse = await fetchWithTimeout(request, 5000);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle static assets: Cache first, network fallback
async function handleStaticRequest(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder for images
    if (request.destination === 'image') {
      return new Response('', { status: 404 });
    }
    throw error;
  }
}

// Handle navigation requests: Network first, offline page fallback
async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetchWithTimeout(request, 10000);
    
    // Cache successful page loads
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try cached version
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlinePage = await caches.match('/offline');
    
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle dynamic requests: Network first with cache
async function handleDynamicRequest(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Fetch with timeout
function fetchWithTimeout(
  request: Request,
  timeout: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
    
    fetch(request)
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Check if path is a static asset
function isStaticAsset(pathname: string): boolean {
  const staticExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];
  
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Sync pending offline actions
async function syncPendingActions(): Promise<void> {
  // Get pending actions from IndexedDB
  // This would be implemented based on specific requirements
  console.log('[SW] Syncing pending actions...');
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options: NotificationOptions = {
      body: data.message || data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || 'oms-notification',
      renotify: true,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'OMS', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
    );
  }
});

export {};
