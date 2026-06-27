from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import cint

from nce_events.api.panel_api_pkg._helpers import (
	_auto_detect_contact_fields,
	_get_link_fields_with_target,
	_title_case,
)
from nce_events.api.panel_api_pkg.computed_columns import (
	_evaluate_computed_columns,
)
from nce_events.api.panel_api_pkg.discovery import get_child_doctypes
from nce_events.api.panel_api_pkg.page_panel_lookup import (
	get_page_panel_doc_for_root,
	page_panel_docname_for_root,
	page_panel_exists_for_root,
)
from nce_events.api.panel_api_pkg.panel_config import (
	FEMALE_HEX,
	MALE_HEX,
	_derived_order_clause,
	_panel_config_from_doc,
)
from nce_events.api.panel_api_pkg.panel_export import export_panel_data_impl
from nce_events.api.panel_api_pkg.sql import _build_panel_sql
from nce_events.api.panel_api_pkg.theme_slug import resolve_theme_slug

_SKIP_FIELDTYPES: frozenset[str] = frozenset(
	{
		"Section Break",
		"Column Break",
		"Tab Break",
		"HTML",
		"Fold",
		"Heading",
		"Button",
		"Table",
		"Table MultiSelect",
	}
)

_SKIP_FIELDNAMES: frozenset[str] = frozenset(
	{
		"owner",
		"creation",
		"modified",
		"modified_by",
		"docstatus",
		"idx",
		"parent",
		"parentfield",
		"parenttype",
	}
)

_COLOUR_COPY_FIELDS: tuple[str, ...] = (
	"theme",
	"frame_bg_class",
	"frame_fg_type",
	"header_bg_class",
	"header_fg_type",
	"header_toolbar_bg_class",
	"header_toolbar_fg_type",
	"footer_bg_class",
	"footer_fg_type",
	"col_header_bg_class",
	"col_header_fg_type",
	"filter_bar_bg_class",
	"filter_bar_fg_type",
	"row_bg_class",
	"row_fg_type",
	"row_alt_bg_class",
	"row_alt_fg_type",
	"dialog_header_bg_class",
	"dialog_header_fg_type",
	"frame_border_class",
	"frame_border_color_class",
	"filter_divider_class",
	"filter_divider_color_class",
	"col_header_line_class",
	"col_header_line_color_class",
	"row_divider_class",
	"row_divider_color_class",
	"col_divider_class",
	"col_divider_color_class",
)


@frappe.whitelist()
def get_panel_config(root_doctype: str) -> dict[str, Any]:
	"""Fetch display configuration for a single Page Panel."""
	if not page_panel_exists_for_root(root_doctype):
		auto_email, auto_sms = _auto_detect_contact_fields(root_doctype)
		return {
			"root_doctype": root_doctype,
			"header_text": root_doctype,
			"default_filters": [],
			"order_by": "",
			"column_order": [],
			"bold_fields": [],
			"gender_column": "",
			"gender_color_fields": [],
			"title_field": "",
			"required_fields": [],
			"read_only_fields": [],
			"search_fields": [],
			"search_only_columns": [],
			"effective_searchable": [],
			"tint_by_gender": {},
			"format_rules": [],
			"computed_columns": [],
			"show_filter": 1,
			"show_sheets": 1,
			"show_email": 1,
			"show_sms": 1,
			"email_field": auto_email,
			"sms_field": auto_sms,
			"show_wp_switch": 0,
			"wp_family_id_field": "",
			"show_card_email": 0,
			"show_card_sms": 0,
			"open_card_on_click": 0,
			"allow_new_record_creation": 0,
			"form_dialog": None,
			"theme_slug": resolve_theme_slug(None),
			"frame_bg_class": "",
			"frame_fg_type": "mono",
			"header_bg_class": "",
			"header_fg_type": "mono",
			"header_toolbar_bg_class": "",
			"header_toolbar_fg_type": "mono",
			"footer_bg_class": "",
			"footer_fg_type": "mono",
			"col_header_bg_class": "",
			"col_header_fg_type": "mono",
			"filter_bar_bg_class": "",
			"filter_bar_fg_type": "mono",
			"row_bg_class": "",
			"row_fg_type": "mono",
			"row_alt_bg_class": "",
			"row_alt_fg_type": "mono",
			"dialog_header_bg_class": "",
			"dialog_header_fg_type": "mono",
			"male_hex": MALE_HEX,
			"female_hex": FEMALE_HEX,
		}

	doc = get_page_panel_doc_for_root(root_doctype)
	return _panel_config_from_doc(doc)


@frappe.whitelist()
def get_panel_data(
	root_doctype: str,
	filters: str | dict | None = None,
	limit: int | str = 0,
	start: int | str = 0,
	user_filters: str | list | None = None,
) -> dict[str, Any]:
	"""Fetch rows from a DocType.

	filters is a JSON dict of {fieldname: value} applied to frappe.get_all.
	Supports dot-notation fields (e.g. "link_field.child_field") which are
	resolved via frappe.get_all's native dot-field support.

	user_filters, limit, and start are accepted but ignored — filtering and
	pagination are handled client-side on the full dataset.

	Returns the full dataset with core_filter applied server-side for initial
	security, and the raw unfiltered count (full_count) for UI denominators.
	"""
	if isinstance(filters, str):
		filters = json.loads(filters) if filters else {}
	filters = filters or {}
	# user_filters, limit, start are ignored for V2 in-memory filtering
	limit = cint(limit)
	start = cint(start)

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

	# Unfiltered count of the entire doctype — used as the denominator in the UI
	full_count = frappe.db.count(root_doctype)

	# V2: always fetch all rows — core_filter is sent to the client and applied in JS
	total_count = frappe.db.count(root_doctype, filters=filters)

	# panel_sql is always kept current by PagePanel.after_save.
	# get_panel_data reads it but never writes it.
	# When a drill-down filter is active, always rebuild (filter changes the WHERE).
	parsed_filters: dict[str, Any] = filters if isinstance(filters, dict) else {}
	stored_sql: str = ""
	pp_name = page_panel_docname_for_root(root_doctype)
	if not parsed_filters and pp_name:
		stored_sql = (frappe.db.get_value("Page Panel", pp_name, "panel_sql") or "").strip()

	if stored_sql:
		base_sql, base_params = stored_sql, []
	else:
		base_sql, base_params = _build_panel_sql(
			root_doctype, filters=parsed_filters, config=config
		)

	# Conditional formatting: fold a `_fmt_<field>` flag (1/0) per rule into the
	# single data fetch by wrapping panel_sql as a derived table. The flag value
	# rides along in the cached row data, so the client just reads `row._fmt_*` at
	# render (like gender tinting) — no second query, no render-time SQL. Flags
	# are computed fresh on every fetch, so they can never go stale, and panel_sql
	# itself stays data-only.
	fmt_rules = config.get("format_rules") or []
	if fmt_rules:
		from nce_events.api.panel_api_pkg.format_rules import build_format_case_columns

		allowed_fields = {
			str(f).strip().lower()
			for f in (list(display_fields) + list(config.get("search_fields") or []))
			if str(f).strip()
		}
		case_cols = build_format_case_columns(root_doctype, fmt_rules, allowed_fields=allowed_fields)
		if case_cols:
			# Re-apply ordering on the wrapper: MariaDB may drop a derived table's
			# inner ORDER BY (no LIMIT), and the client preserves server order when
			# no column sort is active.
			order_clause = _derived_order_clause(config, display_fields)
			base_sql = (
				f"SELECT pp_rows.*, {', '.join(case_cols)} FROM ({base_sql}) AS pp_rows{order_clause}"
			)

	rows = frappe.db.sql(base_sql, base_params, as_dict=True)

	child_doctypes = get_child_doctypes(root_doctype)
	related_label_map: dict[str, str] = {f"_related_{c['doctype']}": c["label"] for c in child_doctypes}
	related_meta: dict[str, dict[str, str]] = {
		f"_related_{c['doctype']}": {"doctype": c["doctype"], "link_field": c["link_field"]}
		for c in child_doctypes
	}

	computed_label_map = {
		cc["field_name"]: (cc.get("label") or _title_case(cc["field_name"]))
		for cc in (config.get("computed_columns") or [])
	}
	enabled_related: set[str] = {fn for fn in display_fields if fn in related_label_map}

	link_target_map: dict[str, str] = {
		lf["fieldname"]: lf["options"] for lf in _get_link_fields_with_target(root_doctype)
	}

	# Build fieldtype + label maps from meta for filter widget and column headers
	_fieldtype_map: dict[str, str] = {}
	_meta_label_map: dict[str, str] = {"name": "ID"}
	try:
		_meta = frappe.get_meta(root_doctype)
		for _f in _meta.fields:
			if _f.fieldname:
				_fieldtype_map[_f.fieldname] = _f.fieldtype or ""
				_meta_label_map[_f.fieldname] = _f.label or _title_case(_f.fieldname)
	except Exception:
		pass

	seen: set[str] = set()
	columns: list[dict[str, str]] = []
	for fn in display_fields:
		if fn in seen or fn in related_label_map:
			continue
		seen.add(fn)
		if fn in computed_label_map:
			label = computed_label_map[fn]
			col: dict[str, Any] = {"fieldname": fn, "label": label}
		else:
			bare = fn.split(".")[-1] if "." in fn else fn
			label = _meta_label_map.get(fn) or _title_case(bare)
			col = {"fieldname": fn, "label": label}
		if fn in link_target_map:
			col["is_link"] = True
			col["link_doctype"] = link_target_map[fn]
		ft = _fieldtype_map.get(fn, "")
		if ft:
			col["fieldtype"] = ft
		columns.append(col)

	for fn, target_dt in link_target_map.items():
		if fn not in seen:
			seen.add(fn)
			columns.append(
				{
					"fieldname": fn,
					"label": _title_case(fn),
					"is_link": True,
					"link_doctype": target_dt,
				}
			)

	for fn in enabled_related:
		seen.add(fn)
		meta = related_meta.get(fn, {})
		columns.append(
			{
				"fieldname": fn,
				"label": related_label_map[fn],
				"is_related_link": True,
				"related_doctype": meta.get("doctype", ""),
				"related_link_field": meta.get("link_field", ""),
			}
		)

	if child_doctypes and rows:
		for child in child_doctypes:
			child_meta = frappe.get_meta(child["doctype"])
			if child_meta.issingle or getattr(child_meta, "is_virtual", 0):
				continue
			# Full GROUP BY scan — no IN clause, DB uses index on link_field
			child_table = f"`tab{child['doctype']}`"
			link_col = child["link_field"]
			count_data = frappe.db.sql(
				f"SELECT `{link_col}`, COUNT(`name`) AS cnt FROM {child_table} GROUP BY `{link_col}`",
				as_dict=True,
			)
			count_map = {r[link_col]: r["cnt"] for r in count_data}
			count_key = "_count_" + child["doctype"]
			for row in rows:
				row[count_key] = count_map.get(row["name"], 0)

	for fn, label in related_label_map.items():
		if fn in seen:
			for row in rows:
				row[fn] = label

	computed_columns = config.get("computed_columns") or []
	if computed_columns and rows:
		_evaluate_computed_columns(root_doctype, rows, computed_columns)

	return {
		"columns": columns,
		"rows": rows,
		"total": total_count,
		"full_count": full_count,
		"child_doctypes": child_doctypes,
		"default_filters": config.get("default_filters") or [],
	}


@frappe.whitelist()
def get_other_page_panels(current_panel: str) -> list[dict[str, str]]:
	"""Return all Page Panels except the current one, with name and theme."""
	rows = frappe.get_all(
		"Page Panel",
		fields=["name", "theme"],
		filters=[["name", "!=", current_panel]],
		order_by="name asc",
	)
	return [{"name": r["name"], "theme": (r.get("theme") or "").strip()} for r in rows]


@frappe.whitelist()
def get_theme_slug_for_link(theme_link: str | None = None) -> str | None:
	"""Resolve Page Panel theme Link (or empty) to Active slug — shared by runtime and Desk previews."""
	return resolve_theme_slug(theme_link)


@frappe.whitelist()
def copy_panel_colours(source_name: str, target_names: str | list) -> dict[str, Any]:
	"""Copy all colour fields from source Page Panel to one or more target panels."""
	if isinstance(target_names, str):
		import json as _json
		target_names = _json.loads(target_names) if target_names.startswith("[") else [target_names]

	source = frappe.get_doc("Page Panel", source_name)
	updated: list[str] = []
	for target_name in target_names:
		target = frappe.get_doc("Page Panel", target_name)
		for field in _COLOUR_COPY_FIELDS:
			target.set(field, getattr(source, field, None) or "")
		target.save(ignore_permissions=False)
		updated.append(target_name)
	return {"updated": updated}


@frappe.whitelist()
def export_panel_data(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	filtered_row_names: str | list | None = None,
) -> dict[str, Any]:
	"""Export a panel's current data as CSV to a public path and return its URL."""
	return export_panel_data_impl(
		root_doctype,
		filters=filters,
		user_filters=user_filters,
		filtered_row_names=filtered_row_names,
	)
