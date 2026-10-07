"""NCE Events API — whitelisted entry points.

code-index:begin
{
 "purpose": "NCE Events API whitelisted entry points including Page Panel CSV export via get_panel.",
 "read_when": "When adding top-level whitelisted methods or tracing GET panel CSV download routing.",
 "gotchas": [],
 "keywords": ["get_panel", "whitelisted", "CSV export", "Page Panel", "panel_export"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe
from frappe import _

from nce_events.api.panel_api_pkg.panel_export import build_page_panel_csv_text


@frappe.whitelist(methods=["GET"])
def get_panel(page_panel: str) -> None:
	"""Return a Page Panel's full dataset (visible + search-only columns) as a CSV download.

	GET /api/method/nce_events.api.get_panel?page_panel=<Page Panel name>

	Requires read permission on the Page Panel and its root DocType.
	"""
	csv_text, safe_stem, _row_count = build_page_panel_csv_text(page_panel)
	frappe.local.response.filename = f"{safe_stem}.csv"
	frappe.local.response.filecontent = csv_text
	frappe.local.response.type = "download"
