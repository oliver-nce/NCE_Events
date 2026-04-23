"""Read ``WP Tables`` ``column_mapping`` JSON — generic; no DocType-specific behaviour."""

from __future__ import annotations

import json
from typing import Any

import frappe


def get_wp_tables_column_mapping(frappe_doctype: str) -> dict[str, Any]:
	"""
	Return parsed ``column_mapping`` for the first ``WP Tables`` row matching ``frappe_doctype``.

	Keys are source/WP column keys; values are either a string (legacy Frappe fieldname)
	or a dict with at least ``fieldname`` and optional ``is_derived``, ``sql_expression``, etc.
	"""
	dt = (frappe_doctype or "").strip()
	if not dt:
		return {}

	rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": dt},
		fields=["name", "column_mapping"],
		limit=1,
	)
	if not rows:
		return {}
	raw = rows[0].get("column_mapping")
	if not raw:
		return {}
	try:
		col_map = json.loads(raw) if isinstance(raw, str) else raw
	except Exception:
		return {}
	return col_map if isinstance(col_map, dict) else {}


@frappe.whitelist()
def get_wp_tables_column_mapping_api(frappe_doctype: str) -> dict[str, Any]:
	"""Whitelisted read of ``column_mapping`` for client-side composition (e.g. Form Dialog)."""
	return get_wp_tables_column_mapping(frappe_doctype)


def derived_sql_specs_from_column_mapping(column_mapping: dict[str, Any]) -> list[dict[str, str]]:
	"""
	Pure helper: extract ``[{fieldname, sql_expression}, ...]`` from a ``column_mapping`` dict.

	Includes only entries with ``is_derived`` truthy and non-empty ``sql_expression`` / ``fieldname``.
	Entries with ``sql_expression`` null/empty (e.g. no ``GENERATION_EXPRESSION`` in I_S) are skipped —
	compatible with **nce_sync** mirror / regenerate column mapping, which sets ``is_derived`` and
	Frappe-fieldname ``sql_expression`` for generated columns. ``is_virtual`` is ignored here.
	"""
	specs: list[dict[str, str]] = []
	for _wp_col, col_info in column_mapping.items():
		if not isinstance(col_info, dict):
			continue
		if not col_info.get("is_derived"):
			continue
		expr = (col_info.get("sql_expression") or "").strip()
		fn = (col_info.get("fieldname") or "").strip()
		if not expr or not fn:
			continue
		specs.append({"fieldname": fn, "sql_expression": expr})
	return specs


def get_derived_sql_specs(frappe_doctype: str) -> list[dict[str, str]]:
	"""
	Return ``[{fieldname, sql_expression}, ...]`` for derived columns on the
	``WP Tables`` row matching ``frappe_doctype`` (same filter as full mapping).
	"""
	cm = get_wp_tables_column_mapping(frappe_doctype)
	if not cm:
		return []
	return derived_sql_specs_from_column_mapping(cm)


@frappe.whitelist()
def get_derived_sql_specs_api(frappe_doctype: str) -> list[dict[str, str]]:
	"""Whitelisted: derived SQL specs only — for client scripts without duplicating mapping parse logic."""
	return get_derived_sql_specs(frappe_doctype)
