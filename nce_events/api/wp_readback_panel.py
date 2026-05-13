"""Panel V2 helpers: detect NCE Sync SQL write-back / WP read-back for a DocType."""

from __future__ import annotations

import frappe


@frappe.whitelist()
def doctype_has_wp_sql_live_readback(frappe_doctype: str) -> int:
	"""
	Return 1 when a ``WP Tables`` row matches this DocType with live SQL write-back —
	the same gates as ``nce_sync.utils.live_sync`` (push + refresh from WP).

	Client uses this for a brief post-submit pause before patching the panel row.
	"""
	dt = (frappe_doctype or "").strip()
	if not dt:
		return 0
	if not frappe.db.exists("DocType", "WP Tables"):
		return 0
	rows = frappe.get_all(
		"WP Tables",
		filters={
			"frappe_doctype": dt,
			"mirror_status": ["in", ["Mirrored", "Linked"]],
			"listen_for_changes": 1,
			"write_back_mode": "SQL Direct",
		},
		limit_page_length=1,
	)
	return 1 if rows else 0
