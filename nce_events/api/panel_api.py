import csv
import io
import json
import os
import re

import frappe
from frappe import _


@frappe.whitelist()
def get_page_config(page_name):
	"""Fetch full Page Definition configuration for the client."""
	doc = frappe.get_doc("Page Definition", page_name)

	panels = []
	for p in sorted(doc.panels, key=lambda x: x.panel_number):
		panels.append({
			"panel_number": p.panel_number,
			"header_text": p.header_text,
			"report_name": p.report_name,
			"root_doctype": p.root_doctype,
			"where_clause": p.where_clause,
			"hidden_fields": _parse_csv(p.hidden_fields),
			"bold_fields": _parse_csv(p.bold_fields),
			"card_fields": _parse_csv(p.card_fields),
			"male_field": (p.male_field or "").strip(),
			"female_field": (p.female_field or "").strip(),
			"show_filter": p.show_filter,
			"show_sheets": p.show_sheets,
			"show_email": p.show_email,
			"show_sms": p.show_sms,
			"show_card_email": p.show_card_email,
			"show_card_sms": p.show_card_sms,
			"button_1_name": p.button_1_name,
			"button_1_code": p.button_1_code,
			"button_2_name": p.button_2_name,
			"button_2_code": p.button_2_code,
			"header_overrides": _parse_json(p.header_overrides),
			"column_order": _parse_csv(p.column_order),
			"gender_column": (p.gender_column or "").strip(),
			"gender_color_fields": _parse_csv(p.gender_color_fields),
		})

	return {
		"page_name": doc.page_name,
		"page_title": doc.page_title,
		"male_hex": doc.male_hex,
		"female_hex": doc.female_hex,
		"panels": panels,
	}


@frappe.whitelist()
def get_panel_data(page_name, panel_number, selections=None):
	"""Execute the Query Report for a panel using Frappe's native report runner.

	Inter-panel filtering is applied Python-side after the report runs.
	No pagination — all matching rows are returned.
	"""
	columns, rows = _run_panel_report(page_name, int(panel_number), selections)
	return {
		"columns": columns,
		"rows": rows,
		"total": len(rows),
	}


_ROSTER_HASH = "wwe78f6q87ey97f86q9e8fqw98ef"


@frappe.whitelist()
def export_panel_data(page_name, panel_number, selections=None):
	"""Export a panel's current data as CSV to a public path and return its URL."""
	panel_number = int(panel_number)
	columns, rows = _run_panel_report(page_name, panel_number, selections)

	col_fieldnames = [c["fieldname"] for c in columns]
	labels = [c["label"] for c in columns]

	output = io.StringIO()
	writer = csv.writer(output)
	writer.writerow(labels)
	for row in rows:
		writer.writerow([row.get(fn, "") for fn in col_fieldnames])
	csv_content = output.getvalue()

	safe_page = _safe_filename(page_name)
	filename = f"{safe_page}_{panel_number}.csv"

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


def _run_panel_report(page_name, panel_number, selections=None):
	"""Shared logic: run a panel's report and apply inter-panel filtering.

	Returns (columns, rows) where columns is [{fieldname, label}] and
	rows is a list of frappe._dict.
	"""
	panel_number = int(panel_number)

	if isinstance(selections, str):
		selections = json.loads(selections) if selections else {}
	selections = selections or {}

	doc = frappe.get_doc("Page Definition", page_name)

	panel = None
	prev_panel = None
	for p in sorted(doc.panels, key=lambda x: x.panel_number):
		if p.panel_number == panel_number:
			panel = p
			break
		prev_panel = p

	if not panel:
		frappe.throw(_("Panel {0} not found in page {1}").format(panel_number, page_name))

	from frappe.desk.query_report import run as _run_report
	result = _run_report(report_name=panel.report_name, filters={}, user=frappe.session.user)
	raw_columns = result.get("columns") or []
	raw_data = result.get("result") or []

	columns = _parse_report_column_defs(raw_columns)
	col_fieldnames = [c["fieldname"] for c in columns]

	if raw_data and isinstance(raw_data[0], (list, tuple)):
		rows = [frappe._dict(zip(col_fieldnames, row)) for row in raw_data]
	else:
		rows = [frappe._dict(row) if not isinstance(row, frappe._dict) else row for row in raw_data]

	prev_sel = selections.get(str(prev_panel.panel_number)) if prev_panel else {}
	if prev_sel:
		if panel.where_clause:
			rows = _apply_python_filter(rows, panel.where_clause, selections)
		elif panel.root_doctype and prev_panel and prev_panel.root_doctype:
			link_field = _find_link_field(panel.root_doctype, prev_panel.root_doctype)
			if link_field and prev_sel.get("name"):
				filter_val = str(prev_sel["name"])
				rows = [r for r in rows if str(r.get(link_field, "")) == filter_val]

	return columns, rows


# ── Internal helpers ──


_WHERE_REF_RE = re.compile(r"\{panel_(\d+)\.(\w+)\}")


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


def _parse_report_column_defs(columns):
	"""Parse Frappe report column definitions into [{fieldname, label}]."""
	result = []
	for c in columns:
		if isinstance(c, dict):
			fn = c.get("fieldname") or c.get("field") or ""
			label = c.get("label") or _title_case(fn)
		elif isinstance(c, str):
			parts = c.split(":")
			fn = parts[0].strip()
			label = parts[1].strip() if len(parts) > 1 else _title_case(fn)
		else:
			fn = str(c)
			label = _title_case(fn)
		result.append({"fieldname": fn, "label": label})
	return result


def _apply_python_filter(rows, where_clause, selections):
	"""Apply a simple {panel_N.fieldname} = value WHERE clause Python-side.

	Handles basic equality patterns: `field = {panel_N.fieldname}`.
	Complex expressions should be embedded directly in the report SQL.
	"""
	def _get_val(match):
		panel_num, field = match.group(1), match.group(2)
		return str((selections.get(str(panel_num)) or {}).get(field, ""))

	def _row_matches(row):
		clause = _WHERE_REF_RE.sub(_get_val, where_clause)
		# Evaluate simple `field op value` patterns
		for m in re.finditer(r'(\w+)\s*(=|!=|>|<)\s*[\'"]?([^\'"]+)[\'"]?', clause):
			field, op, val = m.group(1), m.group(2), m.group(3).strip()
			cell = str(row.get(field, ""))
			if op == "=" and cell != val: return False
			if op == "!=" and cell == val: return False
			if op == ">" and not (float(cell or 0) > float(val or 0)): return False
			if op == "<" and not (float(cell or 0) < float(val or 0)): return False
		return True

	return [r for r in rows if _row_matches(r)]


def _title_case(fieldname):
	return fieldname.replace("_", " ").title()


def _safe_filename(value):
	"""Sanitize a string for use as a filesystem filename component."""
	return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(value))


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

	# Pre-build per-table column maps
	table_col_maps = {}   # wp_table_name -> {wp_col: frappe_field}
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
					# is_name:true means this WP column is the PK → Frappe primary key = "name"
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

	# ── Pass 1: qualified table.column → `tabFrappe`.frappe_field  (no cascade risk) ──
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

	# ── Pass 2: bare WP table names ──
	for wt in wp_tables:
		tname = wt.get("table_name")
		frappe_doctype = wt.get("frappe_doctype")
		if not tname or not frappe_doctype:
			continue
		frappe_table = "`tab" + frappe_doctype + "`"
		translated = re.sub(r'\b' + re.escape(tname) + r'\b', frappe_table, translated, flags=re.IGNORECASE)

	# ── Pass 3: remaining bare column names — single pass, longest key first ──
	all_col_map = {}
	for col_map in table_col_maps.values():
		for wp_col, frappe_col in col_map.items():
			if wp_col not in all_col_map:
				all_col_map[wp_col] = frappe_col

	if all_col_map:
		sorted_keys = sorted(all_col_map.keys(), key=len, reverse=True)
		# (?<!\.) skips already-qualified Frappe fields like `tabEvents`.name
		combined = r'(?<!\.)\b(' + '|'.join(re.escape(k) for k in sorted_keys) + r')\b'
		translated = re.sub(combined, lambda m: all_col_map.get(m.group(1), m.group(1)), translated)

	return {"translated": translated, "warnings": warnings}


@frappe.whitelist()
def get_report_columns(report_name):
	"""Return the column fieldnames for a Query Report, using the same parsing
	path as get_panel_data so names are guaranteed to match at runtime."""
	try:
		from frappe.desk.query_report import run as _run_report
		result = _run_report(report_name=report_name, filters={}, user=frappe.session.user)
		raw_columns = result.get("columns") or []
		columns = _parse_report_column_defs(raw_columns)
		return [c["fieldname"] for c in columns]
	except Exception as e:
		frappe.log_error(str(e), "get_report_columns")
	return []


@frappe.whitelist()
def get_active_pages():
	"""Return list of active Page Definition records for the landing page."""
	return frappe.get_all(
		"Page Definition",
		filters={"active": 1},
		fields=["page_name", "page_title"],
		order_by="page_title asc",
	)


@frappe.whitelist()
def build_page(page_name):
	"""Ensure a workspace shortcut exists for a Page Definition and return its URL."""
	doc = frappe.get_doc("Page Definition", page_name)
	_ensure_workspace_shortcut(page_name, doc.page_title)
	frappe.db.commit()
	return {"page_url": f"/app/page-view/{page_name}"}


def _ensure_workspace_shortcut(page_name, page_title):
	try:
		workspace = frappe.get_doc("Workspace", "NCE Events")
		page_url = f"/app/page-view/{page_name}"

		# Update existing shortcut if already present
		for s in workspace.shortcuts:
			if s.get("url") == page_url:
				s.label = page_title
				workspace.save(ignore_permissions=True)
				frappe.clear_cache()
				return

		# Add to shortcuts child table
		workspace.append("shortcuts", {
			"label": page_title,
			"type": "URL",
			"url": page_url,
		})

		# Also inject a shortcut block into the content JSON — the workspace
		# page renders from content, not the child table alone.
		try:
			content = json.loads(workspace.content or "[]")
		except (json.JSONDecodeError, TypeError):
			content = []

		content.append({
			"id": frappe.generate_hash("", 10),
			"type": "shortcut",
			"data": {
				"shortcut_name": page_title,
				"col": 4,
			},
		})
		workspace.content = json.dumps(content)
		workspace.save(ignore_permissions=True)
		frappe.clear_cache()
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "build_page: workspace shortcut failed")
		frappe.throw(_(f"Shortcut creation failed: {e}"))


def _parse_csv(value):
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]


def _parse_json(value):
	"""Parse a JSON string into a dict, returning {} on failure."""
	if not value:
		return {}
	try:
		return json.loads(value)
	except (json.JSONDecodeError, TypeError):
		return {}
