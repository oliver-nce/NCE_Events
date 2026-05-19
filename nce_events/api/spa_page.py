from __future__ import annotations

import re
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

_SWITCH_PAGE_RE = re.compile(r"^switch_page\s*\(\s*([^)]+)\s*\)\s*$", re.IGNORECASE)


def _ensure_builtin_spa_row(page_slug: str) -> bool:
	"""Insert a built-in SPA row on first access if migrate seed did not run yet."""
	if not frappe.db.table_exists("tabSPA Page Definition"):
		return False
	if frappe.db.exists("SPA Page Definition", page_slug):
		return True

	from nce_events.patches.v0_0_2.seed_spa_page_definitions import _ROWS

	for row in _ROWS:
		if row["page_slug"] != page_slug:
			continue
		frappe.get_doc({"doctype": "SPA Page Definition", **row}).insert(ignore_permissions=True)
		frappe.db.commit()
		return True
	return False


def _find_spa_definition_name(target: str) -> str | None:
	"""Resolve SPA Page Definition name by page_slug, switch_handler_slug, or doctype_source_mode."""
	key = cstr(target).strip()
	if not key or not frappe.db.table_exists("tabSPA Page Definition"):
		return None

	if frappe.db.exists("SPA Page Definition", key):
		return key

	name = frappe.db.get_value("SPA Page Definition", {"switch_handler_slug": key}, "name")
	if name:
		return cstr(name)

	name = frappe.db.get_value("SPA Page Definition", {"doctype_source_mode": key}, "name")
	if name:
		return cstr(name)

	return None


def _spa_config_dict(doc) -> dict[str, Any]:
	slug = cstr(doc.page_slug).strip()
	mode = cstr(doc.doctype_source_mode).strip() or None
	return {
		"page_slug": slug,
		"route": f"/app/{slug}",
		"page_title": doc.page_title,
		"panel_header_text": doc.panel_header_text,
		"doctype_source_mode": mode,
		"switch_handler_slug": doc.switch_handler_slug,
		"is_active": cint(doc.is_active),
	}


@frappe.whitelist()
def resolve_spa_switch(target_spa: str) -> dict[str, Any]:
	"""Resolve Panel Action switch_page(target) to a Desk route. Target may be page_slug, mode, or switch_handler_slug."""
	key = cstr(target_spa).strip()
	if not key:
		frappe.throw(_("Target SPA is required."))

	name = _find_spa_definition_name(key)
	if not name:
		_ensure_builtin_spa_row(key)
		name = _find_spa_definition_name(key)
	if not name:
		frappe.throw(_("No SPA Page Definition matches {0}.").format(key))

	doc = frappe.get_doc("SPA Page Definition", name)
	if not cint(doc.is_active):
		frappe.throw(_("SPA {0} is not active.").format(doc.page_slug))

	return _spa_config_dict(doc)


@frappe.whitelist()
def get_spa_page_config(page_slug: str) -> dict[str, Any]:
	"""Return SPA Page Definition for booting a Frappe Page (active or inactive)."""
	slug = cstr(page_slug).strip()
	if not slug:
		frappe.throw(_("Page slug is required."))
	if not frappe.db.exists("SPA Page Definition", slug) and not _ensure_builtin_spa_row(slug):
		frappe.throw(_("No SPA Page Definition for {0}.").format(slug))

	doc = frappe.get_doc("SPA Page Definition", slug)
	return _spa_config_dict(doc)


@frappe.whitelist()
def list_spa_pages_for_ui() -> list[dict[str, Any]]:
	"""SPA pages that may appear in Desk UI (shortcuts, switch actions, etc.)."""
	return frappe.get_all(
		"SPA Page Definition",
		filters={"is_active": 1},
		fields=[
			"page_slug",
			"page_title",
			"panel_header_text",
			"doctype_source_mode",
			"switch_handler_slug",
		],
		order_by="page_slug asc",
	)


def inactive_spa_page_slugs() -> frozenset[str]:
	rows = frappe.get_all(
		"SPA Page Definition",
		filters={"is_active": 0},
		pluck="page_slug",
	)
	return frozenset(cstr(s) for s in rows if s)


def switch_page_target_slug(client_handler: str | None) -> str | None:
	"""Parse ``switch_page(panel-page-native)`` → ``panel-page-native``."""
	text = cstr(client_handler).strip()
	if not text:
		return None
	match = _SWITCH_PAGE_RE.match(text)
	if not match:
		return None
	return cstr(match.group(1)).strip() or None
