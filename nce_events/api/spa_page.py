from __future__ import annotations

import re
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

_SWITCH_PAGE_RE = re.compile(r"^switch_page\s*\(\s*([^)]+)\s*\)\s*$", re.IGNORECASE)


_SPA_CONFIG_FIELDS = (
	"name",
	"page_slug",
	"page_title",
	"panel_header_text",
	"doctype_source_mode",
	"switch_handler_slug",
	"is_active",
)


def _find_spa_definition_name(target: str) -> str | None:
	"""Resolve SPA Page Definition name by name, page_slug, switch_handler_slug, or doctype_source_mode."""
	key = cstr(target).strip()
	if not key or not frappe.db.table_exists("tabSPA Page Definition"):
		return None

	row = frappe.db.sql(
		"""
		SELECT name FROM `tabSPA Page Definition`
		WHERE name = %(k)s
		   OR page_slug = %(k)s
		   OR switch_handler_slug = %(k)s
		   OR doctype_source_mode = %(k)s
		LIMIT 1
		""",
		{"k": key},
	)
	return cstr(row[0][0]) if row else None


def _get_spa_row(name: str) -> dict[str, Any] | None:
	rows = frappe.db.sql(
		f"""
		SELECT {", ".join(f"`{f}`" for f in _SPA_CONFIG_FIELDS)}
		FROM `tabSPA Page Definition`
		WHERE name = %s
		LIMIT 1
		""",
		(name,),
		as_dict=True,
	)
	return rows[0] if rows else None


def _spa_config_dict(row: dict[str, Any]) -> dict[str, Any]:
	slug = cstr(row.get("page_slug") or row.get("name")).strip()
	mode = cstr(row.get("doctype_source_mode")).strip() or None
	return {
		"page_slug": slug,
		"route": f"/app/{slug}",
		"page_title": row.get("page_title"),
		"panel_header_text": row.get("panel_header_text"),
		"doctype_source_mode": mode,
		"switch_handler_slug": row.get("switch_handler_slug"),
		"is_active": cint(row.get("is_active")),
	}


@frappe.whitelist()
def resolve_spa_switch(target_spa: str) -> dict[str, Any]:
	"""Resolve Panel Action switch_page(target) to a Desk route. Target may be page_slug, mode, or switch_handler_slug."""
	key = cstr(target_spa).strip()
	if not key:
		frappe.throw(_("Target SPA is required."))

	name = _find_spa_definition_name(key)
	if not name:
		frappe.throw(_("No SPA Page Definition matches {0}.").format(key))

	row = _get_spa_row(name)
	if not row:
		frappe.throw(_("No SPA Page Definition matches {0}.").format(key))
	if not cint(row.get("is_active")):
		frappe.throw(_("SPA {0} is not active.").format(row.get("page_slug") or name))

	return _spa_config_dict(row)


@frappe.whitelist()
def get_spa_page_config(page_slug: str) -> dict[str, Any]:
	"""Return SPA Page Definition for booting a Frappe Page (active or inactive)."""
	slug = cstr(page_slug).strip()
	if not slug:
		frappe.throw(_("Page slug is required."))
	name = _find_spa_definition_name(slug)
	if not name:
		frappe.throw(_("No SPA Page Definition for {0}.").format(slug))

	row = _get_spa_row(name)
	if not row:
		frappe.throw(_("No SPA Page Definition for {0}.").format(slug))
	return _spa_config_dict(row)


@frappe.whitelist()
def list_spa_pages_for_ui() -> list[dict[str, Any]]:
	"""SPA pages that may appear in Desk UI (shortcuts, switch actions, etc.)."""
	# Nav labels only; ignore_permissions so non–System Manager desk users still see switches.
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
		ignore_permissions=True,
	)


def inactive_spa_page_slugs() -> frozenset[str]:
	rows = frappe.get_all(
		"SPA Page Definition",
		filters={"is_active": 0},
		pluck="page_slug",
		ignore_permissions=True,
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
