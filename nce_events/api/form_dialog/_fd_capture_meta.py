"""Frozen meta capture — tab skeleton, client scripts, and tab-notes sync."""

from __future__ import annotations

import json
import os
from typing import Any

import frappe
from frappe.utils import cint, cstr

from ._fd_fetch_from import _enrich_fetch_from_fields

# --- Main-form tab anchors (mirror public/js/panel_page_v2/utils/parseLayout.js) ---
FD_LEAD_TAB_ANCHOR = "__lead__"


def _frozen_tab_visually_nonempty(sections: list[dict[str, Any]]) -> bool:
	for sec in sections:
		for col in sec.get("columns") or []:
			if col.get("fields"):
				return True
	return False


def _main_tab_skeleton_from_frozen_fields(fields_list: list[dict]) -> list[dict[str, str]]:
	"""
	Collect {anchor, label} for each logical tab Desk/Vue derive from frozen fields.

	Anchor is FD_LEAD_TAB_ANCHOR for the leading tab (before first Tab Break), otherwise
	the Tab Break fieldname. Drops tabs with no visible data fields — same rule as JS
	``parseLayout`` + ``hasVisibleFields``.
	"""
	visible_fields = [f for f in fields_list if not cint(f.get("hidden") or 0)]

	tabs_skeleton: list[dict[str, str]] = []

	cur_anchor = FD_LEAD_TAB_ANCHOR
	cur_label = "Details"
	cur_sections: list[dict[str, Any]] = []

	cur_section: dict[str, Any] = {
		"label": "",
		"collapsible": False,
		"description": "",
		"columns": [],
	}
	cur_column: dict[str, list[Any]] = {"fields": []}

	def maybe_push_tab_done() -> None:
		if _frozen_tab_visually_nonempty(cur_sections):
			tabs_skeleton.append({"anchor": cur_anchor, "label": cur_label})

	for field in visible_fields:
		ft = cstr(field.get("fieldtype") or "")
		if ft == "Tab Break":
			cur_section["columns"].append(cur_column)
			cur_sections.append(cur_section)
			maybe_push_tab_done()
			tab_break_fn = cstr(field.get("fieldname") or "").strip()
			cur_anchor = tab_break_fn or FD_LEAD_TAB_ANCHOR
			cur_label = cstr(field.get("label") or "").strip() or "Details"
			cur_sections = []
			cur_section = {
				"label": "",
				"collapsible": False,
				"description": "",
				"columns": [],
			}
			cur_column = {"fields": []}
			continue

		if ft == "Section Break":
			cur_section["columns"].append(cur_column)
			cur_sections.append(cur_section)
			cur_section = {
				"label": cstr(field.get("label") or "").strip(),
				"collapsible": bool(cint(field.get("collapsible"))),
				"description": cstr(field.get("description") or "").strip(),
				"columns": [],
			}
			cur_column = {"fields": []}
			continue

		if ft == "Column Break":
			cur_section["columns"].append(cur_column)
			cur_column = {"fields": []}
			continue

		cur_column["fields"].append(field)

	cur_section["columns"].append(cur_column)
	cur_sections.append(cur_section)
	maybe_push_tab_done()

	return tabs_skeleton


def _capture_client_scripts(doctype: str) -> list[str]:
	"""
	Collect all Form-view JS for a DocType from two sources:

	1. ``Client Script`` DocType records (enabled, view=Form) — custom scripts
	   added via Desk for any doctype.
	2. The doctype's own app-level ``.js`` file on disk (e.g.
	   ``page_panel/page_panel.js``) — present for standard doctypes defined in
	   app code. Uses the same ``frappe.ui.form.on(doctype, {...})`` pattern.

	Returns a list of script strings. Never raises.
	"""
	scripts: list[str] = []

	# ── 1. Client Script DocType records ─────────────────────────────────────
	try:
		rows = frappe.get_all(
			"Client Script",
			filters={"dt": doctype, "enabled": 1, "view": "Form"},
			fields=["script"],
			order_by="name asc",
		)
		for r in rows:
			s = cstr(r.get("script") or "").strip()
			if s:
				scripts.append(s)
	except Exception:
		pass

	# ── 2. App-level doctype .js file ─────────────────────────────────────────
	try:
		meta = frappe.get_meta(doctype)
		module = cstr(meta.module or "").strip()
		if module:
			app = frappe.db.get_value("Module Def", module, "app_name")
			if app:
				doctype_snake = frappe.scrub(doctype)
				module_snake = frappe.scrub(module)
				js_path = frappe.get_app_path(
					app, module_snake, "doctype", doctype_snake, f"{doctype_snake}.js"
				)
				if os.path.isfile(js_path):
					with open(js_path, encoding="utf-8") as fh:
						content = fh.read().strip()
					if content:
						scripts.append(content)
	except Exception:
		pass

	return scripts


def _build_frozen_meta_json(doctype: str) -> tuple[str, list[dict]]:
	"""
	Build the ``frozen_meta_json`` string for a DocType by snapshotting its meta,
	enriching fetch_from fields, and capturing client scripts.

	Returns ``(frozen_json, fields_list)``. ``fields_list`` is returned alongside
	so callers can hand it to ``_sync_form_dialog_tab_notes_from_fields`` without
	re-fetching ``meta``.
	"""
	meta = frappe.get_meta(doctype)
	fields_list = [f.as_dict() for f in meta.fields]
	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	client_scripts = _capture_client_scripts(doctype)
	frozen_json = json.dumps(
		{"fields": fields_list, "client_scripts": client_scripts},
		default=str,
		indent=None,
	)
	return frozen_json, fields_list


def _sync_form_dialog_tab_notes_from_fields(doc: Any, fields_list: list[dict]) -> None:
	"""Rebuild ``tab_notes`` child rows from frozen fields; reuse ``note`` by ``tab_anchor``."""
	skeleton = _main_tab_skeleton_from_frozen_fields(fields_list)
	prev: dict[str, str] = {}
	for row in list(getattr(doc, "tab_notes", None) or []):
		ac = (cstr(getattr(row, "tab_anchor", None)) or "").strip()
		if not ac:
			continue
		prev[ac] = cstr(getattr(row, "note", "") or "") if getattr(row, "note", None) is not None else ""

	doc.tab_notes = []
	for sk in skeleton:
		doc.append(
			"tab_notes",
			{
				"tab_anchor": sk["anchor"],
				"tab_label": sk["label"],
				"note": prev.get(sk["anchor"], ""),
			},
		)
