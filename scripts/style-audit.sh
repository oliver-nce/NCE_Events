#!/usr/bin/env bash
# Theme contract guard for Frappe panel / Vue UI (not Desk chrome).
# Fails on new hardcoded brand colors, unknown CSS aliases, and bare hex literals.
# Mark intentional exceptions with "theme-exempt" on the same line.
# See THEME_CLASS_CONTRACT.json and nce_events/public/css/theme_defaults.css.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/style-audit.py"
