"""REST CSV export for a Page Panel (GET-friendly whitelisted endpoint)."""

from __future__ import annotations

import frappe
from frappe import _

from nce_events.api.panel_api_pkg.panel_export import build_page_panel_csv_text


@frappe.whitelist(methods=["GET"])
def get_page_panel_csv(page_panel: str) -> None:
	"""Return the full panel dataset (visible + search-only columns) as a CSV download.

	GET /api/method/nce_events.api.panel_api_pkg.panel_rest_export.get_page_panel_csv?page_panel=<Page Panel name>

	Requires read permission on the Page Panel and its root DocType.
	"""
	csv_text, safe_stem, _row_count = build_page_panel_csv_text(page_panel)
	frappe.local.response.filename = f"{safe_stem}.csv"
	frappe.local.response.filecontent = csv_text
	frappe.local.response.type = "download"
