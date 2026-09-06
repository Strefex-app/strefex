#!/usr/bin/env bash
# Rebuild Batch 1 — marketing / www.strefex.pro (self-contained overlay)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="${1:-$(date -u +%Y%m%d-%H%M)}"
OUT="$ROOT/deploy/packages"
STAGE="$OUT/.stage-batch1-$STAMP"
ZIP="$OUT/strefex-batch1-marketing-$STAMP.zip"
LATEST="$OUT/strefex-batch1-marketing-latest.zip"

mkdir -p "$OUT"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# Complete connected set — previous zip missed site.js, vercel rewrite/headers, SW bump.
FILES=(
  public/marketing-site/index.html
  public/marketing-site/site.js
  public/marketing-site/i18n-ui.js
  public/marketing-site/i18n-phrases.js
  public/marketing-site/assets/logo.png
  public/marketing-site/assets/mark.svg
  public/sw.js
  vercel.json
  src/pages/marketing/MarketingHome.jsx
  src/pages/marketing/MarketingShell.jsx
  src/pages/marketing/MarketingIntroPages.jsx
  src/pages/marketing/MarketingModeOrgChart.jsx
  src/pages/marketing/Marketing.css
  src/data/marketingPlatformCatalog.js
  src/pages/Register.jsx
  src/App.jsx
  src/routes/lazyPages.js
)

missing=0
for f in "${FILES[@]}"; do
  if [[ ! -e "$ROOT/$f" ]]; then
    echo "MISSING: $f" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

# Guard: MarketingHome must embed marketing HTML (iframe src or srcDoc)
if ! grep -qE 'srcDoc|MARKETING_SRC|/marketing-site/index.html' "$ROOT/src/pages/marketing/MarketingHome.jsx"; then
  echo "ERROR: MarketingHome.jsx must embed /marketing-site/index.html" >&2
  exit 1
fi
# Guard: vercel must exclude marketing-site from SPA rewrite
if ! grep -q 'marketing-site' "$ROOT/vercel.json"; then
  echo "ERROR: vercel.json must exclude /marketing-site from SPA rewrite" >&2
  exit 1
fi
# Guard: landing scripts connected
if ! grep -q 'site.js' "$ROOT/public/marketing-site/index.html"; then
  echo "ERROR: index.html must load site.js" >&2
  exit 1
fi
if ! grep -q 'i18n-ui.js' "$ROOT/public/marketing-site/index.html"; then
  echo "ERROR: index.html must load i18n-ui.js" >&2
  exit 1
fi

# App.jsx / lazyPages: use last committed versions so Batch 1 does not drag
# unrelated WIP platform modules into the marketing overlay.
for f in src/App.jsx src/routes/lazyPages.js; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git -C "$ROOT" show "HEAD:$f" > "$STAGE/$f"
done

for f in "${FILES[@]}"; do
  case "$f" in
    src/App.jsx|src/routes/lazyPages.js) continue ;;
  esac
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$ROOT/$f" "$STAGE/$f"
done

cat > "$STAGE/PACKAGE_README.md" <<EOF
# Batch 1 — Marketing / www.strefex.pro (bugfix rebuild)
Built: $STAMP

## Why this rebuild
Previous Batch 1 could blank the homepage for many users:
1. \`MarketingHome\` used \`iframe src\` while production had \`X-Frame-Options: DENY\` / \`frame-ancestors 'none'\`.
2. SPA rewrite swallowed \`/marketing-site/*\` so assets never served.
3. \`site.js\` was referenced by \`index.html\` but missing from the zip.

## Includes (connected set)
- \`public/marketing-site/**\` — HTML, \`site.js\`, i18n, assets
- \`src/pages/marketing/**\` — srcDoc \`MarketingHome\` + shell/intro/CSS
- \`vercel.json\` — exclude \`marketing-site\` from SPA rewrite; SAMEORIGIN framing
- \`public/sw.js\` — cache bump so clients drop stale shells
- \`Register.jsx\` — \`?type=\` deep-links
- \`App.jsx\` + \`lazyPages.js\` — \`/\` → MarketingShell

## Deploy
1. Overlay these files onto the release tree.
2. \`npm run build\` (Vite copies \`public/marketing-site\` → \`dist/marketing-site\`).
3. Deploy \`dist\` + ensure host uses this \`vercel.json\` (or equivalent nginx rules).
4. Smoke-test \`/\`, \`/marketing-site/index.html\`, \`/marketing-site/site.js\`, \`/register?type=buyer\`.

## Notes
If also shipping Batch 2, apply Batch 1 first, then Batch 2, and resolve \`App.jsx\` / \`lazyPages.js\` once (prefer the union).
EOF

(
  cd "$STAGE"
  zip -r "$ZIP" . -x '*.DS_Store'
)
cp "$ZIP" "$LATEST"

FILE_LIST=$(cd "$STAGE" && find . -type f ! -name '.DS_Store' | sed 's|^\./||' | sort)
FILE_COUNT=$(printf '%s\n' "$FILE_LIST" | wc -l | tr -d ' ')
BYTES=$(wc -c < "$ZIP" | tr -d ' ')

python3 - <<PY
import json
from pathlib import Path
out = Path("$OUT")
manifest = {
  "built_utc": "$STAMP",
  "batch1": {
    "zip": "strefex-batch1-marketing-$STAMP.zip",
    "files": """$FILE_LIST""".strip().splitlines(),
    "bytes": int("$BYTES"),
    "fixes": [
      "include site.js + full marketing-site assets",
      "MarketingHome srcDoc + HTML sanity check",
      "vercel.json marketing-site rewrite exclusion + SAMEORIGIN",
      "service worker cache bump",
    ],
  },
}
(out / f"manifest-batch1-$STAMP.json").write_text(json.dumps(manifest, indent=2) + "\n")
(out / "manifest-batch1-latest.json").write_text(json.dumps(manifest, indent=2) + "\n")
PY

cat > "$OUT/DEPLOY_SUMMARY-batch1-$STAMP.md" <<EOF
# STREFEX Batch 1 rebuild — $STAMP

| Batch | Zip | Files | Size |
|------|-----|------:|-----:|
| 1 Marketing (bugfix) | \`strefex-batch1-marketing-$STAMP.zip\` | $FILE_COUNT | $BYTES B |

Also copied to \`strefex-batch1-marketing-latest.zip\`.

## Fixes vs previous Batch 1
- Include missing \`public/marketing-site/site.js\` (and full assets).
- Ship \`vercel.json\` so \`/marketing-site/*\` is not rewritten to the SPA shell, and framing is \`SAMEORIGIN\` / \`frame-ancestors 'self'\`.
- Ship \`MarketingHome\` that embeds via \`srcDoc\` (survives frame-deny headers) and fails visibly if HTML is wrong.
- Bump service worker cache so returning visitors drop the blank/stale shell.

## Smoke checks
- [ ] \`/\` shows landing (not blank)
- [ ] \`/marketing-site/site.js\` returns JS (200)
- [ ] Language menu works
- [ ] Sign in / Sign up / register \`?type=buyer|supplier\`
EOF
cp "$OUT/DEPLOY_SUMMARY-batch1-$STAMP.md" "$OUT/DEPLOY_SUMMARY-latest.md"

rm -rf "$STAGE"
echo "Wrote $ZIP ($FILE_COUNT files, $BYTES bytes)"
