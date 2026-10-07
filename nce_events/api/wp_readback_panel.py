"""Panel V2 helpers: detect NCE Sync SQL write-back / WP read-back for a DocType.

code-index:begin
{
 "purpose": "Panel V2 helpers: detect NCE Sync SQL write-back and WP read-back for a DocType.",
 "read_when": "Checking whether a DocType has live WP Tables SQL write-back enabled for panel refresh timing.",
 "gotchas": [
  "Client uses write_back_refresh_seconds to pause before re-fetching the doc after submit."
 ],
 "keywords": ["doctype_has_wp_sql_live_readback", "WP Tables", "write_back_mode", "SQL Direct", "write_back_refresh_seconds", "mirror_status", "listen_for_changes", "nce_sync"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe


@frappe.whitelist()
def doctype_has_wp_sql_live_readback(frappe_doctype: str) -> dict:
	"""
	Return ``{"enabled": 1, "write_back_refresh_seconds": <int>}`` when a ``WP Tables``
	row matches this DocType with live SQL write-back — same gates as
	``nce_sync.utils.live_sync`` (push + refresh from WP). Otherwise ``enabled`` is 0.

	Client uses this to size the post-submit pause before the dialog re-fetches
	the doc from Frappe (the NCE_Sync worker writes WP, waits this many seconds
	to let WP triggers fire, then upserts the WP row back into Frappe).
	"""
	out = {"enabled": 0, "write_back_refresh_seconds": 0}
	dt = (frappe_doctype or "").strip()
	if not dt:
		return out
	if not frappe.db.exists("DocType", "WP Tables"):
		return out
	rows = frappe.get_all(
		"WP Tables",
		filters={
			"frappe_doctype": dt,
			"mirror_status": ["in", ["Mirrored", "Linked"]],
			"listen_for_changes": 1,
			"write_back_mode": "SQL Direct",
		},
		fields=["write_back_refresh_seconds"],
		limit_page_length=1,
	)
	if rows:
		out["enabled"] = 1
		out["write_back_refresh_seconds"] = int(rows[0].get("write_back_refresh_seconds") or 0)
	return out
