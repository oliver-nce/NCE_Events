import csv
import io
import json
import os
import re

import frappe
from frappe import _


MALE_HEX = "#0000FF"
FEMALE_HEX = "#c700e6"


@frappe.whitelist()
def get_panel_config(root_doctype):
	"""Fetch display configuration for a single Page Panel."""
	if not frappe.db.exists("Page Panel", root_doctype):
		return {
			"root_doctype": root_doctype,
			"header_text": root_doctype,
			"column_order": [],
			"bold_fields": [],
			"gender_column": "",
			"gender_color_fields": [],
			"show_filter": 1,
			"show_sheets": 1,
			"show_email": 1,
			"show_sms": 1,
			"email_field": "",
			"sms_field": "",
			"show_card_email": 0,
			"show_card_sms": 0,
			"male_hex": MALE_HEX,
			"female_hex": FEMALE_HEX,
		}

	doc = frappe.get_doc("Page Panel", root_doctype)
	return {
		"root_doctype": doc.root_doctype,
		"header_text": doc.header_text or doc.root_doctype,
		"column_order": _parse_csv(doc.column_order),
		"bold_fields": _parse_csv(doc.bold_fields),
		"gender_column": (doc.gender_column or "").strip(),
		"gender_color_fields": _parse_csv(doc.gender_color_fields),
		"show_filter": doc.show_filter,
		"show_sheets": doc.show_sheets,
		"show_email": doc.show_email,
		"show_sms": doc.show_sms,
		"email_field": (doc.email_field or "").strip(),
		"sms_field": (doc.sms_field or "").strip(),
		"show_card_email": doc.show_card_email,
		"show_card_sms": doc.show_card_sms,
		"male_hex": MALE_HEX,
		"female_hex": FEMALE_HEX,
	}


@frappe.whitelist()
def get_panel_data(root_doctype, filters=None):
	"""Fetch rows from a DocType, optionally filtered.

	filters is a JSON dict of {fieldname: value} applied to frappe.get_all.
	"""
	if isinstance(filters, str):
		filters = json.loads(filters) if filters else {}
	filters = filters or {}

	config = get_panel_config(root_doctype)
	fields = config["column_order"]
	if not fields:
		fields = ["name"]
	elif "name" not in fields:
		fields = ["name"] + fields

	rows = frappe.get_all(
		root_doctype,
		fields=fields,
		filters=filters,
		order_by="name asc",
		limit_page_length=0,
	)

	columns = [{"fieldname": fn, "label": _title_case(fn)} for fn in fields]

	return {
		"columns": columns,
		"rows": rows,
		"total": len(rows),
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


# ── Internal helpers ──


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
def get_doctype_fields(root_doctype):
	"""Return data-bearing fields for a DocType (excludes layout and system fields).

	Link fields include an 'options' key with the target DocType name.
	"""
	meta = frappe.get_meta(root_doctype)
	skip_types = {
		"Section Break", "Column Break", "Tab Break", "HTML",
		"Fold", "Heading", "Button", "Table", "Table MultiSelect",
	}
	skip_names = {
		"name", "owner", "creation", "modified", "modified_by",
		"docstatus", "idx", "parent", "parentfield", "parenttype",
	}
	result = []
	for f in meta.fields:
		if f.fieldtype in skip_types or f.fieldname in skip_names:
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


# ── Report / translator utilities (used elsewhere) ──


@frappe.whitelist()
def create_or_update_report(header_text, frappe_query, existing_report_name=None, ref_doctype=None):
	"""Create or update a Query Report from a translated Frappe SQL query."""
	if not frappe_query:
		frappe.throw(_("Frappe Query is empty — translate or enter SQL first."))

	report_name = (existing_report_name or "").strip() or (header_text.strip() + " Panel")

	if frappe.db.exists("Report", report_name):
		doc = frappe.get_doc("Report", report_name)
		doc.query = frappe_query
		doc.save(ignore_permissions=True)
		return {"report_name": report_name, "action": "updated"}
	else:
		doc = frappe.new_doc("Report")
		doc.report_name = report_name
		doc.report_type = "Query Report"
		doc.is_standard = "No"
		doc.ref_doctype = ref_doctype or "DocType"
		doc.query = frappe_query
		doc.insert(ignore_permissions=True)
		return {"report_name": report_name, "action": "created"}


@frappe.whitelist()
def translate_wp_query(wp_query):
	"""Translate a WordPress SQL query to its Frappe equivalent using WP Tables mappings."""
	if not wp_query:
		return {"translated": "", "warnings": []}

	wp_tables = frappe.get_all(
		"WP Tables",
		fields=["table_name", "frappe_doctype", "column_mapping"],
	)

	translated = wp_query
	warnings = []

	table_col_maps = {}
	for wt in wp_tables:
		tname = wt.get("table_name")
		if not tname or not wt.get("frappe_doctype"):
			continue
		col_map_raw = wt.get("column_mapping")
		if not col_map_raw:
			continue
		try:
			col_map = json.loads(col_map_raw) if isinstance(col_map_raw, str) else col_map_raw
			resolved = {}
			for wp_col, col_info in col_map.items():
				if isinstance(col_info, dict):
					if col_info.get("is_name"):
						resolved[str(wp_col)] = "name"
					else:
						frappe_col = col_info.get("fieldname", "")
						if frappe_col:
							resolved[str(wp_col)] = str(frappe_col)
				elif col_info:
					resolved[str(wp_col)] = str(col_info)
			table_col_maps[tname] = resolved
		except Exception as exc:
			warnings.append("Could not parse column_mapping for {0}: {1}".format(tname, str(exc)))

	# Pass 1: qualified table.column
	qualified_map = {}
	for wt in wp_tables:
		tname = wt.get("table_name")
		frappe_doctype = wt.get("frappe_doctype")
		if not tname or not frappe_doctype:
			continue
		frappe_table = "`tab" + frappe_doctype + "`"
		for wp_col, frappe_col in table_col_maps.get(tname, {}).items():
			key = tname + "." + wp_col
			qualified_map[key] = frappe_table + "." + frappe_col

	if qualified_map:
		sorted_q = sorted(qualified_map.keys(), key=len, reverse=True)
		q_pattern = '|'.join(re.escape(k) for k in sorted_q)
		translated = re.sub(q_pattern, lambda m: qualified_map.get(m.group(0), m.group(0)), translated, flags=re.IGNORECASE)

	# Pass 2: bare WP table names
	for wt in wp_tables:
		tname = wt.get("table_name")
		frappe_doctype = wt.get("frappe_doctype")
		if not tname or not frappe_doctype:
			continue
		frappe_table = "`tab" + frappe_doctype + "`"
		translated = re.sub(r'\b' + re.escape(tname) + r'\b', frappe_table, translated, flags=re.IGNORECASE)

	# Pass 3: remaining bare column names
	all_col_map = {}
	for col_map in table_col_maps.values():
		for wp_col, frappe_col in col_map.items():
			if wp_col not in all_col_map:
				all_col_map[wp_col] = frappe_col

	if all_col_map:
		sorted_keys = sorted(all_col_map.keys(), key=len, reverse=True)
		combined = r'(?<!\.)\b(' + '|'.join(re.escape(k) for k in sorted_keys) + r')\b'
		translated = re.sub(combined, lambda m: all_col_map.get(m.group(1), m.group(1)), translated)

	return {"translated": translated, "warnings": warnings}


@frappe.whitelist()
def get_report_columns(report_name):
	"""Return column definitions from a Query Report with proper labels."""
	report = frappe.get_doc("Report", report_name)
	if report.report_type != "Query Report":
		frappe.throw(_("{0} is not a Query Report").format(report_name))

	result = frappe.desk.query_report.run(report_name, filters={})
	raw_columns = result.get("columns", [])

	out = []
	for c in raw_columns:
		if isinstance(c, dict):
			fn = c.get("fieldname") or c.get("field") or ""
			label = c.get("label") or _title_case(fn)
		elif isinstance(c, str):
			parts = c.split(":")
			label = parts[0].strip()
			fn = label.lower().replace(" ", "_")
		else:
			fn = str(c)
			label = _title_case(fn)
		out.append({"fieldname": fn, "label": label})
	return out


# ── Messaging ──


@frappe.whitelist()
def send_panel_message(
	root_doctype, filters=None, mode="sms",
	recipient_field="", body="", subject="",
	send_email_copy=0, email_field=""
):
	"""Send bulk SMS and/or email to all rows in a panel."""
	from jinja2 import Template as Jinja2Template

	send_email_copy = int(send_email_copy)
	result = get_panel_data(root_doctype, filters)
	columns = result["columns"]
	rows = result["rows"]
	col_fieldnames = [c["fieldname"] for c in columns]

	sent = 0
	errors = []

	for row in rows:
		context = {fn: row.get(fn, "") for fn in col_fieldnames}
		recipient = str(context.get(recipient_field, "")).strip()
		if not recipient:
			continue

		try:
			rendered_body = Jinja2Template(body).render(context)
		except Exception:
			rendered_body = body

		try:
			rendered_subject = Jinja2Template(subject).render(context) if subject else ""
		except Exception:
			rendered_subject = subject

		if mode == "sms":
			try:
				_send_sms(recipient, rendered_body)
				sent += 1
			except Exception as e:
				errors.append(f"SMS to {recipient}: {e}")

			if send_email_copy and email_field:
				email_addr = str(context.get(email_field, "")).strip()
				if email_addr:
					try:
						frappe.sendmail(
							recipients=[email_addr],
							subject=rendered_subject or "SMS Copy",
							message=rendered_body,
							now=True,
						)
					except Exception as e:
						errors.append(f"Email to {email_addr}: {e}")

		elif mode == "email":
			email_addr = recipient
			if email_addr:
				try:
					frappe.sendmail(
						recipients=[email_addr],
						subject=rendered_subject or "(No Subject)",
						message=rendered_body,
						now=True,
					)
					sent += 1
				except Exception as e:
					errors.append(f"Email to {email_addr}: {e}")

	if errors:
		frappe.log_error(
			"\n".join(errors),
			f"send_panel_message errors ({root_doctype})"
		)

	return {"sent": sent, "total": len(rows), "errors": len(errors)}


def _send_sms(phone, message):
	"""Send an SMS via Twilio using credentials from API Connector."""
	import requests

	connector = frappe.get_doc("API Connector", "Twilio")
	account_sid = connector.username
	auth_token = connector.get_password("password")

	url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

	from_number = frappe.db.get_single_value("SMS Settings", "sms_sender_name") or ""
	if not from_number:
		frappe.throw(_("No sender number configured. Set SMS Sender Name in SMS Settings."))

	resp = requests.post(
		url,
		data={"To": phone, "From": from_number, "Body": message},
		auth=(account_sid, auth_token),
		timeout=15,
	)

	if resp.status_code not in (200, 201):
		frappe.throw(_(f"Twilio error {resp.status_code}: {resp.text}"))


# ── Field tag rebuild (Messaging Configuration) ──


_DEFAULT_SYNTHETICS = [
	{"field_name": "he_she", "label": "He/She (lower)", "male_value": "he", "female_value": "she"},
	{"field_name": "he_she_cap", "label": "He/She", "male_value": "He", "female_value": "She"},
	{"field_name": "him_her", "label": "Him/Her", "male_value": "him", "female_value": "her"},
	{"field_name": "his_her", "label": "His/Her", "male_value": "his", "female_value": "her"},
]

_SKIP_FIELDTYPES = frozenset({
	"Section Break", "Column Break", "Tab Break", "HTML",
	"Fold", "Heading", "Button", "Table", "Table MultiSelect",
})

_SKIP_FIELDNAMES = frozenset({
	"name", "owner", "creation", "modified", "modified_by",
	"docstatus", "idx", "parent", "parentfield", "parenttype",
})


@frappe.whitelist()
def rebuild_field_tags():
	"""Scan all custom DocTypes and rebuild the Field Tag child table."""
	doc = frappe.get_doc("Messaging Configuration")
	gender_field = doc.gender_field or "gender"

	neutral_fieldnames = {
		row.field_name.strip()
		for row in (doc.neutral_tags or [])
		if row.field_name
	}

	existing = {}
	for row in (doc.field_tags or []):
		key = (row.field_name or "") + ":" + (row.source_table or "")
		existing[key] = {
			"expose": row.expose,
			"male_value": row.male_value or "",
			"female_value": row.female_value or "",
			"synthetic": row.synthetic,
		}

	synthetic_by_fn = {}
	for row in (doc.field_tags or []):
		if row.synthetic:
			synthetic_by_fn[row.field_name] = {
				"field_name": row.field_name,
				"label": row.label,
				"male_value": row.male_value or "",
				"female_value": row.female_value or "",
				"expose": row.expose,
			}

	for ds in _DEFAULT_SYNTHETICS:
		if ds["field_name"] not in synthetic_by_fn:
			prev = existing.get(ds["field_name"] + ":", {})
			synthetic_by_fn[ds["field_name"]] = {
				"field_name": ds["field_name"],
				"label": ds["label"],
				"male_value": prev.get("male_value") or ds["male_value"],
				"female_value": prev.get("female_value") or ds["female_value"],
				"expose": prev.get("expose", 1),
			}

	custom_dts = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		pluck="frappe_doctype",
	)
	custom_dts = list(set(custom_dts))

	new_rows = []
	seen_neutral = set()

	for dt_name in sorted(custom_dts):
		try:
			meta = frappe.get_meta(dt_name)
		except Exception:
			continue

		source_table = "tab" + dt_name

		for field in meta.fields:
			if field.fieldtype in _SKIP_FIELDTYPES:
				continue
			if field.fieldname in _SKIP_FIELDNAMES:
				continue

			fn = field.fieldname
			label = field.label or _title_case(fn)

			if fn in neutral_fieldnames:
				if fn in seen_neutral:
					continue
				seen_neutral.add(fn)
				prev = existing.get(fn + ":", {})
				new_rows.append({
					"field_name": fn,
					"label": label,
					"male_value": prev.get("male_value", ""),
					"female_value": prev.get("female_value", ""),
					"jinja_tag": _compute_jinja_tag(fn, prev.get("male_value", ""), prev.get("female_value", ""), gender_field),
					"source_table": "",
					"source_doctype": "",
					"expose": prev.get("expose", 1),
					"synthetic": 0,
				})
			else:
				key = fn + ":" + source_table
				prev = existing.get(key, {})
				new_rows.append({
					"field_name": fn,
					"label": label,
					"male_value": prev.get("male_value", ""),
					"female_value": prev.get("female_value", ""),
					"jinja_tag": _compute_jinja_tag(fn, prev.get("male_value", ""), prev.get("female_value", ""), gender_field),
					"source_table": source_table,
					"source_doctype": dt_name,
					"expose": prev.get("expose", 1),
					"synthetic": 0,
				})

	new_rows.sort(key=lambda r: (r.get("label") or "").lower())

	all_synthetics = sorted(
		synthetic_by_fn.values(),
		key=lambda r: (r.get("label") or "").lower(),
	)
	for s in all_synthetics:
		s["jinja_tag"] = _compute_jinja_tag(
			s["field_name"], s.get("male_value", ""),
			s.get("female_value", ""), gender_field,
		)
		s["source_table"] = ""
		s["source_doctype"] = ""
		s["synthetic"] = 1

	doc.field_tags = []
	for row_data in new_rows + all_synthetics:
		doc.append("field_tags", row_data)

	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"total": len(doc.field_tags)}


def _compute_jinja_tag(field_name, male_value, female_value, gender_field):
	male = (male_value or "").strip()
	female = (female_value or "").strip()
	if male or female:
		return (
			"{{% if " + gender_field + " == 'Male' %}}"
			+ (male or field_name)
			+ "{{% else %}}"
			+ (female or field_name)
			+ "{{% endif %}}"
		)
	return "{{ " + field_name + " }}"


def _parse_csv(value):
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]
