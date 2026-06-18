"""Page Panel config dict construction and chrome/theme helpers."""

from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cint

from nce_events.api.panel_api_pkg._helpers import (
	_auto_detect_contact_fields,
	_get_gender_field_key,
	_get_link_fieldnames,
	_parse_csv,
	_title_case,
)
from nce_events.api.panel_api_pkg.computed_columns import _get_computed_columns
from nce_events.api.panel_api_pkg.theme_slug import resolve_theme_slug as _resolve_theme_slug

MALE_HEX: str = "#0000FF"
FEMALE_HEX: str = "#c700e6"


def _derived_order_clause(config: dict, display_fields: list[str]) -> str:
	"""Build an outer ``ORDER BY`` for the wrapped ``( panel_sql ) AS pp_rows`` query.

	Returns an empty string when the order column isn't selectable in the derived
	table (so we never error on an unknown column — we just fall back to the inner
	query's best-effort order).
	"""
	order_by = (config.get("order_by") or "").strip() or "name ASC"
	parts = order_by.split()
	if not parts:
		return ""
	col = parts[0].strip("`")
	direction = (" ".join(parts[1:]).strip() or "ASC").upper()
	if direction not in ("ASC", "DESC"):
		direction = "ASC"

	known = {str(f).strip().lower() for f in display_fields if str(f).strip()}
	known |= {str(f).strip().lower() for f in (config.get("search_fields") or []) if str(f).strip()}
	known.add("name")
	gender_column = (config.get("gender_column") or "").strip().lower()
	if gender_column:
		known.add(gender_column)
	for f in display_fields:
		if "." in f:
			known.add(f.split(".", 1)[0].lower())

	if col.lower() not in known:
		return ""
	return f" ORDER BY `{col}` {direction}"


def _panel_chrome_class(doc: Any, field: str) -> str:
	"""Trimmed per-panel theme bg class from Page Panel, or empty for runtime default."""
	return (getattr(doc, field, None) or "").strip()


def _panel_chrome_fg_type(doc: Any, bg_field: str) -> str:
	"""Foreground pairing mode for a chrome bg slot: mono (default) or tonal."""
	fg_field = bg_field.replace("_bg_class", "_fg_type")
	raw = (getattr(doc, fg_field, None) or "").strip().lower()
	return "tonal" if raw == "tonal" else "mono"


def _panel_config_from_doc(doc: Any) -> dict[str, Any]:
	"""Build panel config dict from a Page Panel document (in-memory or loaded)."""
	root_doctype = (doc.root_doctype or "").strip()
	computed_columns = _get_computed_columns(doc)

	column_order = _parse_csv(doc.column_order)
	email_field = (doc.email_field or "").strip()
	sms_field = (doc.sms_field or "").strip()
	wp_family_id_field = (getattr(doc, "wp_family_id_field", None) or "").strip()
	show_wp_switch = cint(getattr(doc, "show_wp_switch", 0))

	if not email_field or not sms_field:
		auto_email, auto_sms = _auto_detect_contact_fields(doc.root_doctype)
		if not email_field:
			email_field = auto_email
		if not sms_field:
			sms_field = auto_sms
	bold_fields = _parse_csv(doc.bold_fields)
	required_fields = list(dict.fromkeys(_parse_csv(getattr(doc, "required_fields", None))))
	read_only_fields = list(dict.fromkeys(_parse_csv(getattr(doc, "read_only_fields", None))))
	search_only_fields = list(dict.fromkeys(_parse_csv(getattr(doc, "search_fields", None))))

	# Build label/fieldtype metadata for search-only fields (used by filter bar + Find dialog)
	search_only_cols: list[dict] = []
	if search_only_fields:
		try:
			_so_meta = frappe.get_meta(root_doctype)
			_so_ft_map: dict[str, str] = {f.fieldname: (f.fieldtype or "") for f in _so_meta.fields}
			_so_lbl_map: dict[str, str] = {"name": "ID"}
			for _f in _so_meta.fields:
				if _f.fieldname:
					_so_lbl_map[_f.fieldname] = _f.label or _title_case(_f.fieldname)
			for fn in search_only_fields:
				col: dict = {"fieldname": fn, "label": _so_lbl_map.get(fn) or _title_case(fn)}
				ft = _so_ft_map.get(fn, "")
				if ft:
					col["fieldtype"] = ft
				search_only_cols.append(col)
		except Exception:
			search_only_cols = [{"fieldname": fn, "label": _title_case(fn)} for fn in search_only_fields]

	gender_color_fields = _parse_csv(doc.gender_color_fields)
	# Add computed columns with tint_by_row so they tint based on row's gender_column
	for cc in computed_columns:
		if cc.get("tint_by_row") and cc.get("field_name"):
			fn = cc["field_name"].strip()
			if fn and fn not in gender_color_fields:
				gender_color_fields.append(fn)

	for cc in computed_columns:
		fn = cc["field_name"]
		if fn not in column_order:
			column_order.append(fn)

	# Fetch-only: root fields needed for panel chrome (email/SMS/title/links).
	# Linked-table fields (link.child) are included only when explicitly configured —
	# never auto-join a related DocType because it happens to have a gender field.
	fetch_only_fields: list[str] = []
	fetch_only_fields.append("name")
	gender_column = (doc.gender_column or "").strip()
	gender_key = _get_gender_field_key(doc.root_doctype)
	if gender_key:
		col_set = set(column_order)
		search_set = set(search_only_fields)
		if (
			"." not in gender_key
			or gender_key in col_set
			or gender_key in search_set
			or gender_column == gender_key
		):
			fetch_only_fields.append(gender_key)
	if email_field:
		fetch_only_fields.append(email_field)
	if sms_field:
		fetch_only_fields.append(sms_field)
	if wp_family_id_field:
		fetch_only_fields.append(wp_family_id_field)
	title_field = (doc.title_field or "").strip()
	if title_field and title_field not in fetch_only_fields:
		fetch_only_fields.append(title_field)
	fetch_only_fields.extend(_get_link_fieldnames(doc.root_doctype))

	tint_by_gender: dict[str, str] = {}
	for cc in computed_columns:
		g = cc.get("gender")
		if g in ("Male", "Female"):
			tint_by_gender[cc["field_name"].lower()] = g

	format_rules = []
	for r in doc.format_rules or []:
		fn = (r.field_name or "").strip()
		if not fn or not (r.condition_sql or "").strip():
			continue
		format_rules.append(
			{
				"field_name": fn,
				"condition_sql": r.condition_sql,
				"color": (r.color or "").strip() or None,
				"font_weight": (r.font_weight or "").strip() or None,
				"italic": bool(r.italic),
				"underline": bool(r.underline),
				"flag_key": f"_fmt_{fn.replace('.', '__')}",
			}
		)

	default_filters = [
		{"field": row.field, "op": row.op, "value": row.value}
		for row in (doc.default_filters or [])
		if row.field and row.op and row.value
	]
	return {
		"root_doctype": doc.root_doctype,
		"header_text": doc.header_text or doc.root_doctype,
		"default_filters": default_filters,
		"order_by": (doc.order_by or "").strip(),
		"column_order": column_order,
		"fetch_only_fields": fetch_only_fields,
		"bold_fields": bold_fields,
		"gender_column": gender_column,
		"gender_color_fields": gender_color_fields,
		"title_field": title_field,
		"required_fields": required_fields,
		"read_only_fields": read_only_fields,
		"search_fields": search_only_fields,
		"search_only_columns": search_only_cols,
		"effective_searchable": list(dict.fromkeys(column_order + search_only_fields)),
		"tint_by_gender": tint_by_gender,
		"format_rules": format_rules,
		"computed_columns": computed_columns,
		"show_filter": doc.show_filter,
		"show_sheets": doc.show_sheets,
		"show_email": doc.show_email,
		"show_sms": doc.show_sms,
		"email_field": email_field,
		"sms_field": sms_field,
		"show_wp_switch": show_wp_switch,
		"wp_family_id_field": wp_family_id_field,
		"show_card_email": doc.show_card_email,
		"show_card_sms": doc.show_card_sms,
		"open_card_on_click": cint(doc.get("open_card_on_click")),
		"allow_new_record_creation": cint(doc.get("allow_new_record_creation")),
		"form_dialog": (doc.form_dialog or "").strip() or None,
		"theme_slug": _resolve_theme_slug(getattr(doc, "theme", None)),
		"frame_bg_class": _panel_chrome_class(doc, "frame_bg_class"),
		"frame_fg_type": _panel_chrome_fg_type(doc, "frame_bg_class"),
		"header_bg_class": _panel_chrome_class(doc, "header_bg_class"),
		"header_fg_type": _panel_chrome_fg_type(doc, "header_bg_class"),
		"header_toolbar_bg_class": _panel_chrome_class(doc, "header_toolbar_bg_class"),
		"header_toolbar_fg_type": _panel_chrome_fg_type(doc, "header_toolbar_bg_class"),
		"footer_bg_class": _panel_chrome_class(doc, "footer_bg_class"),
		"footer_fg_type": _panel_chrome_fg_type(doc, "footer_bg_class"),
		"col_header_bg_class": _panel_chrome_class(doc, "col_header_bg_class"),
		"col_header_fg_type": _panel_chrome_fg_type(doc, "col_header_bg_class"),
		"filter_bar_bg_class": _panel_chrome_class(doc, "filter_bar_bg_class"),
		"filter_bar_fg_type": _panel_chrome_fg_type(doc, "filter_bar_bg_class"),
		"row_bg_class": _panel_chrome_class(doc, "row_bg_class"),
		"row_fg_type": _panel_chrome_fg_type(doc, "row_bg_class"),
		"row_alt_bg_class": _panel_chrome_class(doc, "row_alt_bg_class"),
		"row_alt_fg_type": _panel_chrome_fg_type(doc, "row_alt_bg_class"),
		"dialog_header_bg_class": _panel_chrome_class(doc, "dialog_header_bg_class"),
		"dialog_header_fg_type": _panel_chrome_fg_type(doc, "dialog_header_bg_class"),
		"frame_border_class": _panel_chrome_class(doc, "frame_border_class"),
		"frame_border_color_class": _panel_chrome_class(doc, "frame_border_color_class"),
		"filter_divider_class": _panel_chrome_class(doc, "filter_divider_class"),
		"filter_divider_color_class": _panel_chrome_class(doc, "filter_divider_color_class"),
		"col_header_line_class": _panel_chrome_class(doc, "col_header_line_class"),
		"col_header_line_color_class": _panel_chrome_class(doc, "col_header_line_color_class"),
		"row_divider_class": _panel_chrome_class(doc, "row_divider_class"),
		"row_divider_color_class": _panel_chrome_class(doc, "row_divider_color_class"),
		"col_divider_class": _panel_chrome_class(doc, "col_divider_class"),
		"col_divider_color_class": _panel_chrome_class(doc, "col_divider_color_class"),
		"male_hex": MALE_HEX,
		"female_hex": FEMALE_HEX,
	}
