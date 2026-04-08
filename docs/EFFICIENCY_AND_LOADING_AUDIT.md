# Efficiency, loading, and data-flow audit (frontend)

**Scope:** Vite + React 18 SPA (`src/`), routing, bundles, data requests, and update patterns.  
**Date:** 2026-03-29  
**Goal:** Prioritize work to reduce time-to-interactive, network churn, and unnecessary re-renders.

---

## 1. Executive summary

The app already uses **route-level code splitting** (`React.lazy` via `src/routes/lazyPages.js`), **manual vendor chunks** in `vite.config.js`, and **session gating** before rendering routes. Strengths include tenant-scoped store rehydration (`authStore` → dynamic imports of stores) and **abortable / timeout** patterns in some services (e.g. CTI).

Main improvement areas:

| Area | Risk | Typical fix |
|------|------|-------------|
| **Initial JS payload** | Large `index` chunk despite lazy routes | Defer non-critical providers; split `App.jsx` import surface; preload only critical chunks |
| **Authenticated background work** | Service request polling + storage sync | Back off interval when tab hidden; coalesce with `requestIdleCallback` / visibility |
| **No global request cache** | Duplicate fetches, no SWR | Introduce TanStack Query or a thin `fetch` cache with stale-while-revalidate |
| **Heavy leaf imports** | xlsx, pdf, globe pulled into route chunks | Dynamic `import()` at click-time for exports; keep globe lazy (already partially done on Home) |
| **Build warnings** | ~600kB+ main chunk, ~1.8MB globe chunk | Acceptable if lazy; document `manualChunks` tuning and route prefetch strategy |

---

## 2. What is already optimized

### 2.1 Routing and lazy loading

- **All major pages** are loaded through `lazy(() => import(...))` in `src/routes/lazyPages.js` and referenced from `src/App.jsx` inside a single `<Suspense fallback={<RouteLoadingFallback />}>`.
- **Home** additionally lazy-loads **Cost Transformation Intelligence** (`React.lazy` in `Home.jsx`) so the main Home chunk stays smaller until the CTI chunk is needed (and can be skipped when CTI is collapsed after first load if you later avoid preloading).

### 2.2 Build configuration

- `vite.config.js` defines **`manualChunks`** for `vendor-react`, `vendor-firebase`, `vendor-pdf`, `vendor-maps`, `vendor-globe`, `vendor-sentry`, etc., improving cacheability across deploys.
- `optimizeDeps.include` pre-bundles heavy libs in dev for faster cold starts.
- `chunkSizeWarningLimit: 600` acknowledges large feature chunks (globe ~1.8MB gzip ~500KB is expected for three.js stack).

### 2.3 API and resilience

- `src/services/api.js`: centralized `fetch`, JWT attachment, **401 → logout**, JSON parsing — good single place for retries/timeouts later.
- `src/services/costTransformationIntelligenceService.js`: **`fetchWithTimeout`**, optional **`AbortSignal`**, fallback paths — good pattern to replicate for other modules.

### 2.4 Auth and tenant isolation

- `authService.initSession()` runs once; **blocking spinner** until `sessionChecked` avoids flash of wrong UI (`App.jsx`).
- `rehydrateAllTenantStores` uses **dynamic `import()`** of stores to avoid circular deps and limit upfront parse cost on login.

---

## 3. Initial load and shell

### 3.1 Synchronous entry cost

- **`App.jsx`** statically imports **every** lazy page symbol from `./routes/lazyPages` (one big import list). That does **not** download all page bundles upfront, but it **does** evaluate the `lazyPages.js` module and register many lazy factories — acceptable, but the **main bundle** still includes `App`, all guards, `AppLayout`, `supabase`, `workspaceCloudSync`, etc.
- **`AppLayout`** is not lazy: every authenticated route pays for sidebar, nav, and `Icon` usage on first paint after login.

**Recommendations**

1. **Measure** with Lighthouse + “Coverage” on `/main-menu` and `/login` after `npm run build && vite preview`.
2. Consider **lazy `AppLayout`** only for routes that use a minimal layout (if product allows), or split **sidebar data** from chrome.
3. **Defer non-critical effects**: e.g. `AnalyticsProvider` already runs Stripe `getSubscription` on login — ensure it never blocks first paint (it is `useEffect`; keep it that way).

### 3.2 Session loading UX

- Full-screen spinner until `sessionChecked` is correct for security; optional improvement: **skeleton layout** matching `AppLayout` to reduce perceived wait (cosmetic).

---

## 4. Data requests and updates

### 4.1 Service request store (global when authenticated)

- `serviceRequestStore`: **`startRefreshSequence`** runs **`setInterval(..., 12000)`** and also on `focus`, `visibilitychange` (when visible), and `storage` events (`src/store/serviceRequestStore.js` ~885–916).
- **Impact:** Every 12s while logged in, work runs even if the user is on a page that does not need service requests. Also **`refreshFromDatabase`** may hit the network depending on implementation.

**Recommendations**

1. **Increase interval** when `document.visibilityState !== 'visible'` (pause timer or switch to 60s+).
2. **Skip polling** on routes that never show service requests (optional, needs route list).
3. **Single-flight** `refreshFromDatabase` (ignore overlapping calls if one is in flight).

### 4.2 Workspace cloud sync

- `WorkspaceSyncOnNavigate` flushes on every pathname/search change (`App.jsx`). Good for durability; **batch** or **debounce** if flush triggers heavy work.

### 4.3 No unified server cache layer on the client

- Many pages likely call `api.*` or `fetch` in `useEffect` without **deduplication**, **stale-while-revalidate**, or **background refetch** semantics.

**Recommendations**

1. Introduce **TanStack Query (React Query)** for server state: caching, deduping, `keepPreviousData`, `staleTime`, and invalidation after mutations.
2. If staying lightweight: add a small **`apiGetCached(path, { ttl })`** with in-memory Map + optional `sessionStorage` for read-heavy lists.

### 4.4 Third-party SDKs

- **Firebase**, **Supabase**, **Stripe**, **Sentry**, **Mixpanel** (via analytics): ensure each is **imported only where used** (dynamic import for PDF/xlsx-heavy tools is already a common pattern — audit `xlsx` and `jspdf` entry points).

---

## 5. Lazy loading: further optimizations

| Item | Current | Suggestion |
|------|---------|------------|
| Route transitions | Single `Suspense` spinner | Optional **prefetch** on `Link` hover/focus for likely next route (`import()` same chunk). |
| Heavy widgets | Globe, maps, PDF | Already split vendors; ensure **no static import** of `globe.gl` in shared components used on every page. |
| Icons | Large `Icon.jsx` | Tree-shaking is limited if one big map; **split icons by route** or SVG sprite only for nav if bundle analysis shows `Icon` in critical path. |
| CTI on Home | Lazy + collapsible | Collapsed state avoids rendering CTI; optional: **don’t mount** CTI until expand if you want zero cost when collapsed from first visit (requires UX choice). |

---

## 6. Network and API efficiency

1. **HTTP/2 multiplexing** — ensure production serves assets over HTTP/2 or HTTP/3.
2. **Brotli** — configure CDN/host to compress JSON and JS (Vite build is pre-gzipped in reports; ensure origin sends compression).
3. **Pagination** — audit list endpoints used by Vendor, RFQ, Projects: enforce **limit/offset** or **cursor** on API and UI.
4. **ETag / If-None-Match** — if backend supports, wire in `api.js` for idempotent GETs.

---

## 7. Rendering efficiency (React)

1. **Zustand selectors:** Prefer `useStore(s => s.specificSlice)` to avoid re-renders when unrelated slices change.
2. **`React.memo`** for heavy list rows (tables on dashboards).
3. **Virtualization** for long lists (`react-window` / `@tanstack/react-virtual`) on Procurement, Vendors, Logs if lists exceed ~100 rows.

---

## 8. Prioritized backlog

### P0 — High impact, low regret

- [ ] **Throttle or pause** `serviceRequestStore` 12s interval when tab is hidden.
- [ ] **Profile main bundle** (`dist/stats.html` via `rollup-plugin-visualizer` optional) and list top 10 modules in `index-*.js`.
- [ ] **Document** which pages fire network on mount (quick spreadsheet for QA).

### P1 — Medium effort

- [ ] Add **TanStack Query** (or minimal cache) for shared lists and detail pages.
- [ ] **Prefetch** next route chunk on primary nav hover.
- [ ] **Debounce** `flushPendingWorkspacePushes` on rapid navigation.

### P2 — Larger refactors

- [ ] Lazy-load **AppLayout** variants or slim shell for “simple” routes.
- [ ] **Virtualize** large tables.
- [ ] **Service worker** caching strategy for `index.html` vs hashed assets (already have `registerSW` — align with offline policy).

---

## 9. Measurement checklist (repeat after changes)

1. `npm run build` — note `dist/assets/index-*.js` size and largest chunks.
2. Lighthouse (mobile): Performance, TBT, LCP on `/main-menu` cold load.
3. Chrome DevTools **Network**: filter XHR/fetch on idle home — count requests per minute when logged in.
4. **React DevTools Profiler**: record interaction on slow page (e.g. Vendor list).

---

## 10. File reference map

| Concern | Primary files |
|--------|----------------|
| Routes + lazy pages | `src/App.jsx`, `src/routes/lazyPages.js` |
| Build chunks | `vite.config.js` |
| Session gate | `src/App.jsx`, `src/services/authService.js`, `src/store/authStore.js` |
| Polling / refresh | `src/store/serviceRequestStore.js` |
| API wrapper | `src/services/api.js` |
| Nav sync / workspace | `src/App.jsx` (`WorkspaceSyncOnNavigate`), `src/services/workspaceCloudSync.js` |
| Analytics + subscription fetch | `src/components/AnalyticsProvider.jsx` |
| CTI / timeouts / abort | `src/services/costTransformationIntelligenceService.js` |
| Home CTI lazy | `src/pages/Home.jsx` |

---

*This document is intended to guide incremental optimization without mandating a single framework. Adjust priorities after bundle analysis and production RUM data.*

---

## 11. Implemented (2026-03-29)

- **Service requests:** Interval polling runs only while `document.visibilityState === 'visible'`; hidden tabs stop the 12s timer (storage/focus/visibility handlers still refresh when appropriate). **`refreshFromDatabase`** is **single-flight** (overlapping calls share one in-flight promise).
- **Workspace sync:** **`WorkspaceSyncOnNavigate`** debounces `flushPendingWorkspacePushes` by 450ms and flushes immediately on cleanup so rapid navigations coalesce without losing the last flush.
- **Subscription fetch:** Stripe **`getSubscription`** runs via **`requestIdleCallback`** (4s timeout fallback) after login so it does not compete with initial render/route code-split loading.
