from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from typing import Any

import frappe
from frappe.utils import cint, cstr

from nce_events.api.panel_api_pkg._helpers import (
	_auto_detect_contact_fields,
	_get_gender_field_key,
	_get_link_fieldnames,
	_get_link_fields_with_target,
	_meta_reqd_root_fieldnames,
	_parse_csv,
	_safe_filename,
	_title_case,
)
from nce_events.api.panel_api_pkg.computed_columns import (
	_evaluate_computed_columns,
	_get_computed_columns,
)
from nce_events.api.panel_api_pkg.core_filters import _apply_user_filters
from nce_events.api.panel_api_pkg.discovery import get_child_doctypes
from nce_events.api.panel_api_pkg.sql import _build_panel_sql

MALE_HEX: str = "#0000FF"
FEMALE_HEX: str = "#c700e6"

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

_ROSTER_HASH: str = "wwe78f6q87ey97f86q9e8fqw98ef"


@frappe.whitelist()
def get_panel_config(root_doctype: str) -> dict[str, Any]:
	"""Fetch display configuration for a single Page Panel."""
	if not frappe.db.exists("Page Panel", root_doctype):
		auto_email, auto_sms = _auto_detect_contact_fields(root_doctype)
		meta_reqd = _meta_reqd_root_fieldnames(root_doctype)
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
			"required_fields": meta_reqd,
			"tint_by_gender": {},
			"computed_columns": [],
			"show_filter": 1,
			"show_sheets": 1,
			"show_email": 1,
			"show_sms": 1,
			"email_field": auto_email,
			"sms_field": auto_sms,
			"show_card_email": 0,
			"show_card_sms": 0,
			"open_card_on_click": 0,
			"form_dialog": None,
			"male_hex": MALE_HEX,
			"female_hex": FEMALE_HEX,
		}

	doc = frappe.get_doc("Page Panel", root_doctype)
	if (doc.root_doctype or "").strip() != root_doctype:
		computed_columns = []
	else:
		computed_columns = _get_computed_columns(doc)

	column_order = _parse_csv(doc.column_order)
	email_field = (doc.email_field or "").strip()
	sms_field = (doc.sms_field or "").strip()

	if not email_field or not sms_field:
		auto_email, auto_sms = _auto_detect_contact_fields(doc.root_doctype)
		if not email_field:
			email_field = auto_email
		if not sms_field:
			sms_field = auto_sms
	bold_fields = _parse_csv(doc.bold_fields)
	required_fields = _parse_csv(getattr(doc, "required_fields", None))
	meta_reqd = _meta_reqd_root_fieldnames(doc.root_doctype)
	required_fields = list(dict.fromkeys(required_fields + meta_reqd))
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

	# Fetch-only: always fetch when on root doctype. No conditions.
	fetch_only_fields: list[str] = []
	fetch_only_fields.append("name")
	gender_key = _get_gender_field_key(doc.root_doctype)
	if gender_key:
		fetch_only_fields.append(gender_key)
	if email_field:
		fetch_only_fields.append(email_field)
	if sms_field:
		fetch_only_fields.append(sms_field)
	title_field = (doc.title_field or "").strip()
	if title_field and title_field not in fetch_only_fields:
		fetch_only_fields.append(title_field)
	fetch_only_fields.extend(_get_link_fieldnames(doc.root_doctype))

	tint_by_gender: dict[str, str] = {}
	for cc in computed_columns:
		g = cc.get("gender")
		if g in ("Male", "Female"):
			tint_by_gender[cc["field_name"].lower()] = g
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
		"gender_column": (doc.gender_column or "").strip(),
		"gender_color_fields": gender_color_fields,
		"title_field": title_field,
		"required_fields": required_fields,
		"tint_by_gender": tint_by_gender,
		"computed_columns": computed_columns,
		"show_filter": doc.show_filter,
		"show_sheets": doc.show_sheets,
		"show_email": doc.show_email,
		"show_sms": doc.show_sms,
		"email_field": email_field,
		"sms_field": sms_field,
		"show_card_email": doc.show_card_email,
		"show_card_sms": doc.show_card_sms,
		"open_card_on_click": cint(doc.get("open_card_on_click")),
		"form_dialog": (doc.form_dialog or "").strip() or None,
		"male_hex": MALE_HEX,
		"female_hex": FEMALE_HEX,
	}


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
	if not parsed_filters and frappe.db.exists("Page Panel", root_doctype):
		stored_sql = (frappe.db.get_value("Page Panel", root_doctype, "panel_sql") or "").strip()

	if stored_sql:
		rows = frappe.db.sql(stored_sql, as_dict=True)
	else:
		sql, params = _build_panel_sql(root_doctype, filters=parsed_filters)
		rows = frappe.db.sql(sql, params, as_dict=True)

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
def export_panel_data(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
) -> dict[str, Any]:
	"""Export a panel's current data as CSV to a public path and return its URL."""
	result = get_panel_data(root_doctype, filters, user_filters=user_filters)
	columns = result["columns"]
	rows = result["rows"]

	col_fieldnames = [c["fieldname"] for c in columns]
	labels = [c["label"] for c in columns]

	def _cell_str(val: Any) -> str:
		if val is None:
			return ""
		if isinstance(val, dict | list):
			return json.dumps(val)
		return str(val)

	output = io.StringIO()
	writer = csv.writer(output)
	writer.writerow(labels)
	for row in rows:
		writer.writerow([_cell_str(row.get(fn)) for fn in col_fieldnames])
	csv_content = output.getvalue()

	safe_dt = _safe_filename(root_doctype)
	ts = frappe.utils.now_datetime().strftime("%Y%m%d_%H%M%S")
	context_key = json.dumps({"f": filters, "uf": user_filters, "t": ts}, sort_keys=True, default=str)
	suffix = hashlib.md5(context_key.encode()).hexdigest()[:10]
	filename = f"{safe_dt}_{ts}_{suffix}.csv"

	roster_dir = frappe.get_site_path("public", "files", "panels", _ROSTER_HASH)
	os.makedirs(roster_dir, exist_ok=True)
	filepath = os.path.join(roster_dir, filename)
	with open(filepath, "w", encoding="utf-8") as f:
		f.write(csv_content)

	public_url = f"/files/panels/{_ROSTER_HASH}/{filename}"

	return {
		"filename": filename,
		"url": public_url,
		"rows_exported": len(rows),
	}
