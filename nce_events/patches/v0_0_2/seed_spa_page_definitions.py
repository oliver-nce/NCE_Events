"""Seed SPA Page Definition rows for Mirror and Native panel SPAs.

Idempotent: skips rows that already exist (by page_slug).
"""

from __future__ import annotations

import frappe

_ROWS = (
	{
		"page_slug": "panel-page-mirrored",
		"page_title": "NCE Tables",
		"panel_header_text": "NCE Tables",
		"doctype_source_mode": "Mirror",
		"switch_handler_slug": "panel-page-mirrored",
	},
	{
		"page_slug": "panel-page-native",
		"page_title": "NCE Native DocTypes",
		"panel_header_text": "NCE Native DocTypes",
		"doctype_source_mode": "Native",
		"switch_handler_slug": "panel-page-native",
	},
)


def execute() -> None:
	if not frappe.db.table_exists("tabSPA Page Definition"):
		return

	for row in _ROWS:
		if frappe.db.exists("SPA Page Definition", row["page_slug"]):
			continue
		doc = frappe.get_doc({"doctype": "SPA Page Definition", **row})
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
