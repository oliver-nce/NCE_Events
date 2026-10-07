"""Remove obsolete Messaging Configuration, Field Tag, Neutral Tag DocTypes.

Tag Finder replaces Messaging Configuration. Pronoun tags are built-in.

code-index:begin
{
 "purpose": "Removes obsolete Messaging Configuration, Field Tag, and Neutral Tag DocTypes.",
 "read_when": "Understanding Tag Finder replacement of Messaging Configuration on upgrade.",
 "gotchas": [
  "Tag Finder replaces Messaging Configuration. Pronoun tags are built-in."
 ],
 "keywords": ["Messaging Configuration", "Field Tag", "Neutral Tag", "Tag Finder", "delete"],
 "format": 1
}
code-index:end
"""
from __future__ import annotations

import frappe


def execute() -> None:
	for name in ("Field Tag", "Neutral Tag", "Messaging Configuration"):
		if frappe.db.exists("DocType", name):
			try:
				frappe.delete_doc("DocType", name, force=True)
				frappe.db.commit()
			except Exception:
				frappe.db.rollback()
