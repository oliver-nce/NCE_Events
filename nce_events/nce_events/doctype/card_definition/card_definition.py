"""Card Definition Document controller; seeds a default Home tab on insert when tabs is empty.

code-index:begin
{
 "purpose": "Card Definition Document controller; seeds a default Home tab on insert when tabs is empty.",
 "read_when": "Changing default tab creation or Card Definition after_insert behaviour.",
 "gotchas": [],
 "keywords": ["CardDefinition", "after_insert", "tabs", "Home", "sort_order", "hide_bar", "Document"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe
from frappe.model.document import Document


class CardDefinition(Document):
	def after_insert(self):
		if not self.tabs:
			self.append("tabs", {"label": "Home", "sort_order": 0, "hide_bar": 1})
			self.save()
