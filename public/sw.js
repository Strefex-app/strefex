/**
 * STREFEX Platform — Service Worker
 *
 * Caching strategies:
 *   - App shell (HTML navigations) → Network-first, then cached shell, then offline page
 *   - JS/CSS (app bundles)         → Network-first, then cache — never serve HTML as JS
 *   - Other static (images, fonts) → Stale-while-revalidate
 *   - API calls                    → Network-only (no stale data)
 *   - CDN / fonts                  → Cache-first, long TTL
 *
 * Important: returning the offline HTML document for failed script/style
 * requests breaks React.lazy after deploys and shows a false "offline" state.
 */

/** Bump when you need clients to drop all cached JS/CSS (e.g. removed major UI). */
const CACHE_VERSION = 'strefex-v11'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const SHELL_URL = '/index.html'

const PRECACHE_URLS = [
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
  <meta name="theme-color" content="#13151a"/>
  <title>STREFEX — Connection issue</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Quattrocento Sans',Candara,Calibri,'Segoe UI',Roboto,Arial,sans-serif;
         background:#0d0e10;color:#e8eaf2;display:flex;align-items:center;
         justify-content:center;min-height:100vh;text-align:center;padding:2rem}
    .wrap{max-width:420px}
    .icon{width:80px;height:80px;margin:0 auto 1.5rem;opacity:.7}
    h1{font-size:1.5rem;margin-bottom:.75rem;font-weight:600}
    p{font-size:.95rem;line-height:1.6;color:rgba(255,255,255,.7);margin-bottom:1.5rem}
    button{background:#00d4ff;color:#0d0e10;border:none;padding:.75rem 2rem;
           border-radius:8px;font-size:.95rem;cursor:pointer;transition:opacity .2s;margin:0 .35rem .5rem}
    button:hover{opacity:.85}
    button.secondary{background:transparent;color:#00d4ff;border:1px solid rgba(0,212,255,.45)}
  </style>
</head>
<body>
  <div class="wrap">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity=".3"/>
      <path d="M16.24 7.76a6 6 0 0 0-8.49 0M19.07 4.93a10 10 0 0 0-14.14 0" stroke-linecap="round"/>
      <line x1="2" y1="2" x2="22" y2="22" stroke-linecap="round"/>
    </svg>
    <h1>Couldn’t load STREFEX</h1>
    <p>The app shell did not reach this device. This is often a brief network blip or a stale install after a deploy — not always true offline.</p>
    <button onclick="location.reload()">Try again</button>
    <button class="secondary" type="button" onclick="(async()=>{try{if('caches' in window){const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)));} if(navigator.serviceWorker){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()));}}catch(e){} location.href='/?noscache='+Date.now();})()">Clear cache &amp; reload</button>
  </div>
</body>
</html>`

/* ─── Install ──────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache partial failure:', err)
      })
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
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
    ).then(() => self.clients.claim())
  )
})

/* ─── Helpers ──────────────────────────────────────────────── */

/** True document navigations only — do not treat Accept: text/html fetches as navigations. */
function isNavigationRequest(request) {
  return request.mode === 'navigate'
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|webp|ico|webmanifest)(\?.*)?$/i.test(url.pathname)
}

/** Hashed app chunks — prefer network so users do not run an old bundle after deploy. */
function isAppScriptOrStyle(url) {
  return /\.(js|css)(\?.*)?$/i.test(url.pathname)
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

function offlineDocumentResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function assetMissResponse(request) {
  const url = new URL(request.url)
  const isJs = /\.js(\?.*)?$/i.test(url.pathname)
  const isCss = /\.css(\?.*)?$/i.test(url.pathname)
  const body = isJs
    ? '/* strefex: asset unavailable */'
    : isCss
      ? '/* strefex: asset unavailable */'
      : ''
  return new Response(body, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': isJs ? 'application/javascript' : isCss ? 'text/css' : 'text/plain',
      'Cache-Control': 'no-store',
    },
  })
}

/* ─── Fetch handler ────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (!url.protocol.startsWith('http')) return

  // Same-origin marketing / Intelligent Sourcing static files — network first, never HTML-as-JS
  if (url.origin === self.location.origin && (
    url.pathname.startsWith('/marketing-site/') ||
    url.pathname.startsWith('/intelligent-sourcing/')
  )) {
    if (isAppScriptOrStyle(url) || url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname.endsWith('.js')) {
      event.respondWith(networkFirstStatic(request, RUNTIME_CACHE))
      return
    }
  }

  if (isApiCall(url)) return

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isCdnAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE))
    return
  }

  if (isStaticAsset(url) && isAppScriptOrStyle(url)) {
    event.respondWith(networkFirstStatic(request, RUNTIME_CACHE))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
    return
  }

  event.respondWith(networkWithCacheFallback(request))
})

/* ─── Strategy: Network-first for navigation ───────────────── */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      // SPA shell: cache both the request URL and canonical index for recovery.
      cache.put(request, response.clone())
      cache.put(SHELL_URL, response.clone())
    }
    return response
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match(SHELL_URL)) ||
      (await caches.match('/'))
    if (cached) return cached
    return offlineDocumentResponse()
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

/* ─── Strategy: Network-first for JS/CSS (fresh app code) ──── */
async function networkFirstStatic(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
      return response
    }
    // Do not cache 404/5xx hashed chunks from a partial deploy.
    const cached = await cache.match(request)
    if (cached) return cached
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    // Never return the offline HTML document as a script/style body.
    return assetMissResponse(request)
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
  const rawUrl = event.notification.data?.url || '/notifications'
  const targetUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
