#!/usr/bin/env bash
# Deploy nce_events on the Frappe bench server.
# Each stage is verified; script stops and reports which stage failed.
set -euo pipefail

BENCH="${BENCH:-/home/frappe/frappe-bench}"
APP_DIR="${BENCH}/apps/nce_events"

# ── helpers ──────────────────────────────────────────────────────────────────

ok()   { echo "    [OK] $*"; }
fail() { echo "    [FAIL] $*" >&2; exit 1; }

# ── 1. Git pull ───────────────────────────────────────────────────────────────

cd "$APP_DIR"

REMOTE=$(git remote | head -1)
OLD=$(git rev-parse HEAD 2>/dev/null || echo "")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
[ "$BRANCH" = "HEAD" ] && BRANCH="main"

echo ""
echo "=== 1. Git pull ==="
git fetch --no-tags "$REMOTE" "$BRANCH" 2>/dev/null || git fetch --no-tags "$REMOTE"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "$REMOTE/$BRANCH"
git reset --hard "$REMOTE/$BRANCH"

NEW=$(git rev-parse HEAD 2>/dev/null || echo "")
ok "HEAD is now $NEW"

if [ "$OLD" = "$NEW" ]; then
    echo ">>> Already up to date — skipping build/migrate."
    exit 0
fi

echo ">>> Moved: $OLD → $NEW"
CHANGED=$(git diff --name-only "$OLD" "$NEW" || true)
echo ">>> Changed files:"
echo "$CHANGED" | sed 's/^/    /'

# ── 2. Decide what to run ─────────────────────────────────────────────────────

NEED_FRONTEND=0
NEED_MIGRATE=0

if echo "$CHANGED" | grep -qE '(^frontend/|/public/js/)'; then
    NEED_FRONTEND=1
fi
# Schema/patch changes.
if echo "$CHANGED" | grep -qE '(patches/|patches\.txt|/doctype/.*\.json|/custom/.*\.json|hooks\.py|fixtures/)'; then
    NEED_MIGRATE=1
fi
# Any nce_events app file change → always migrate (catches version-bump-only pulls after schema commits).
if echo "$CHANGED" | grep -qE '^nce_events/'; then
    NEED_MIGRATE=1
fi

echo ""
echo "=== 2. Plan: frontend=$NEED_FRONTEND migrate=$NEED_MIGRATE ==="

# ── 3. npm build ─────────────────────────────────────────────────────────────

if [ "$NEED_FRONTEND" = "1" ]; then
    echo ""
    echo "=== 3. npm build ==="
    if [ -f "$APP_DIR/frontend/package.json" ]; then
        echo ">>> Building top-level frontend..."
        cd "$APP_DIR/frontend"
        if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
        npm run build
        ok "Top-level frontend built."
    fi
    for d in "$APP_DIR"/nce_events/public/js/*/; do
        [ -d "$d" ] || continue
        [ -f "$d/package.json" ] || continue
        echo ">>> Building $d..."
        (
            cd "$d"
            if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
            npm run build
        )
        ok "Built $(basename "$d")."
    done
else
    echo ""
    echo "=== 3. npm build — skipped (no frontend changes) ==="
fi

# ── 4. bench migrate ─────────────────────────────────────────────────────────

cd "$BENCH"

if [ "$NEED_MIGRATE" = "1" ]; then
    echo ""
    echo "=== 4. bench migrate ==="
    MIGRATED=0
    for s in sites/*/; do
        site=$(basename "$s")
        [ -f "sites/$site/site_config.json" ] || continue
        [ -f "sites/$site/apps.txt" ]         || continue
        grep -qxF "nce_events" "sites/$site/apps.txt" || continue
        echo ">>> Migrating site: $site"
        bench --site "$site" migrate
        ok "Migrated $site."
        MIGRATED=$((MIGRATED + 1))
    done
    [ "$MIGRATED" -gt 0 ] || fail "migrate required but no nce_events site was migrated — check apps.txt"
    ok "Migrated $MIGRATED site(s)."
else
    echo ""
    echo "=== 4. bench migrate — skipped (no schema/patch changes) ==="
fi

# ── 5. bench build ───────────────────────────────────────────────────────────

echo ""
echo "=== 5. bench build ==="
if [ "$NEED_FRONTEND" = "1" ]; then
    bench build --app nce_events
    ok "bench build done."
else
    echo ">>> Skipped (no frontend changes)."
fi

# ── 6. clear-cache + restart ─────────────────────────────────────────────────

echo ""
echo "=== 6. clear-cache + restart ==="
bench --site all clear-cache
ok "Cache cleared."
bench restart
ok "Services restarted."

echo ""
echo "=== Deploy complete: $OLD → $NEW ==="
