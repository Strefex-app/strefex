# Manual QA checklist (STREFEX)

Use before releases or after large changes. Adjust environments (local / staging / prod) as needed.

## Auth & session

- [ ] Register: buyer, seller, service_provider (if applicable).
- [ ] Login / logout; session survives refresh; expired session redirects to login.
- [ ] Wrong password shows a clear error (no blank screen).
- [ ] Superadmin login (if used) reaches admin-only routes.

## Role & plan gates

- [ ] Non–superadmin cannot open superadmin URLs (redirect to main menu or login).
- [ ] `AccountType` routes: buyer vs seller vs service_provider redirect correctly.
- [ ] Plan-gated pages (Premium / Enterprise) show upgrade when plan is too low.

## Profile & company

- [ ] Edit company info saves name, address, profile fields.
- [ ] Seller / service_provider **admin**: profile attachments upload, open, remove; save persists.
- [ ] After a failed save (e.g. network), no orphan files remain in storage (retry upload).

## Directories (superadmin where required)

- [ ] Platform directory loads and filters.
- [ ] Registered suppliers: empty state is informational (not a red error); import works when configured.
- [ ] Account directory (buyer) behaves as expected.

## Payments & subscriptions

- [ ] Plans page loads; checkout or portal (if enabled) completes without console errors.
- [ ] Webhook or sync updates plan in UI after purchase (if applicable).

## Core navigation

- [ ] Main menu and hubs (Buyers, Partners, Management) open.
- [ ] **404** unknown URL: shows layout + “Back to home”; link works.

## Regression smoke

- [ ] Build: `npm run build` succeeds.
- [ ] Tests: `npm test` passes.

## Supabase / env

- [ ] With `VITE_SUPABASE_*` unset, app does not white-screen; relevant features degrade gracefully.
- [ ] With Supabase set, RLS-protected actions fail safely for wrong user (no data leak in UI).

---

*Last aligned with audit items: supplier directory empty state, profile upload rollback, routing tests, 404 layout, repo docs.*
