# Workspace cloud sync (cross-device)

## What it does

After **Supabase** login, the app pulls JSON **snapshots** for your **company** (`profiles.company_id`) into local Zustand / `localStorage`, then **debounced-pushes** changes (~2.5s) back to `public.tenant_workspace_snapshots`.

Same company account sees the same workspace data on **web, PWA, and mobile browser** (any device where you log in with Supabase).

## Covered data (state keys)

| Key | Content |
|-----|---------|
| `projects` | Project Management |
| `vendors` | Vendor master |
| `rfqs` | RFQs + received RFQs |
| `contracts` | Contracts |
| `procurement` | PRs / POs |
| `cost` | Cost management store |
| `enterprise` | Enterprise cost store |
| `production` | Production store |
| `templates` | Template library |
| `audit_logs` | Audit logs store |
| `hr_space` | HR Space |
| `account_registry` | Local buyer/seller/service registry |
| `profile_contacts` | Profile → contacts (Standard+ UI) |
| `industry_prefs` / `service_prefs` | Industry & service selections |
| `service_requests_workspace` | Service request queue + notifications |

**Not** synced here: subscription/billing state (Stripe), `transactions` (has its own DB sync), Supabase-native tables such as `account_directory_entries` (already server-side).

## Deploy

1. Apply migration **`025_tenant_workspace_snapshots.sql`** to your Supabase project (`supabase db push` or SQL editor).
2. Ensure env **`VITE_SUPABASE_URL`** / **`VITE_SUPABASE_ANON_KEY`** are set on the frontend.
3. Users must have **`company_id`** on `profiles` (created on registration / profile sync).

## Behaviour notes

- **Conflict policy:** last successful save wins per snapshot (offline edits on two devices may overwrite each other).
- **Guests / no company:** sync is skipped until `tenant.id` is a UUID from the profile.
- **Auditor read-only roles:** RLS may block writes; data stays local only.
