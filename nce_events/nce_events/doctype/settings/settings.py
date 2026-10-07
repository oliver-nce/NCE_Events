"""Frappe Document subclass for the NCE Events Settings single DocType.

code-index:begin
{
 "purpose": "Frappe Document subclass for the NCE Events Settings single DocType.",
 "read_when": "Adding server-side hooks or validation to global NCE Events settings.",
 "gotchas": [],
 "keywords": ["Settings", "Document", "frappe", "settings"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe
from frappe.model.document import Document


class Settings(Document):
	pass
