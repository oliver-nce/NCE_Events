import csv
import io
import json
import os

import frappe
from frappe import _
from frappe.utils import cint


MALE_HEX = "#0000FF"
FEMALE_HEX = "#c700e6"

_SKIP_FIELDTYPES = frozenset({
	"Section Break", "Column Break", "Tab Break", "HTML",
	"Fold", "Heading", "Button", "Table", "Table MultiSelect",
})

_SKIP_FIELDNAMES = frozenset({
	"name", "owner", "creation", "modified", "modified_by",
	"docstatus", "idx", "parent", "parentfield", "parenttype",
})


@frappe.whitelist()
def get_panel_config(root_doctype):
	"""Fetch display configuration for a single Page Panel."""
	if not frappe.db.exists("Page Panel", root_doctype):
		auto_email, auto_sms = _auto_detect_contact_fields(root_doctype)
		return {
			"root_doctype": root_doctype,
			"header_text": root_doctype,
			"core_filter": "",
			"order_by": "",
			"column_order": [],
			"bold_fields": [],
			"gender_column": "",
			"gender_color_fields": [],
			"show_filter": 1,
			"show_sheets": 1,
			"show_email": 1,
			"show_sms": 1,
			"email_field": auto_email,
			"sms_field": auto_sms,
			"show_card_email": 0,
			"show_card_sms": 0,
			"male_hex": MALE_HEX,
			"female_hex": FEMALE_HEX,
		}

	doc = frappe.get_doc("Page Panel", root_doctype)
	column_order = _parse_csv(doc.column_order)
	email_field = (doc.email_field or "").strip()
	sms_field = (doc.sms_field or "").strip()

	if not email_field or not sms_field:
		auto_email, auto_sms = _auto_detect_contact_fields(doc.root_doctype)
		if not email_field:
			email_field = auto_email
		if not sms_field:
			sms_field = auto_sms

	return {
		"root_doctype": doc.root_doctype,
		"header_text": doc.header_text or doc.root_doctype,
		"core_filter": (doc.core_filter or "").strip(),
		"order_by": (doc.order_by or "").strip(),
		"column_order": column_order,
		"bold_fields": _parse_csv(doc.bold_fields),
		"gender_column": (doc.gender_column or "").strip(),
		"gender_color_fields": _parse_csv(doc.gender_color_fields),
		"show_filter": doc.show_filter,
		"show_sheets": doc.show_sheets,
		"show_email": doc.show_email,
		"show_sms": doc.show_sms,
		"email_field": email_field,
		"sms_field": sms_field,
		"show_card_email": doc.show_card_email,
		"show_card_sms": doc.show_card_sms,
		"male_hex": MALE_HEX,
		"female_hex": FEMALE_HEX,
	}


@frappe.whitelist()
def get_panel_data(root_doctype, filters=None, limit=0, start=0):
	"""Fetch rows from a DocType, optionally filtered and paginated.

	filters is a JSON dict of {fieldname: value} applied to frappe.get_all.
	Supports dot-notation fields (e.g. "link_field.child_field") which are
	resolved via frappe.get_all's native dot-field support.

	limit/start enable pagination.  limit=0 (default) fetches all rows.
	"""
	if isinstance(filters, str):
		filters = json.loads(filters) if filters else {}
	filters = filters or {}
	limit = cint(limit)
	start = cint(start)

	config = get_panel_config(root_doctype)
	all_fields = config["column_order"]
	if not all_fields:
		all_fields = ["name"]
	elif "name" not in all_fields:
		all_fields = ["name"] + all_fields

	# Split into simple fields and dot-notation (linked) fields
	simple_fields = [fn for fn in all_fields if "." not in fn]
	linked_fields = [fn for fn in all_fields if "." in fn]

	# Ensure base link fields are fetched so dot-notation can resolve
	link_bases = {fn.split(".", 1)[0] for fn in linked_fields}
	for lf in link_bases:
		if lf not in simple_fields:
			simple_fields.append(lf)

	core_filter = (config.get("core_filter") or "").strip()
	order_by = (config.get("order_by") or "").strip() or "name ASC"

	if core_filter:
		total_count = _count_with_core_filter(root_doctype, filters, core_filter)
		rows = _query_with_core_filter(
			root_doctype, simple_fields, filters, core_filter, order_by,
			limit=limit, start=start,
		)
	else:
		total_count = frappe.db.count(root_doctype, filters=filters)
		get_all_kw = dict(
			doctype=root_doctype, fields=simple_fields, filters=filters,
			order_by=order_by,
		)
		if limit:
			get_all_kw["limit_page_length"] = limit
			get_all_kw["limit_start"] = start
		else:
			get_all_kw["limit_page_length"] = 0
		rows = frappe.get_all(**get_all_kw)

	# Resolve dot-notation fields via frappe.get_value lookups
	if linked_fields and rows:
		grouped = {}
		for fn in linked_fields:
			link_field, child_field = fn.split(".", 1)
			grouped.setdefault(link_field, []).append(child_field)

		meta = frappe.get_meta(root_doctype)
		link_targets = {}
		for field in meta.fields:
			if field.fieldtype == "Link" and field.fieldname in grouped:
				link_targets[field.fieldname] = field.options

		for row in rows:
			for link_field, child_fields in grouped.items():
				target_dt = link_targets.get(link_field)
				linked_name = row.get(link_field)
				if target_dt and linked_name:
					try:
						linked_values = frappe.db.get_value(
							target_dt, linked_name, child_fields, as_dict=True
						) or {}
					except Exception:
						linked_values = {}
				else:
					linked_values = {}
				for cf in child_fields:
					row[link_field + "." + cf] = linked_values.get(cf, "")

	columns = []
	for fn in all_fields:
		label = fn.split(".")[-1] if "." in fn else fn
		columns.append({"fieldname": fn, "label": _title_case(label)})

	child_doctypes = get_child_doctypes(root_doctype)

	# Compute child record counts per row for each child doctype
	if child_doctypes and rows:
		row_names = [row["name"] for row in rows]
		for child in child_doctypes:
			count_data = frappe.get_all(
				child["doctype"],
				filters={child["link_field"]: ["in", row_names]},
				fields=[child["link_field"], "count(name) as cnt"],
				group_by=child["link_field"],
			)
			count_map = {r[child["link_field"]]: r["cnt"] for r in count_data}
			count_key = "_count_" + child["doctype"]
			for row in rows:
				row[count_key] = count_map.get(row["name"], 0)

	return {
		"columns": columns,
		"rows": rows,
		"total": total_count,
		"child_doctypes": child_doctypes,
	}


_ROSTER_HASH = "wwe78f6q87ey97f86q9e8fqw98ef"


@frappe.whitelist()
def export_panel_data(root_doctype, filters=None):
	"""Export a panel's current data as CSV to a public path and return its URL."""
	result = get_panel_data(root_doctype, filters)
	columns = result["columns"]
	rows = result["rows"]

	col_fieldnames = [c["fieldname"] for c in columns]
	labels = [c["label"] for c in columns]

	output = io.StringIO()
	writer = csv.writer(output)
	writer.writerow(labels)
	for row in rows:
		writer.writerow([row.get(fn, "") for fn in col_fieldnames])
	csv_content = output.getvalue()

	safe_dt = _safe_filename(root_doctype)
	filename = f"{safe_dt}.csv"

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


@frappe.whitelist()
def save_panel_sql(root_doctype, core_filter="", order_by=""):
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
		frappe.db.set_value("Page Panel", root_doctype, {
			"core_filter": core_filter,
			"order_by": order_by,
		})

	frappe.db.commit()
	return {"ok": True}


def _build_core_filter_where(root_doctype, filters, core_filter):
	"""Build WHERE clause and params for queries with a raw core_filter."""
	where_parts = [f"({core_filter})"]
	params = []
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


def _count_with_core_filter(root_doctype, filters, core_filter):
	table = f"`tab{root_doctype}`"
	where_sql, params = _build_core_filter_where(root_doctype, filters, core_filter)
	result = frappe.db.sql(f"SELECT COUNT(*) FROM {table} WHERE {where_sql}", params)
	return result[0][0] if result else 0


def _query_with_core_filter(root_doctype, fields, filters, core_filter, order_by="name ASC", limit=0, start=0):
	"""Run a panel query using frappe.db.sql so we can inject a raw WHERE clause."""
	table = f"`tab{root_doctype}`"
	fields_sql = ", ".join(f"`{f}`" for f in fields)
	where_sql, params = _build_core_filter_where(root_doctype, filters, core_filter)

	query = f"SELECT {fields_sql} FROM {table} WHERE {where_sql} ORDER BY {order_by}"
	if limit:
		query += f" LIMIT {int(limit)} OFFSET {int(start)}"
	return frappe.db.sql(query, params, as_dict=True)


# ── Internal helpers ──


_EMAIL_NAMES = {"email", "email_address", "email_id"}
_PHONE_NAMES = {"phone", "mobile", "mobile_no", "phone_number", "cell", "contact_number"}


def _auto_detect_contact_fields(doctype):
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


def _find_link_field(doctype, target_doctype):
	"""Return the first Link fieldname on doctype that points to target_doctype."""
	try:
		meta = frappe.get_meta(doctype)
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == target_doctype:
				return field.fieldname
	except Exception:
		pass
	return None


def _title_case(fieldname):
	return fieldname.replace("_", " ").title()


def _safe_filename(value):
	"""Sanitize a string for use as a filesystem filename component."""
	return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(value))


@frappe.whitelist()
def get_child_doctypes(root_doctype):
	"""Return DocTypes that have a Link field pointing to root_doctype.

	Scans all WP Tables DocTypes for Link fields targeting root_doctype.
	Returns [{doctype, link_field, label}].
	"""
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["frappe_doctype", "nce_name", "table_name"],
	)

	label_map = {}
	wp_doctypes = set()
	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if dt:
			wp_doctypes.add(dt)
			label_map[dt] = row.get("nce_name") or row.get("table_name") or dt

	result = []
	for dt in wp_doctypes:
		if dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
		except Exception:
			continue
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == root_doctype:
				result.append({
					"doctype": dt,
					"link_field": field.fieldname,
					"label": label_map.get(dt, dt),
				})
				break

	result.sort(key=lambda r: r["label"])
	frappe.logger().info(
		f"get_child_doctypes({root_doctype}): wp_doctypes={wp_doctypes}, result={result}"
	)
	return result


@frappe.whitelist()
def debug_child_lookup(root_doctype):
	"""Diagnostic: show what get_child_doctypes sees."""
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["name", "frappe_doctype", "nce_name", "table_name", "mirror_status"],
	)
	info = {"root_doctype": root_doctype, "wp_tables": wp_rows, "link_fields_found": []}

	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if not dt or dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
			for field in meta.fields:
				if field.fieldtype == "Link" and field.options == root_doctype:
					info["link_fields_found"].append({
						"doctype": dt,
						"fieldname": field.fieldname,
						"options": field.options,
					})
		except Exception as e:
			info["link_fields_found"].append({"doctype": dt, "error": str(e)})

	return info


@frappe.whitelist()
def get_doctype_fields(root_doctype):
	"""Return data-bearing fields for a DocType (excludes layout and system fields).

	Link fields include an 'options' key with the target DocType name.
	"""
	meta = frappe.get_meta(root_doctype)
	result = []
	for f in meta.fields:
		if f.fieldtype in _SKIP_FIELDTYPES or f.fieldname in _SKIP_FIELDNAMES:
			continue
		entry = {
			"fieldname": f.fieldname,
			"label": f.label or _title_case(f.fieldname),
			"fieldtype": f.fieldtype,
		}
		if f.fieldtype == "Link" and f.options:
			entry["options"] = f.options
		result.append(entry)
	return result


def _parse_csv(value):
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]
