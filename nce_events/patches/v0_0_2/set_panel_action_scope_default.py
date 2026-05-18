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
