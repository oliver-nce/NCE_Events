#!/usr/bin/env python3
"""Generate ``nce_events/CODE_INDEX.json`` deterministically from the source tree.

Why this exists
---------------
The hand-edited ``CODE_INDEX.json`` drifts the moment files are added, renamed,
or deleted. This script walks the source tree, auto-derives the parts a machine
can compute (file list, top-level Python ``def``/``class`` names, JS top-level
``export`` names, ``frappe.provide`` namespaces, ``@frappe.whitelist`` decorators),
and merges in human-curated fields (``purpose``, ``sections``, ``private_helpers``,
``key_fields``, ``depends_on``) from ``nce_events/CODE_INDEX.manual.json``.

Run modes
---------
- ``python scripts/build_code_index.py --write`` (default): regenerate
  ``nce_events/CODE_INDEX.json`` and write it to disk.
- ``python scripts/build_code_index.py --check``: regenerate in memory and exit
  1 (printing a unified diff) if it differs from what is on disk. Used by
  pre-commit to block commits whose code changes have not regenerated the
  index.

Stdlib only — no third-party dependencies.

Layout of CODE_INDEX.manual.json
--------------------------------
::

    {
        "_meta": {...},  # copied verbatim into the generated index
        "architecture": {...},  # copied verbatim
        "module_overrides": {  # merged onto each generated entry
            "nce_events/api/panel_api.py": {
                "purpose": "...",
                "private_helpers": [...],
                "depends_on": [...],
                "sections": [...],
            }
        },
    }

If a path in ``module_overrides`` is not found on disk the script raises an
error so renames/deletes are surfaced loudly. Entries on disk without an
override get a placeholder ``"purpose": "TODO: describe in CODE_INDEX.manual.json"``.
"""

from __future__ import annotations

import argparse
import ast
import datetime as _dt
import difflib
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX_PATH = REPO_ROOT / "nce_events" / "CODE_INDEX.json"
MANUAL_PATH = REPO_ROOT / "nce_events" / "CODE_INDEX.manual.json"

# Map a file path (POSIX, repo-root-relative) → top-level group key in the index.
# First match wins. Order matters; doctypes is handled specially below.
GROUP_RULES: list[tuple[re.Pattern, str]] = [
	(re.compile(r"^nce_events/api/.*\.py$"), "backend"),
	(re.compile(r"^nce_events/hooks\.py$"), "backend"),
	(re.compile(r"^nce_events/__init__\.py$"), "backend"),
	(re.compile(r"^nce_events/utils/.*\.py$"), "utils"),
	(re.compile(r"^nce_events/public/js/panel_page_v2/.*\.(js|vue)$"), "frontend_v2"),
	(re.compile(r"^nce_events/public/js/evaluations/.*\.(js|vue)$"), "frontend_v2"),
	(re.compile(r"^nce_events/public/js/hierarchy_explorer/.*\.js$"), "hierarchy_explorer"),
	(re.compile(r"^nce_events/public/js/js_dialogs/.*\.js$"), "js_dialogs"),
	(
		re.compile(
			r"^nce_events/public/js/(schema_explorer|email_template_tags|api_connector_tags|enrollments_exchange)\.js$"
		),
		"frontend_legacy_global",
	),
]

# Folders excluded entirely from scanning.
EXCLUDE_DIR_NAMES = {
	"__pycache__",
	"node_modules",
	".git",
	"panel_page_v2_dist",
	"evaluations_dist",
}

# DocType folder root.
DOCTYPE_ROOT = "nce_events/nce_events/doctype"

# JS regexes for top-level ``export`` and ``frappe.provide``.
JS_EXPORT_RE = re.compile(
	r"^\s*export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)",
	re.MULTILINE,
)
JS_EXPORT_NAMED_RE = re.compile(r"^\s*export\s*\{([^}]+)\}", re.MULTILINE)
FRAPPE_PROVIDE_RE = re.compile(r"""frappe\.provide\(\s*['"]([^'"]+)['"]\s*\)""")

# Vue ``defineProps`` / ``defineEmits`` we surface for frontend entries.
VUE_DEFINE_PROPS_RE = re.compile(r"defineProps\(\s*[\[\{]([^)]+)[\]\}]\s*\)", re.DOTALL)
VUE_DEFINE_EMITS_RE = re.compile(r"defineEmits\(\s*\[([^\]]+)\]\s*\)", re.DOTALL)

# ---------------------------------------------------------------------------
# Per-file extractors
# ---------------------------------------------------------------------------


def extract_python(path: Path) -> dict:
	"""Return ``{exports, whitelist_endpoints}`` for a Python module.

	``exports`` lists top-level ``def``/``class`` names whose name does not
	start with ``_``. ``whitelist_endpoints`` lists functions decorated with
	``@frappe.whitelist`` (the public API surface).
	"""
	try:
		tree = ast.parse(path.read_text(encoding="utf-8"))
	except SyntaxError as exc:  # pragma: no cover — surface, do not swallow
		raise SystemExit(f"SyntaxError parsing {path}: {exc}")

	exports: list[str] = []
	whitelist_endpoints: list[str] = []
	for node in tree.body:
		if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
			if not node.name.startswith("_"):
				exports.append(node.name)
			for deco in getattr(node, "decorator_list", []):
				if _is_frappe_whitelist(deco):
					whitelist_endpoints.append(node.name)
					break
	out: dict = {}
	if exports:
		out["exports"] = sorted(exports)
	if whitelist_endpoints:
		out["whitelist_endpoints"] = sorted(whitelist_endpoints)
	return out


def _is_frappe_whitelist(deco: ast.AST) -> bool:
	"""True if the decorator AST node is ``@frappe.whitelist`` or ``@frappe.whitelist(...)``."""
	if isinstance(deco, ast.Call):
		deco = deco.func
	if isinstance(deco, ast.Attribute) and deco.attr == "whitelist":
		if isinstance(deco.value, ast.Name) and deco.value.id == "frappe":
			return True
	return False


def extract_js(path: Path) -> dict:
	"""Return ``{exports, provides}`` for a ``.js`` file."""
	text = path.read_text(encoding="utf-8")
	exports: set[str] = set()
	for m in JS_EXPORT_RE.finditer(text):
		exports.add(m.group(1))
	for m in JS_EXPORT_NAMED_RE.finditer(text):
		for raw in m.group(1).split(","):
			name = raw.strip().split(" as ")[-1].strip()
			if name and re.match(r"^\w+$", name):
				exports.add(name)
	provides = sorted({m.group(1) for m in FRAPPE_PROVIDE_RE.finditer(text)})
	out: dict = {}
	if exports:
		out["exports"] = sorted(exports)
	if provides:
		out["provides"] = provides
	return out


def extract_vue(path: Path) -> dict:
	"""Return ``{exports?, provides?, defines}`` for a ``.vue`` SFC.

	Only the ``<script>`` / ``<script setup>`` block is scanned.
	"""
	text = path.read_text(encoding="utf-8")
	script_match = re.search(r"<script[^>]*>(.*?)</script>", text, re.DOTALL)
	out: dict = {}
	if not script_match:
		return out
	script = script_match.group(1)
	js_data = extract_js_string(script)
	out.update(js_data)
	defines: dict = {}
	if VUE_DEFINE_PROPS_RE.search(script):
		defines["uses_defineProps"] = True
	if VUE_DEFINE_EMITS_RE.search(script):
		defines["uses_defineEmits"] = True
	if defines:
		out["vue"] = defines
	return out


def extract_js_string(text: str) -> dict:
	"""Like ``extract_js`` but on an already-loaded string."""
	exports: set[str] = set()
	for m in JS_EXPORT_RE.finditer(text):
		exports.add(m.group(1))
	for m in JS_EXPORT_NAMED_RE.finditer(text):
		for raw in m.group(1).split(","):
			name = raw.strip().split(" as ")[-1].strip()
			if name and re.match(r"^\w+$", name):
				exports.add(name)
	provides = sorted({m.group(1) for m in FRAPPE_PROVIDE_RE.finditer(text)})
	out: dict = {}
	if exports:
		out["exports"] = sorted(exports)
	if provides:
		out["provides"] = provides
	return out


# ---------------------------------------------------------------------------
# Grouping
# ---------------------------------------------------------------------------


def group_for(rel_path: str) -> str | None:
	"""Return the top-level group key for ``rel_path`` or None to skip."""
	for pat, group in GROUP_RULES:
		if pat.match(rel_path):
			return group
	return None


def discover_files() -> list[str]:
	"""Walk the repo and return sorted POSIX paths of in-scope files."""
	found: list[str] = []
	for path in REPO_ROOT.rglob("*"):
		if not path.is_file():
			continue
		if any(part in EXCLUDE_DIR_NAMES for part in path.parts):
			continue
		rel = path.relative_to(REPO_ROOT).as_posix()
		if group_for(rel) is not None:
			found.append(rel)
	return sorted(found)


def discover_doctype_folders() -> list[str]:
	"""Return sorted POSIX paths of doctype folders (with trailing slash)."""
	root = REPO_ROOT / DOCTYPE_ROOT
	if not root.is_dir():
		return []
	folders: list[str] = []
	for child in root.iterdir():
		if not child.is_dir():
			continue
		if child.name in EXCLUDE_DIR_NAMES:
			continue
		rel = child.relative_to(REPO_ROOT).as_posix() + "/"
		folders.append(rel)
	return sorted(folders)


# ---------------------------------------------------------------------------
# Build the index
# ---------------------------------------------------------------------------


def build_index(manual: dict) -> dict:
	"""Construct the index dict in canonical order."""
	today = _dt.date.today().isoformat()

	out: dict = {}

	# _meta — auto-stamped + manual description preserved
	meta_manual = manual.get("_meta", {})
	out["_meta"] = {
		"description": meta_manual.get(
			"description",
			"Machine-readable index of every module in the NCE Events Frappe app.",
		),
		"generated": today,
		"generator": "scripts/build_code_index.py",
		"usage": meta_manual.get(
			"usage",
			"Run `python scripts/build_code_index.py --write` to regenerate after code changes. The pre-commit hook runs --check.",
		),
	}

	# architecture — straight copy
	out["architecture"] = manual.get("architecture", {})

	overrides: dict = manual.get("module_overrides", {})
	used_overrides: set[str] = set()

	# Group buckets in deterministic order
	buckets: dict[str, dict] = {
		"backend": {},
		"utils": {},
		"doctypes": {},
		"frontend_legacy_global": {},
		"frontend_v2": {},
		"js_dialogs": {},
		"hierarchy_explorer": {},
	}

	# 1) Doctypes — folders, not files
	for folder in discover_doctype_folders():
		entry: dict = {}
		if folder in overrides:
			entry.update(overrides[folder])
			used_overrides.add(folder)
		else:
			entry["purpose"] = "TODO: describe in CODE_INDEX.manual.json"
		buckets["doctypes"][folder] = entry

	# 2) Code files
	for rel in discover_files():
		group = group_for(rel)
		if group is None:
			continue
		entry: dict = {}
		path = REPO_ROOT / rel
		suffix = path.suffix
		if suffix == ".py":
			entry.update(extract_python(path))
		elif suffix == ".js":
			entry.update(extract_js(path))
		elif suffix == ".vue":
			entry.update(extract_vue(path))
		if rel in overrides:
			entry.update(overrides[rel])  # manual fields win for curated text
			used_overrides.add(rel)
		else:
			entry.setdefault("purpose", "TODO: describe in CODE_INDEX.manual.json")
		buckets[group][rel] = entry

	# Surface stale overrides (manual references file no longer on disk)
	stale = sorted(set(overrides) - used_overrides)
	if stale:
		raise SystemExit(
			"CODE_INDEX.manual.json references paths not on disk:\n  "
			+ "\n  ".join(stale)
			+ "\n\nRemove or update these entries, then re-run."
		)

	# Sort each bucket's keys deterministically and emit non-empty ones
	for key, bucket in buckets.items():
		if not bucket:
			continue
		out[key] = {k: bucket[k] for k in sorted(bucket)}

	return out


# ---------------------------------------------------------------------------
# Serialise + diff
# ---------------------------------------------------------------------------


def serialise(index: dict) -> str:
	"""Pretty-print with a trailing newline. Sort sub-dict keys lexically."""
	return json.dumps(index, indent=2, ensure_ascii=False, sort_keys=False) + "\n"


def main() -> int:
	parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
	parser.add_argument(
		"--check",
		action="store_true",
		help="Do not write; exit 1 if regenerating would change CODE_INDEX.json.",
	)
	parser.add_argument(
		"--write",
		action="store_true",
		help="Write CODE_INDEX.json (default).",
	)
	args = parser.parse_args()
	if args.check and args.write:
		parser.error("--check and --write are mutually exclusive")

	if not MANUAL_PATH.exists():
		sys.stderr.write(f"Manual overlay missing: {MANUAL_PATH}\n")
		return 2
	manual = json.loads(MANUAL_PATH.read_text(encoding="utf-8"))

	new_index = build_index(manual)
	new_text = serialise(new_index)

	old_text = INDEX_PATH.read_text(encoding="utf-8") if INDEX_PATH.exists() else ""

	# --- For --check, ignore the "generated" date so daily runs do not
	# fail merely because the date string moves. The script enforces every
	# other byte; the date is informational and gets re-stamped on --write.
	if args.check:
		diff = _meaningful_diff(old_text, new_text)
		if diff:
			sys.stderr.write(
				"CODE_INDEX.json is out of date.\n"
				"Run `python scripts/build_code_index.py --write` and commit.\n\n"
			)
			sys.stderr.write(diff)
			return 1
		return 0

	INDEX_PATH.write_text(new_text, encoding="utf-8")
	print(f"wrote {INDEX_PATH.relative_to(REPO_ROOT)}")
	return 0


def _meaningful_diff(old: str, new: str) -> str:
	"""Unified diff that ignores the ``generated`` date line."""

	def strip_date(text: str) -> list[str]:
		lines = []
		for line in text.splitlines(keepends=True):
			if '"generated":' in line:
				lines.append('"generated": "<auto>"\n')
			else:
				lines.append(line)
		return lines

	diff_lines = list(
		difflib.unified_diff(
			strip_date(old),
			strip_date(new),
			fromfile="CODE_INDEX.json (on disk)",
			tofile="CODE_INDEX.json (regenerated)",
			n=2,
		)
	)
	return "".join(diff_lines)


if __name__ == "__main__":
	raise SystemExit(main())
