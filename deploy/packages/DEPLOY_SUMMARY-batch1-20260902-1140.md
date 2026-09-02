# STREFEX Batch 1 rebuild — 20260902-1140

| Batch | Zip | Files | Size |
|------|-----|------:|-----:|
| 1 Marketing (bugfix) | `strefex-batch1-marketing-20260902-1140.zip` | 18 | 160023 B |

Also copied to `strefex-batch1-marketing-latest.zip`.

## Fixes vs previous Batch 1
- Include missing `public/marketing-site/site.js` (and full assets).
- Ship `vercel.json` so `/marketing-site/*` is not rewritten to the SPA shell, and framing is `SAMEORIGIN` / `frame-ancestors 'self'`.
- Ship `MarketingHome` that embeds via `srcDoc` (survives frame-deny headers) and fails visibly if HTML is wrong.
- Bump service worker cache so returning visitors drop the blank/stale shell.

## Smoke checks
- [ ] `/` shows landing (not blank)
- [ ] `/marketing-site/site.js` returns JS (200)
- [ ] Language menu works
- [ ] Sign in / Sign up / register `?type=buyer|supplier`
