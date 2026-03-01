import frappe
from frappe import _
from frappe.model.document import Document


class PageDefinition(Document):
	def validate(self):
		self._validate_panel_numbers()

	def _validate_panel_numbers(self):
		seen = set()
		for row in self.panels:
			if row.panel_number in seen:
				frappe.throw(
					_("Duplicate panel number {0} in row {1}").format(row.panel_number, row.idx)
				)
			seen.add(row.panel_number)
