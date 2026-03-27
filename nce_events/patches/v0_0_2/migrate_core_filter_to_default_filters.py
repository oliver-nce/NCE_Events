from __future__ import annotations

import re

import frappe


def execute():
	"""Migrate Page Panel core_filter strings to default_filters child table rows."""

	if not frappe.db.table_exists("tabPage Panel"):
		return

	# Read all panels that have a core_filter value
	panels = frappe.db.get_all(
		"Page Panel",
		filters=[["core_filter", "!=", ""]],
		fields=["name", "core_filter"],
	)

	if not panels:
		return

	for panel in panels:
		raw = (panel.core_filter or "").strip()
		if not raw:
			continue

		parsed = _parse_core_filter(raw)
		if not parsed:
			frappe.logger().warning(
				f"migrate_core_filter: could not parse core_filter for {panel.name!r}: {raw!r}"
			)
			continue

		doc = frappe.get_doc("Page Panel", panel.name)

		# Skip if default_filters already has rows (don't overwrite manual entries)
		if doc.default_filters:
			continue

		for row in parsed:
			doc.append("default_filters", row)

		doc.core_filter = ""
		doc.save(ignore_permissions=True)
		frappe.logger().info(f"migrate_core_filter: migrated {len(parsed)} filter(s) for {panel.name!r}")

	frappe.db.commit()


# ── Simple core_filter parser ──────────────────────────────────────────────────
# Supports AND-joined clauses of the form: field op value
# Operators: = != > < >= <= like in
# Values may be single-quoted literals or bare words/numbers.
# SQL date functions are NOT resolved here — they are stored as-is so the
# panel editor shows the original intent to the user.

_OPS = [">=", "<=", "!=", ">", "<", "=", "like", "in"]


def _parse_core_filter(s: str) -> list[dict]:
	clauses = re.split(r"\bAND\b", s, flags=re.IGNORECASE)
	results = []

	for clause in clauses:
		clause = clause.strip()
		if not clause:
			continue

		row = _parse_clause(clause)
		if row:
			results.append(row)

	return results


def _parse_clause(s: str) -> dict | None:
	for op in _OPS:
		# Build a regex: ^(\w+)\s*OP\s*(.+)$
		if op in ("like", "in"):
			op_re = rf"\b{op}\b"
		else:
			op_re = re.escape(op)

		m = re.match(rf"^([\w.]+)\s*{op_re}\s*(.+)$", s, re.IGNORECASE)
		if m:
			field = m.group(1).strip()
			raw_val = m.group(2).strip()
			value = _unquote(raw_val)
			return {"field": field, "op": op, "value": value}

	return None


def _unquote(s: str) -> str:
	if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
		return s[1:-1]
	return s
