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
