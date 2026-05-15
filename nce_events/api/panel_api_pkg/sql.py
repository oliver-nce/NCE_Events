from __future__ import annotations

from typing import Any

import frappe

from nce_events.api.panel_api_pkg._helpers import _title_case
from nce_events.api.panel_api_pkg.core_filters import _build_core_filter_where


def _build_panel_sql(root_doctype: str, filters: dict | None = None) -> tuple[str, list[Any]]:
	"""Build the main SELECT [LEFT JOIN...] SQL for a panel, without executing it.

	Returns (sql, params) tuple. Used by build_panel_sql (to save + display)
	and by get_panel_data (to execute). filters is only used for the WHERE
	clause when a drill-down parent filter is active.
	"""
	from nce_events.api.panel_api_pkg.panel_data import get_panel_config

	config = get_panel_config(root_doctype)
	display_fields: list[str] = config["column_order"] or []
	fetch_only: list[str] = list(config.get("fetch_only_fields") or [])
	all_fields: list[str] = list(display_fields)
	for fn in fetch_only:
		if fn not in all_fields:
			all_fields.append(fn)
	for fn in (config.get("search_fields") or []):
		if fn not in all_fields:
			all_fields.append(fn)
	if not all_fields:
		all_fields = ["name"]

	computed_names = {cc["field_name"] for cc in (config.get("computed_columns") or [])}
	related_names = {fn for fn in all_fields if fn.startswith("_related_")}
	simple_fields = [
		fn for fn in all_fields if "." not in fn and fn not in computed_names and fn not in related_names
	]
	linked_fields = [fn for fn in all_fields if "." in fn]

	link_bases = {fn.split(".", 1)[0] for fn in linked_fields}
	for lf in link_bases:
		if lf not in simple_fields:
			simple_fields.append(lf)

	order_by = (config.get("order_by") or "").strip() or "name ASC"

	grouped: dict[str, list[str]] = {}
	for fn in linked_fields:
		lf, cf = fn.split(".", 1)
		grouped.setdefault(lf, []).append(cf)

	meta = frappe.get_meta(root_doctype)
	link_targets: dict[str, str] = {}
	for field in meta.fields:
		if field.fieldtype == "Link" and field.fieldname in grouped:
			link_targets[field.fieldname] = field.options

	root_table = f"`tab{root_doctype}`"
	order_parts = order_by.split()
	qualified_order = (
		order_by
		if ("." in order_by or "`" in order_by)
		else f"{root_table}.`{order_parts[0]}` {' '.join(order_parts[1:])}"
	).strip()

	# WHERE clause from filters (drill-down only — not inlined into the stored SQL)
	where_parts: list[str] = []
	params: list[Any] = []
	for key, val in (filters or {}).items():
		if isinstance(val, list) and len(val) == 2:
			op, operand = val
			if op.lower() == "in" and isinstance(operand, list | tuple):
				placeholders = ", ".join(["%s"] * len(operand))
				where_parts.append(f"{root_table}.`{key}` IN ({placeholders})")
				params.extend(operand)
			else:
				where_parts.append(f"{root_table}.`{key}` {op} %s")
				params.append(operand)
		else:
			where_parts.append(f"{root_table}.`{key}` = %s")
			params.append(val)
	where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""

	if linked_fields:
		select_parts: list[str] = [f"{root_table}.`{f}`" for f in simple_fields]
		join_clauses: list[str] = []
		seen_joins: set[str] = set()
		for lf, cfs in grouped.items():
			target_dt = link_targets.get(lf)
			if not target_dt:
				continue
			target_table = f"`tab{target_dt}`"
			if lf not in seen_joins:
				join_clauses.append(
					f"LEFT JOIN {target_table} ON {root_table}.`{lf}` = {target_table}.`name`"
				)
				seen_joins.add(lf)
			for cf in cfs:
				select_parts.append(f"{target_table}.`{cf}` AS `{lf}.{cf}`")

		sql = (
			f"SELECT {', '.join(select_parts)} "
			f"FROM {root_table} "
			f"{' '.join(join_clauses)} "
			f"{where_sql} "
			f"ORDER BY {qualified_order}"
		).strip()
	else:
		select_parts = [f"{root_table}.`{f}`" for f in simple_fields]
		sql = (
			f"SELECT {', '.join(select_parts)} FROM {root_table} {where_sql} ORDER BY {qualified_order}"
		).strip()

	return sql, params


@frappe.whitelist()
def build_panel_sql(root_doctype: str) -> str:
	"""Generate, save, and return the panel SQL for inspection.

	Called from the Query tab in the Page Panel form.
	Saves the result into panel_sql so get_panel_data can reuse it.
	"""
	sql, _ = _build_panel_sql(root_doctype)
	if frappe.db.exists("Page Panel", root_doctype):
		frappe.db.set_value("Page Panel", root_doctype, "panel_sql", sql)
		frappe.db.commit()
	return sql


@frappe.whitelist()
def save_panel_sql(root_doctype: str, core_filter: str = "", order_by: str = "") -> dict[str, bool]:
	"""Persist core filter and order_by SQL on a Page Panel record."""
	core_filter = (core_filter or "").strip()
	order_by = (order_by or "").strip()

	if not frappe.db.exists("Page Panel", root_doctype):
		doc = frappe.new_doc("Page Panel")
		doc.root_doctype = root_doctype
		doc.core_filter = core_filter
		doc.order_by = order_by
		doc.insert(ignore_permissions=True)
	else:
		frappe.db.set_value(
			"Page Panel",
			root_doctype,
			{
				"core_filter": core_filter,
				"order_by": order_by,
			},
		)

	frappe.db.commit()
	return {"ok": True}
