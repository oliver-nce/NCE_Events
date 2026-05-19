"""Upsert SPA Page Definition rows (adds panel-page-v2, syncs is_active on existing sites)."""

from __future__ import annotations

import frappe

from nce_events.patches.v0_0_2.seed_spa_page_definitions import _ROWS


def execute() -> None:
	if not frappe.db.table_exists("tabSPA Page Definition"):
		return

	for row in _ROWS:
		slug = row["page_slug"]
		if frappe.db.exists("SPA Page Definition", slug):
			doc = frappe.get_doc("SPA Page Definition", slug)
			for key, value in row.items():
				setattr(doc, key, value)
			doc.save(ignore_permissions=True)
		else:
			frappe.get_doc({"doctype": "SPA Page Definition", **row}).insert(ignore_permissions=True)

	frappe.db.commit()
