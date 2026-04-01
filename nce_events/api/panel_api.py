from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

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


@frappe.whitelist()
def get_panel_config(root_doctype: str) -> dict[str, Any]:
	"""Fetch display configuration for a single Page Panel."""
	if not frappe.db.exists("Page Panel", root_doctype):
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

	order_by = (config.get("order_by") or "").strip() or "name ASC"

	# Unfiltered count of the entire doctype — used as the denominator in the UI
	full_count = frappe.db.count(root_doctype)

	# V2: always fetch all rows — core_filter is sent to the client and applied in JS
	total_count = frappe.db.count(root_doctype, filters=filters)

	# Use stored SQL if available; otherwise build it now and save for next time.
	# When a drill-down filter is active we always rebuild (filter changes the WHERE).
	stored_sql: str = ""
	if not filters and frappe.db.exists("Page Panel", root_doctype):
		stored_sql = (frappe.db.get_value("Page Panel", root_doctype, "panel_sql") or "").strip()

	parsed_filters: dict[str, Any] = filters if isinstance(filters, dict) else {}
	if stored_sql:
		rows = frappe.db.sql(stored_sql, as_dict=True)
	else:
		sql, params = _build_panel_sql(root_doctype, filters=parsed_filters)
		if not parsed_filters and frappe.db.exists("Page Panel", root_doctype):
			frappe.db.set_value("Page Panel", root_doctype, "panel_sql", sql)
			frappe.db.commit()
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

	# Build fieldtype map from meta for date/datetime awareness in the filter widget
	_fieldtype_map: dict[str, str] = {}
	try:
		_meta = frappe.get_meta(root_doctype)
		for _f in _meta.fields:
			if _f.fieldname:
				_fieldtype_map[_f.fieldname] = _f.fieldtype or ""
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
			label = fn.split(".")[-1] if "." in fn else fn
			label = _title_case(label)
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


_ROSTER_HASH: str = "wwe78f6q87ey97f86q9e8fqw98ef"


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
		if isinstance(val, (dict, list)):
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


# ── Core filter ──


def _build_panel_sql(root_doctype: str, filters: dict | None = None) -> tuple[str, list[Any]]:
	"""Build the main SELECT [LEFT JOIN...] SQL for a panel, without executing it.

	Returns (sql, params) tuple. Used by build_panel_sql (to save + display)
	and by get_panel_data (to execute). filters is only used for the WHERE
	clause when a drill-down parent filter is active.
	"""
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
			if op.lower() == "in" and isinstance(operand, (list, tuple)):
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
			if op.lower() == "in" and isinstance(operand, (list, tuple)):
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


# ── Internal helpers ──


_EMAIL_NAMES: set[str] = {"email", "email_address", "email_id"}
_PHONE_NAMES: set[str] = {"phone", "mobile", "mobile_no", "phone_number", "cell", "contact_number"}


def _auto_detect_contact_fields(doctype: str) -> tuple[str, str]:
	"""Auto-detect email and phone/SMS fields directly on a DocType.

	Matches by fieldtype (Email/Phone) or common fieldnames.
	Returns (email_field, sms_field) — either may be empty string.
	"""
	email_field = ""
	sms_field = ""

	try:
		meta = frappe.get_meta(doctype)
	except Exception:
		return email_field, sms_field

	for f in meta.fields:
		fn = f.fieldname.lower()
		ft = (f.fieldtype or "").strip()
		if not email_field and (ft == "Email" or fn in _EMAIL_NAMES):
			email_field = f.fieldname
		if not sms_field and (ft == "Phone" or fn in _PHONE_NAMES):
			sms_field = f.fieldname
		if email_field and sms_field:
			break

	return email_field, sms_field


def _find_link_field(doctype: str, target_doctype: str) -> str | None:
	"""Return the first Link fieldname on doctype that points to target_doctype."""
	try:
		meta = frappe.get_meta(doctype)
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == target_doctype:
				return field.fieldname
	except Exception:
		pass
	return None


def _title_case(fieldname: str) -> str:
	return fieldname.replace("_", " ").title()


def _safe_filename(value: str) -> str:
	"""Sanitize a string for use as a filesystem filename component."""
	return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(value))


@frappe.whitelist()
def get_child_doctypes(root_doctype: str) -> list[dict[str, str]]:
	"""Return DocTypes that have a Link field pointing to root_doctype.

	Scans all WP Tables DocTypes for Link fields targeting root_doctype.
	Returns [{doctype, link_field, label}].
	"""
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["frappe_doctype", "nce_name", "table_name"],
	)

	label_map: dict[str, str] = {}
	wp_doctypes: set[str] = set()
	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if dt:
			wp_doctypes.add(dt)
			label_map[dt] = row.get("nce_name") or row.get("table_name") or dt

	result: list[dict[str, str]] = []
	for dt in wp_doctypes:
		if dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
		except Exception:
			continue
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == root_doctype:
				result.append(
					{
						"doctype": dt,
						"link_field": field.fieldname,
						"label": label_map.get(dt, dt),
					}
				)
				break

	result.sort(key=lambda r: r["label"])
	frappe.logger().info(f"get_child_doctypes({root_doctype}): wp_doctypes={wp_doctypes}, result={result}")
	return result


@frappe.whitelist()
def debug_child_lookup(root_doctype: str) -> dict[str, Any]:
	"""Diagnostic: show what get_child_doctypes sees."""
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["name", "frappe_doctype", "nce_name", "table_name", "mirror_status"],
	)
	info: dict[str, Any] = {"root_doctype": root_doctype, "wp_tables": wp_rows, "link_fields_found": []}

	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if not dt or dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
			for field in meta.fields:
				if field.fieldtype == "Link" and field.options == root_doctype:
					info["link_fields_found"].append(
						{
							"doctype": dt,
							"fieldname": field.fieldname,
							"options": field.options,
						}
					)
		except Exception as e:
			info["link_fields_found"].append({"doctype": dt, "error": str(e)})

	return info


@frappe.whitelist()
def get_doctype_fields(root_doctype: str) -> list[dict[str, str]]:
	"""Return data-bearing fields for a DocType (excludes layout and system fields).

	Link fields include an 'options' key with the target DocType name.
	"""
	meta = frappe.get_meta(root_doctype)
	result: list[dict[str, str]] = [
		{"fieldname": "name", "label": "ID", "fieldtype": "Data"},
	]
	for f in meta.fields:
		if f.fieldtype in _SKIP_FIELDTYPES or f.fieldname in _SKIP_FIELDNAMES:
			continue
		entry: dict[str, str] = {
			"fieldname": f.fieldname,
			"label": f.label or _title_case(f.fieldname),
			"fieldtype": f.fieldtype,
		}
		if f.fieldtype == "Link" and f.options:
			entry["options"] = f.options
		result.append(entry)
	return result


def _get_link_fieldnames(doctype: str) -> list[str]:
	"""Return Link fieldnames on doctype for fetch-only (future use)."""
	try:
		meta = frappe.get_meta(doctype)
		return [f.fieldname for f in meta.fields if f.fieldtype == "Link" and f.fieldname]
	except Exception:
		return []


def _get_link_fields_with_target(doctype: str) -> list[dict[str, str]]:
	"""Return Link fields with their target DocType: [{fieldname, options}]."""
	try:
		meta = frappe.get_meta(doctype)
		return [
			{"fieldname": f.fieldname, "options": f.options}
			for f in meta.fields
			if f.fieldtype == "Link" and f.fieldname and f.options
		]
	except Exception:
		return []


def _get_gender_field_key(root_doctype: str) -> str | None:
	"""Return 'gender' or 'link_field.gender'. Case-insensitive field search."""
	try:
		meta = frappe.get_meta(root_doctype)
		for f in meta.fields:
			if (f.fieldname or "").lower() == "gender":
				return f.fieldname
			if f.fieldtype == "Link" and f.options:
				child_meta = frappe.get_meta(f.options)
				if any((cf.fieldname or "").lower() == "gender" for cf in child_meta.fields):
					return f"{f.fieldname}.gender"
	except Exception:
		pass
	return None


def _parse_csv(value: str | None) -> list[str]:
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]


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


def _ensure_tab_prefix(sql: str) -> str:
	"""Prepend 'tab' to bare table names in FROM/JOIN clauses.

	Event -> tabEvent, `Event Registration` -> `tabEvent Registration`.
	Already-prefixed names (tabEvent) are left unchanged.
	"""

	def repl(m: re.Match[str]) -> str:
		kw, ident = m.group(1), m.group(2)
		if ident.startswith("`"):
			ident = ident[1:-1]
		if ident.lower().startswith("tab"):
			return m.group(0)
		tab_name = "tab" + ident
		if " " in ident or "-" in ident:
			tab_name = f"`{tab_name}`"
		return f"{kw} {tab_name}"

	pattern = r"\b(FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN)\s+(`[^`]+`|\w+)"
	return re.sub(pattern, repl, sql, flags=re.IGNORECASE)


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
		return list(results[0].values())[0]
	if len(results) == 1:
		return dict(results[0])
	return [dict(r) for r in results]


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
		if isinstance(val, (dict, list)):
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
