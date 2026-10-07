"""SPA Page Definition Document: enforces unique doctype_source_mode per page slug.

code-index:begin
{
 "purpose": "SPA Page Definition Document: enforces unique doctype_source_mode per page slug.",
 "read_when": "Adding SPA page validation or duplicate doctype_source_mode checks.",
 "gotchas": [],
 "keywords": ["SPAPageDefinition", "page_slug", "doctype_source_mode", "validate", "SPA Page Definition"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cstr


class SPAPageDefinition(Document):
	def validate(self) -> None:
		if not self.page_slug:
			return
		if not cstr(self.doctype_source_mode).strip():
			return
		duplicate_mode = frappe.db.exists(
			"SPA Page Definition",
			{
				"doctype_source_mode": self.doctype_source_mode,
				"name": ["!=", self.name],
			},
		)
		if duplicate_mode:
			frappe.throw(
				_("DocType Source Mode {0} is already used by {1}.").format(
					self.doctype_source_mode,
					duplicate_mode,
				)
			)
