"""Remove obsolete Messaging Configuration, Field Tag, Neutral Tag DocTypes.

Tag Finder replaces Messaging Configuration. Pronoun tags are built-in.
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
