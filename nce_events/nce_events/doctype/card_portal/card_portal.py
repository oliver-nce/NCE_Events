"""Frappe Document subclass for the Card Portal child-table DocType.

code-index:begin
{
 "purpose": "Frappe Document subclass for the Card Portal child-table DocType.",
 "read_when": "Adding server-side hooks or validation to Card Portal rows.",
 "gotchas": [],
 "keywords": ["CardPortal", "Document", "frappe", "card_portal", "__future__"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations
from frappe.model.document import Document


class CardPortal(Document):
	pass
