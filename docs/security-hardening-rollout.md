# Security Hardening Rollout and Validation

This runbook covers the security hardening migrations added after the onboarding audit and defines the exact validation flow before push/deploy.

## 1) Migration Execution Order (Supabase SQL Editor)

Run in this order:

1. `supabase/migrations/007_profiles_rls_hardening.sql`
2. `supabase/migrations/008_companies_insert_policy_hardening.sql`
3. `supabase/migrations/009_profiles_select_policy_hardening.sql`
4. `supabase/migrations/010_team_members_select_hardening.sql`
5. `supabase/migrations/011_tenant_update_with_check_hardening.sql`

Notes:
- Expect `DROP POLICY IF EXISTS` statements to report no-op when policy names differ. This is safe.
- Do not skip order. Later files assume earlier policy/trigger constraints.

## 2) Pre-Validation Setup

Prepare at least these users:

- Company A admin (`admin-a@company-a.com`)
- Company A manager (`manager-a@company-a.com`)
- Company A user (`user-a@company-a.com`)
- Company B admin (`admin-b@company-b.com`)
- STREFEX superadmin (`strefex@strfgroup.ru`)

Minimum data:
- At least one `project`, `rfq`, `service_request`, and `team_member` row in each company.
- At least one pending service request assignment flow.

## 3) Critical Validation Cases

### A. Profile Escalation Protection

1. Login as Company A user.
2. Try to change own `role` to `admin` through app flow or direct client call path.
3. Try to change own `company_id` to Company B.

Expected:
- Update blocked by DB trigger.
- User remains in original role/company.

### B. Company Creation Restriction

1. Login as Company A admin (already linked to a company).
2. Attempt a direct company insert through app code path.

Expected:
- Rejected unless caller is `superadmin`.
- New company creation allowed only for first-time bootstrap users without company.

### C. Profile Read Scope

1. Login as Company A user.
2. Attempt to list all Company A profiles.

Expected:
- User sees own profile only.
- Company-wide profile list available only to `admin`/`manager`/`auditor_internal`.

### D. Team Member Read Scope

1. Login as Company A user.
2. Attempt to list all `team_members` for Company A.

Expected:
- User sees own membership row only (if linked).
- Company-wide team member visibility only for privileged company roles.

### E. Cross-Tenant UPDATE Reassignment

For each hardened table (`projects`, `rfqs`, `contracts`, `procurement_items`, `vendors`, `transactions`, `service_requests`, `templates`, `wallet_accounts`, `escrow_transactions`, `team_members`, `production_data`, `cost_data`, `enterprise_data`):

1. Login as Company A admin.
2. Attempt to update row `company_id` to Company B.

Expected:
- Blocked by `WITH CHECK` policy.
- Row remains in Company A.

### F. Buyer/Seller/Service Provider Routing

1. Register or login with buyer account.
2. Confirm dashboard path and account badges resolve to buyer context.
3. Repeat for seller and service provider accounts.

Expected:
- No fallback to wrong dashboard/account type.
- Account type remains consistent across refresh/relogin.

## 4) Smoke-Test Matrix (Pass/Fail)

Track each as Pass/Fail:

- [ ] Buyer registration with business email only
- [ ] Seller registration with business email only
- [ ] Service provider registration with required service categories
- [ ] Duplicate domain+accountType+industry blocked
- [ ] Login blocked when email not confirmed
- [ ] Superadmin keeps `superadmin` role after team invites
- [ ] Team invite email flow works and invited user role preserved
- [ ] Service request visibility tenant-safe (A cannot see B)
- [ ] Notifications scoped by tenant/role
- [ ] Profile escalation attempts blocked
- [ ] Cross-tenant row reassignment blocked

## 5) Rollback Guidance

If any critical case fails:

1. Stop rollout and do not push/deploy.
2. Re-run only the failing test to confirm reproducibility.
3. Patch in a new migration file (do not edit old executed migration in production).
4. Re-apply and restart validation from section 3.

## 6) Release Gate

Release only when:

- All section 3 critical cases pass.
- All section 4 smoke checks are pass.
- App build remains green locally (`npm run build`).
