"""Backfills scope=Both on existing Panel Action rows missing a scope value.

code-index:begin
{
 "purpose": "Backfills scope=Both on existing Panel Action rows missing a scope value.",
 "read_when": "Debugging Panel Action scope defaults after the scope field was added.",
 "gotchas": [],
 "keywords": ["Panel Action", "scope", "Both", "backfill", "idempotent"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe


def execute() -> None:
	"""Backfill scope=Both on existing Panel Action rows (idempotent)."""
	if not frappe.db.has_column("Panel Action", "scope"):
		return
	frappe.db.sql(
		"UPDATE `tabPanel Action` SET `scope` = 'Both' "
		"WHERE `scope` IS NULL OR `scope` = ''"
	)
