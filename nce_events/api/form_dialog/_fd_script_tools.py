"""Script tool group sync helpers for Form Dialog capture."""

from __future__ import annotations

import json
from typing import Any

from frappe.utils import cstr


def _parse_script_tool_groups_argument(raw: object) -> list[dict[str, str]]:
	if raw is None:
		return []
	if isinstance(raw, str):
		s = raw.strip()
		if not s:
			return []
		try:
			raw = json.loads(s)
		except json.JSONDecodeError:
			return []
	if not isinstance(raw, list):
		return []
	out: list[dict[str, str]] = []
	for item in raw:
		if not isinstance(item, dict):
			continue
		gk = cstr(item.get("group_key") or "").strip() or "__ungrouped__"
		tl = cstr(item.get("tab_label") or "").strip()
		out.append({"group_key": gk, "tab_label": tl})
	return out


def _sync_script_tool_groups(doc: Any, script_tool_groups: object) -> None:
	"""Sync ``script_tool_groups`` child rows on ``doc``.

	- If the incoming list is non-empty, merge it with preserved labels from existing rows.
	- If the incoming list is **empty** (wizard sent nothing / legacy mode):
	  * Preserve any existing rows so user-edited labels survive Rebuild.
	  * If there are no existing rows but the frozen meta includes client scripts,
	    auto-seed one ``__ungrouped__`` / ``Tools`` row so users can rename it
	    directly on the Form Dialog without re-running the wizard.
	"""
	parsed = _parse_script_tool_groups_argument(script_tool_groups)

	if not parsed:
		# Nothing incoming — preserve existing rows unchanged.
		if doc.get("script_tool_groups"):
			return
		# No existing rows: auto-seed when client scripts are present.
		try:
			fm = json.loads(cstr(doc.frozen_meta_json or "{}"))
			has_scripts = bool(fm.get("client_scripts"))
		except Exception:
			has_scripts = False
		if has_scripts:
			doc.append("script_tool_groups", {"group_key": "__ungrouped__", "tab_label": "Tools"})
		return

	preserved_labels: dict[str, str] = {}
	for old in list(doc.get("script_tool_groups") or []):
		gk = cstr(getattr(old, "group_key", None) or "").strip() or "__ungrouped__"
		tl = cstr(getattr(old, "tab_label", None) or "").strip()
		if tl:
			preserved_labels[gk] = tl

	doc.script_tool_groups = []
	for item in parsed:
		gk = cstr(item.get("group_key") or "").strip() or "__ungrouped__"
		incoming_tl = cstr(item.get("tab_label") or "").strip()
		tab_l = preserved_labels.get(gk) or incoming_tl or gk
		doc.append("script_tool_groups", {"group_key": gk, "tab_label": tab_l})
