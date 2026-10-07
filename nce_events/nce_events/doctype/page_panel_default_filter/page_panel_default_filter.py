"""Frappe Document subclass for Page Panel Default Filter child-table rows.

code-index:begin
{
 "purpose": "Frappe Document subclass for Page Panel Default Filter child-table rows.",
 "read_when": "Adding server-side hooks for default filter rows on Page Panel.",
 "gotchas": [],
 "keywords": ["PagePanelDefaultFilter", "Document", "frappe", "page_panel_default_filter"],
 "format": 1
}
code-index:end
"""

# Copyright (c) 2026, NCE and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.model.document import Document


class PagePanelDefaultFilter(Document):
	pass
