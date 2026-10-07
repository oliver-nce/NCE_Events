"""Frappe Document subclass for the Card Script child-table DocType.

code-index:begin
{
 "purpose": "Frappe Document subclass for the Card Script child-table DocType.",
 "read_when": "Adding server-side hooks or validation to Card Script rows.",
 "gotchas": [],
 "keywords": ["CardScript", "Document", "frappe", "card_script", "__future__"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations
from frappe.model.document import Document


class CardScript(Document):
	pass
