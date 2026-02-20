/**
 * STREFEX Platform — Service Worker
 *
 * Caching strategies:
 *   - App shell (HTML)            → Network-first, fallback to cache
 *   - Static assets (JS/CSS/imgs) → Cache-first, background refresh
 *   - API calls                   → Network-only (no stale data)
 *   - CDN / fonts                 → Cache-first, long TTL
 *   - Offline fallback            → Custom offline page from cache
 */

const CACHE_VERSION = 'strefex-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="theme-color" content="#000888"/>
  <title>STREFEX — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         background:#000222;color:#fff;display:flex;align-items:center;
         justify-content:center;min-height:100vh;text-align:center;padding:2rem}
    .wrap{max-width:420px}
    .icon{width:80px;height:80px;margin:0 auto 1.5rem;opacity:.7}
    h1{font-size:1.5rem;margin-bottom:.75rem;font-weight:600}
    p{font-size:.95rem;line-height:1.6;color:rgba(255,255,255,.7);margin-bottom:1.5rem}
    button{background:#000888;color:#fff;border:none;padding:.75rem 2rem;
           border-radius:8px;font-size:.95rem;cursor:pointer;transition:opacity .2s}
    button:hover{opacity:.85}
  </style>
</head>
<body>
  <div class="wrap">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity=".3"/>
      <path d="M16.24 7.76a6 6 0 0 0-8.49 0M19.07 4.93a10 10 0 0 0-14.14 0" stroke-linecap="round"/>
      <line x1="2" y1="2" x2="22" y2="22" stroke-linecap="round"/>
    </svg>
    <h1>You are offline</h1>
    <p>STREFEX requires an internet connection for full functionality.
       Check your connection and try again.</p>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`

/* ─── Install ──────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache partial failure:', err)
      })
    })
  )
  self.skipWaiting()
})

/* ─── Activate — clean old caches ──────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

/* ─── Helpers ──────────────────────────────────────────────── */

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|webp|ico|webmanifest)(\?.*)?$/i.test(url.pathname)
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('supabase.co') ||
         url.hostname.includes('stripe.com') ||
         url.hostname.includes('firebaseapp.com') ||
         url.hostname.includes('googleapis.com')
}

function isCdnAsset(url) {
  return url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com') ||
         url.hostname.includes('cdn.jsdelivr.net') ||
         url.hostname.includes('js.stripe.com')
}

/* ─── Fetch handler ────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Skip chrome-extension, devtools, etc.
  if (!url.protocol.startsWith('http')) return

  // API calls — network only, no caching
  if (isApiCall(url)) return

  // Navigation (HTML pages) — network-first with offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  // CDN fonts / scripts — cache-first (long-lived)
  if (isCdnAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE))
    return
  }

  // Static assets (hashed JS/CSS, images) — stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
    return
  }

  // Everything else — network with cache fallback
  event.respondWith(networkWithCacheFallback(request))
})

/* ─── Strategy: Network-first for navigation ───────────────── */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Offline fallback page
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

/* ─── Strategy: Cache-first ────────────────────────────────── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 408 })
  }
}

/* ─── Strategy: Stale-while-revalidate ─────────────────────── */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  return cached || (await fetchPromise) || new Response('', { status: 408 })
}

/* ─── Strategy: Network with cache fallback ────────────────── */
async function networkWithCacheFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('', { status: 408 })
  }
}

/* ─── Background sync (for future use) ─────────────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Future: replay queued mutations
      Promise.resolve()
    )
  }
})

/* ─── Push notifications (for future use) ──────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'STREFEX', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: data.tag || 'strefex-notification',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
