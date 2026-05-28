from __future__ import annotations

import json
import re
from typing import Any

import frappe

from nce_events.api.panel_api_pkg._helpers import _title_case


def _build_core_filter_where(
	root_doctype: str,
	filters: dict | None,
	core_filter: str,
) -> tuple[str, list]:
	"""Build WHERE clause and params for queries with a raw core_filter."""
	where_parts = [f"({core_filter})"]
	params: list[Any] = []
	for key, val in (filters or {}).items():
		if isinstance(val, list) and len(val) == 2:
			op, operand = val
			if op.lower() == "in" and isinstance(operand, list | tuple):
				placeholders = ", ".join(["%s"] * len(operand))
				where_parts.append(f"`{key}` IN ({placeholders})")
				params.extend(operand)
			else:
				where_parts.append(f"`{key}` {op} %s")
				params.append(operand)
		else:
			where_parts.append(f"`{key}` = %s")
			params.append(val)
	return " AND ".join(where_parts), params


def _count_with_core_filter(root_doctype: str, filters: dict, core_filter: str) -> int:
	table = f"`tab{root_doctype}`"
	where_sql, params = _build_core_filter_where(root_doctype, filters, core_filter)
	result = frappe.db.sql(f"SELECT COUNT(*) FROM {table} WHERE {where_sql}", params)
	return result[0][0] if result else 0


def _query_with_core_filter(
	root_doctype: str,
	fields: list[str],
	filters: dict,
	core_filter: str,
	order_by: str = "name ASC",
	limit: int = 0,
	start: int = 0,
) -> list[dict]:
	"""Run a panel query using frappe.db.sql so we can inject a raw WHERE clause."""
	table = f"`tab{root_doctype}`"
	fields_sql = ", ".join(f"`{f}`" for f in fields)
	where_sql, params = _build_core_filter_where(root_doctype, filters, core_filter)

	query = f"SELECT {fields_sql} FROM {table} WHERE {where_sql} ORDER BY {order_by}"
	if limit:
		query += f" LIMIT {int(limit)} OFFSET {int(start)}"
	return frappe.db.sql(query, params, as_dict=True)


def _ensure_tab_prefix(sql: str) -> str:
	"""Prepend 'tab' to bare table names in a query.

	Tables named after FROM/JOIN are prefixed (Event -> tabEvent,
	`Event Registration` -> `tabEvent Registration`), and qualified references to
	those same tables elsewhere (SELECT / ON / WHERE) are rewritten to match
	(e.g. ``Venues.state`` -> ``tabVenues.state``).

	Already-prefixed names (tabEvent) and table aliases are left unchanged.
	"""
	prefixed: list[str] = []

	def repl(m: re.Match[str]) -> str:
		kw, ident = m.group(1), m.group(2)
		if ident.startswith("`"):
			ident = ident[1:-1]
		if ident.lower().startswith("tab"):
			return m.group(0)
		prefixed.append(ident)
		tab_name = "tab" + ident
		if " " in ident or "-" in ident:
			tab_name = f"`{tab_name}`"
		return f"{kw} {tab_name}"

	pattern = r"\b(FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN)\s+(`[^`]+`|\w+)"
	out = re.sub(pattern, repl, sql, flags=re.IGNORECASE)

	# Rewrite qualified references to the same tables (Venues.state -> tabVenues.state).
	# Only touch tables we just prefixed; aliases (e.g. `FROM Events e` ... `e.state`)
	# use the alias rather than the table name, so they are unaffected.
	for ident in prefixed:
		tab_name = "tab" + ident
		if " " in ident or "-" in ident:
			# Backticked reference: `Event Registration`. -> `tabEvent Registration`.
			out = re.sub(
				r"`" + re.escape(ident) + r"`(\s*\.)",
				lambda m: f"`{tab_name}`{m.group(1)}",
				out,
			)
		else:
			# Bare reference: Venues. -> tabVenues. (word-bounded, qualified only)
			out = re.sub(
				r"\b" + re.escape(ident) + r"(\s*\.)",
				lambda m, tn=tab_name: f"{tn}{m.group(1)}",
				out,
			)
	return out


def _apply_user_filters(
	rows: list[dict[str, Any]],
	user_filters: list[dict[str, Any]],
) -> list[dict[str, Any]]:
	"""Filter rows by user filter conditions (field, op, value).

	Supports =, !=, >, <, like, in. Works on both DB and computed columns.
	"""
	if not user_filters:
		return rows
	active = [c for c in user_filters if c.get("field") and str(c.get("value", "")) != ""]
	if not active:
		return rows

	def _cell_str(val: Any) -> str:
		if val is None:
			return ""
		if isinstance(val, dict | list):
			return json.dumps(val)
		return str(val)

	def _matches(row: dict[str, Any], c: dict[str, Any]) -> bool:
		field = c.get("field", "")
		op = (c.get("op") or "=").strip()
		val = c.get("value", "")
		cell = _cell_str(row.get(field))
		try:
			if op == "=":
				return cell == val
			if op == "!=":
				return cell != val
			if op == ">":
				return float(cell or 0) > float(val or 0)
			if op == "<":
				return float(cell or 0) < float(val or 0)
			if op == "like":
				return val.lower() in cell.lower()
			if op == "in":
				vals = [v.strip() for v in val.split(",") if v.strip()]
				return cell in vals
		except (ValueError, TypeError):
			return False
		return True

	return [r for r in rows if all(_matches(r, c) for c in active)]
