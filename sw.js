/* Buy Sell Trade Sxm — service worker
 *
 * Strategy (kept deliberately conservative because the app logic lives inside
 * the big HTML files and the backend data must always be live):
 *
 *   HTML / navigations ....... network-first  -> cache -> /offline.html
 *   Same-origin static ....... stale-while-revalidate (icons, pwa.js, api js…)
 *   Google Fonts (css+files) . cache-first (immutable, versioned URLs)
 *   CDN libs (jsdelivr) ...... cache-first (versioned URL)
 *   Supabase (*.supabase.co) . NOT intercepted — always straight to network
 *
 * Bump CACHE_VERSION on any change here to force a clean cache swap.
 */
const CACHE_VERSION = 'bst-v9-apple-purchases';
const APP_SHELL = `app-shell-${CACHE_VERSION}`;
const RUNTIME = `runtime-${CACHE_VERSION}`;
const FONTS = `fonts-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/marketplace.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/pwa.js',
  '/native-ios.js',
  '/img-utils.js',
  '/draft-store.js',
  '/push-config.js',
  '/push-notifications.js',
  '/consent.js',
  '/ads-config.js',
  '/ads.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon-32.png',
];

const KEEP = new Set([APP_SHELL, RUNTIME, FONTS]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL)
      // addAll fails the whole install if one URL 404s — add individually.
      .then((cache) => Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Let the page tell a waiting worker to take over immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isHtmlRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'));
}

async function networkFirstHtml(request) {
  const cache = await caches.open(APP_SHELL);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request) || await cache.match('/index.html') || await cache.match('/');
    return cached || cache.match('/offline.html');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network || fetch(request);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch backend data / auth — must be live and per-user.
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // Google Fonts — immutable, safe to keep for a long time.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONTS));
    return;
  }

  // Versioned CDN libraries.
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  // Only handle our own origin beyond this point.
  if (url.origin !== self.location.origin) return;

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME));
});

/* ------------------------------------------------------------------ *
 * Web Push
 * ------------------------------------------------------------------ */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) { payload = { title: 'Buy Sell Trade Sxm', body: event.data && event.data.text() }; }

  const title = payload.title || 'Buy Sell Trade Sxm';
  const options = {
    body: payload.body || '',
    tag: payload.tag || undefined,          // collapses duplicates for the same convo
    renotify: !!payload.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-32.png',
    // actionUrls maps a button's `action` id (e.g. "keep") to the URL it
    // should open — the OS notification itself only understands
    // {action, title}, so the destination travels separately in `data`.
    data: { url: payload.url || '/marketplace.html', actionUrls: payload.actionUrls || {} },
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : undefined,
    timestamp: Date.now(),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const actionUrls = data.actionUrls || {};
  // A tap on one of the notification's own buttons carries event.action;
  // a plain tap on the notification body has action === "".
  const target = (event.action && actionUrls[event.action]) || data.url || '/marketplace.html';
  const targetPath = new URL(target, self.location.origin).pathname;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        // Reuse an open app tab if there is one.
        if (new URL(client.url).pathname === targetPath && 'focus' in client) {
          client.postMessage({ type: 'push-nav', url: target });
          return client.focus();
        }
      }
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'push-nav', url: target });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
