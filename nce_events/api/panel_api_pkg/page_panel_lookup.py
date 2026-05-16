"""Resolve Page Panel documents by ``root_doctype`` (not by ``name``).

Historically ``name`` matched ``root_doctype`` via autoname. Names may now differ,
so APIs must load rows using the Link field ``root_doctype`` (still unique).
"""

from __future__ import annotations

import frappe
from frappe.utils import cstr


def page_panel_docname_for_root(root_doctype: str) -> str | None:
	"""Primary key (``name``) of the Page Panel whose ``root_doctype`` matches."""
	rt = cstr(root_doctype or "").strip()
	if not rt:
		return None
	return frappe.db.get_value("Page Panel", {"root_doctype": rt}, "name")


def page_panel_exists_for_root(root_doctype: str) -> bool:
	return page_panel_docname_for_root(root_doctype) is not None


def get_page_panel_doc_for_root(root_doctype: str):
	name = page_panel_docname_for_root(root_doctype)
	if not name:
		return None
	return frappe.get_doc("Page Panel", name)


def generate_auto_page_panel_name(root_doctype: str) -> str:
	"""Stable-ish id for programmatic inserts (``save_panel_sql``). User-facing Desk uses Prompt."""
	rt = cstr(root_doctype or "").strip()
	base = frappe.scrub(rt or "panel").replace("_", "-")[:60]
	candidate = f"PP-{base}" if base else "PP-panel"
	name = candidate
	suffix = 0
	while frappe.db.exists("Page Panel", name):
		suffix += 1
		name = f"{candidate}-{suffix}"
	return name
