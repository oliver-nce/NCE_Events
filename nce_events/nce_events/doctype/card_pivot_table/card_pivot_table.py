"""Frappe Document subclass for the Card Pivot Table child-table DocType.

code-index:begin
{
 "purpose": "Frappe Document subclass for the Card Pivot Table child-table DocType.",
 "read_when": "Adding server-side hooks or validation to Card Pivot Table rows.",
 "gotchas": [],
 "keywords": ["CardPivotTable", "Document", "frappe", "card_pivot_table", "__future__"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations
from frappe.model.document import Document


class CardPivotTable(Document):
	pass
