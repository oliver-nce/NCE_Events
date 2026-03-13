from __future__ import annotations

import frappe
from frappe.model.document import Document


class CardDefinition(Document):
	def after_insert(self):
		if not self.tabs:
			self.append("tabs", {"label": "Home", "sort_order": 0, "hide_bar": 1})
			self.save()
