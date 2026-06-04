#!/usr/bin/env python3
"""Theme contract guard for panel / Vue UI. Run via scripts/style-audit.sh."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "nce_events" / "public"

SCOPE_DIRS = [
    PUBLIC / "js" / "panel_page_v2",
    PUBLIC / "js" / "evaluations",
]
SCOPE_FILES = [
    PUBLIC / "css" / "panel_page.css",
    PUBLIC / "css" / "schema_explorer.css",
    PUBLIC / "css" / "hierarchy_explorer.css",
]
SKIP_PARTS = ("node_modules", "_dist", "nce_spa_desk_nav.css", "evaluations_dist")
FILE_SUFFIXES = {".vue", ".css", ".js"}

BRIDGE_FILE = PUBLIC / "css" / "theme_defaults.css"

# Bare hex allowed until migrated (remove path substring when fixed).
HEX_DEBT = (
    "panel_page_v2/components/PanelFormDialogRelatedTab.vue",
)

VAR_USE = re.compile(r"var\(--([a-zA-Z0-9-]+)")
BRIDGE_ALIAS = re.compile(r"^\s+--([a-zA-Z0-9-]+):", re.MULTILINE)
VAR_FALLBACK_HEX = re.compile(r"var\([^)]*#[0-9A-Fa-f]{3,8}[^)]*\)", re.I)
HEX = re.compile(r"#[0-9A-Fa-f]{3,8}\b", re.I)
NAMED_COLOR = re.compile(r":\s*(white|black|red|green|blue)\s*[;!}]", re.I)
BRAND_RGBA = re.compile(r"rgba?\(\s*(18,\s*107,\s*196|65,\s*152,\s*240)", re.I)


def iter_source_files() -> list[Path]:
    files: list[Path] = []
    for d in SCOPE_DIRS:
        if not d.is_dir():
            continue
        for p in d.rglob("*"):
            if not p.is_file() or p.suffix not in FILE_SUFFIXES:
                continue
            if any(s in p.as_posix() for s in SKIP_PARTS):
                continue
            files.append(p)
    for p in SCOPE_FILES:
        if p.is_file():
            files.append(p)
    return files


def load_bridge_aliases() -> set[str]:
    text = BRIDGE_FILE.read_text(encoding="utf-8")
    return {m.group(1) for m in BRIDGE_ALIAS.finditer(text)}


def is_hex_debt(path: Path) -> bool:
    pos = path.as_posix()
    return any(d in pos for d in HEX_DEBT)


# Component-scoped custom properties (not theme bridge tokens).
ALLOWED_CUSTOM_PROPERTIES = frozenset(
    {
        "default-cell-min-width",
        "my-color",
        "ppv2-fd-rel-lbl",
        "ppv2-left-col",
        "tl",
        "tw",
    }
)


def check_unknown_aliases(files: list[Path], bridge: set[str]) -> list[str]:
    used: set[str] = set()
    for path in files:
        for m in VAR_USE.finditer(path.read_text(encoding="utf-8", errors="replace")):
            used.add(m.group(1))

    unknown = sorted(
        n
        for n in used
        if not n.startswith("nce-")
        and not n.startswith("tw-")
        and n != "bg"
        and n not in bridge
        and n not in ALLOWED_CUSTOM_PROPERTIES
    )
    if not unknown:
        return []
    return [f"var() uses alias not in theme_defaults.css bridge: {', '.join('--' + u for u in unknown)}"]


def check_bare_hex(files: list[Path]) -> list[str]:
    violations: list[str] = []
    for path in files:
        if is_hex_debt(path):
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if "theme-exempt" in line or "&#" in line:
                continue
            stripped = VAR_FALLBACK_HEX.sub("", line)
            if HEX.search(stripped):
                violations.append(f"{path.relative_to(ROOT)}:{lineno}:{line.strip()}")
    return violations


def check_pattern(files: list[Path], pattern: re.Pattern[str], label: str) -> list[str]:
    violations: list[str] = []
    for path in files:
        for lineno, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if "theme-exempt" in line:
                continue
            if pattern.search(line):
                violations.append(f"{path.relative_to(ROOT)}:{lineno}:{line.strip()}")
    if violations:
        return [label, *violations]
    return []


def main() -> int:
    files = iter_source_files()
    bridge = load_bridge_aliases()
    errors: list[str] = []

    print("style-audit: checking panel / Vue theme contract…")

    alias_errs = check_unknown_aliases(files, bridge)
    errors.extend(alias_errs)

    hex_v = check_bare_hex(files)
    if hex_v:
        errors.append("hardcoded hex (use var(--nce-color-*) or theme-exempt on line):")
        errors.extend(hex_v)

    errors.extend(check_pattern(files, NAMED_COLOR, "named color literal (use --nce-color-*):"))
    errors.extend(check_pattern(files, BRAND_RGBA, "hardcoded brand rgba (use color-mix with --nce-color-primary*):"))

    if errors:
        for e in errors:
            print(f"✗ {e}", file=sys.stderr)
        print("style-audit: FAILED", file=sys.stderr)
        return 1

    print("style-audit: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
