"""Frappe Document subclass for the Card Field child-table DocType.

code-index:begin
{
 "purpose": "Frappe Document subclass for the Card Field child-table DocType.",
 "read_when": "Adding server-side hooks or validation to Card Field rows.",
 "gotchas": [],
 "keywords": ["CardField", "Document", "frappe", "card_field", "__future__"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations
from frappe.model.document import Document


class CardField(Document):
	pass
