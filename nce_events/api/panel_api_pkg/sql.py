from __future__ import annotations

from typing import Any

import frappe

from nce_events.api.panel_api_pkg.page_panel_lookup import (
	generate_auto_page_panel_name,
	get_page_panel_doc_for_root,
	page_panel_docname_for_root,
)


def _build_panel_sql(
	root_doctype: str,
	filters: dict | None = None,
	config: dict | None = None,
) -> tuple[str, list[Any]]:
	"""Build the main SELECT [LEFT JOIN...] SQL for a panel, without executing it.

	Returns (sql, params) tuple. Used by build_panel_sql (to save + display)
	and by get_panel_data (to execute). filters is only used for the WHERE
	clause when a drill-down parent filter is active.

	When ``config`` is supplied (e.g. from the Page Panel doc being saved), it is
	used directly instead of re-loading config from the database.
	"""
	from nce_events.api.panel_api_pkg.panel_data import get_panel_config

	if config is None:
		config = get_panel_config(root_doctype)
	display_fields: list[str] = config["column_order"] or []
	search_fields: list[str] = list(config.get("search_fields") or [])
	fetch_only: list[str] = list(config.get("fetch_only_fields") or [])
	gender_column = (config.get("gender_column") or "").strip()
	display_set = set(display_fields)
	search_set = set(search_fields)
	all_fields: list[str] = list(display_fields)
	for fn in fetch_only:
		if fn in all_fields:
			continue
		# Related-table columns require an explicit Display / Search / Gender Column choice.
		if "." in fn and fn not in display_set and fn not in search_set and fn != gender_column:
			continue
		all_fields.append(fn)
	for fn in search_fields:
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

	# Conditional formatting flags are NOT part of panel_sql. At fetch time
	# get_panel_data wraps this query as `( panel_sql ) AS rows` and appends one
	# `_fmt_<field>` CASE column per rule (see format_rules.build_format_case_columns),
	# so the cached panel_sql stays data-only and flags can never go stale.
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


def build_panel_sql_for_doc(doc: Any) -> str:
	"""Generate and persist panel SQL from a Page Panel doc (uses in-memory field values)."""
	from nce_events.api.panel_api_pkg.panel_data import _panel_config_from_doc

	root_doctype = (getattr(doc, "root_doctype", None) or "").strip()
	if not root_doctype or not getattr(doc, "name", None):
		return ""
	config = _panel_config_from_doc(doc)
	sql, _ = _build_panel_sql(root_doctype, config=config)
	frappe.db.set_value("Page Panel", doc.name, "panel_sql", sql, update_modified=False)
	return sql


@frappe.whitelist()
def build_panel_sql(
	root_doctype: str,
	column_order: str | None = None,
	search_fields: str | None = None,
	gender_column: str | None = None,
) -> str:
	"""Generate, save, and return the panel SQL for inspection.

	Called from the Query tab Refresh button on the Page Panel form.
	Saves the result into panel_sql so get_panel_data can reuse it.

	Optional ``column_order`` / ``search_fields`` / ``gender_column`` (comma-delimited
	for the lists) apply the current Desk form values before building — used when
	Refresh is clicked without a prior Save.
	"""
	doc = get_page_panel_doc_for_root(root_doctype)
	if not doc:
		return ""
	if column_order is not None:
		doc.column_order = column_order
	if search_fields is not None:
		doc.search_fields = search_fields
	if gender_column is not None:
		doc.gender_column = gender_column
	return build_panel_sql_for_doc(doc)


@frappe.whitelist()
def save_panel_sql(root_doctype: str, core_filter: str = "", order_by: str = "") -> dict[str, bool]:
	"""Persist order_by on a Page Panel record.

	core_filter is accepted for API compatibility; filters live on ``default_filters``.
	"""
	_ = (core_filter or "").strip()
	order_by = (order_by or "").strip()

	pp_name = page_panel_docname_for_root(root_doctype)
	if not pp_name:
		doc = frappe.new_doc("Page Panel")
		doc.name = generate_auto_page_panel_name(root_doctype)
		doc.root_doctype = root_doctype
		doc.order_by = order_by
		doc.insert(ignore_permissions=True)
	else:
		frappe.db.set_value(
			"Page Panel",
			pp_name,
			{
				"order_by": order_by,
			},
		)

	frappe.db.commit()
	return {"ok": True}
