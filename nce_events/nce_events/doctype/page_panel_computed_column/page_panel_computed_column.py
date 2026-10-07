"""Page Panel Computed Column Document with validation for computed SQL column definitions.

code-index:begin
{
 "purpose": "Page Panel Computed Column Document with validation for computed SQL column definitions.",
 "read_when": "Adding validation or hooks for computed column rows on Page Panel.",
 "gotchas": [],
 "keywords": ["PagePanelComputedColumn", "Document", "frappe", "page_panel_computed_column", "validate"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe
from frappe.model.document import Document


def _title_case(fieldname: str) -> str:
	"""Convert field_name to title case (e.g. days_duration -> Days Duration)."""
	return fieldname.replace("_", " ").title()


class PagePanelComputedColumn(Document):
	def before_save(self) -> None:
		if self.field_name and not self.label:
			self.label = _title_case(self.field_name)
