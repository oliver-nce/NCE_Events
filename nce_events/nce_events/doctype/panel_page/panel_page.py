import frappe
from frappe import _
from frappe.model.document import Document


class PanelPage(Document):
	def validate(self):
		self._validate_panel_numbers()
		self._validate_buttons_require_card()

	def _validate_panel_numbers(self):
		seen = set()
		for row in self.panels:
			if row.panel_number in seen:
				frappe.throw(
					_("Duplicate panel number {0} in row {1}").format(row.panel_number, row.idx)
				)
			seen.add(row.panel_number)

	def _validate_buttons_require_card(self):
		for row in self.panels:
			has_buttons = row.button_1_name or row.button_2_name
			has_card = row.card_fields and row.card_fields.strip()
			if has_buttons and not has_card:
				frappe.throw(
					_("Panel {0}: buttons require at least one card field").format(row.panel_number)
				)
