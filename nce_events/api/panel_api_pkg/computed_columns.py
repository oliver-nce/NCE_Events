from __future__ import annotations

import re
from typing import Any

import frappe

from nce_events.api.panel_api_pkg._helpers import _title_case
from nce_events.api.panel_api_pkg.core_filters import _ensure_tab_prefix


def _get_computed_columns(doc: Any) -> list[dict[str, Any]]:
	"""Extract unstored calculation fields from Page Panel as config list."""
	result: list[dict[str, Any]] = []
	for row in doc.unstored_calculation_fields or []:
		expr = (row.sql_expression or "").strip()
		if not expr:
			continue
		result.append(
			{
				"field_name": (row.field_name or "").strip(),
				"label": (row.label or "").strip() or _title_case(row.field_name or ""),
				"sql_expression": expr,
				"gender": (getattr(row, "gender", None) or "").strip() or None,
				"tint_by_row": bool(getattr(row, "tint_by_row", False)),
			}
		)
	return result


def _evaluate_computed_columns(
	root_doctype: str,
	rows: list[dict[str, Any]],
	computed_columns: list[dict[str, Any]],
) -> None:
	"""Evaluate each computed column's SQL per row and add result to row.

	SQL expression may use {fieldname} placeholders, replaced with row values.
	Result: 1 row -> object with column names as keys; N rows -> list of such objects.
	"""
	for row in rows:
		for cc in computed_columns:
			field_name = cc["field_name"]
			expr = cc["sql_expression"]
			try:
				value = _run_computed_sql(expr, row)
				row[field_name] = value
			except Exception as e:
				row[field_name] = {"_error": str(e)}


def _run_computed_sql(expr: str, row: dict[str, Any]) -> Any:
	"""Run SQL expression with {fieldname} substitution. Returns formatted result.

	Bare table names (e.g. Event) are auto-prefixed with 'tab' (tabEvent).
	Uses frappe.db.sql for execution.
	"""
	params: list[Any] = []
	for m in re.finditer(r"\{(\w+)\}", expr):
		val = row.get(m.group(1))
		if val is None:
			val = ""
		params.append(val)
	sql = re.sub(r"\{\w+\}", "%s", expr)
	sql = _ensure_tab_prefix(sql)

	results = frappe.db.sql(sql, params, as_dict=True)
	if not results:
		return None
	if len(results) == 1 and len(results[0]) == 1:
		return next(iter(results[0].values()))
	if len(results) == 1:
		return dict(results[0])
	return [dict(r) for r in results]
