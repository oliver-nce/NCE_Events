import json
import re

import frappe
from frappe import _


@frappe.whitelist()
def get_active_pages():
	"""Return list of active Panel Page records for the landing page."""
	return frappe.get_all(
		"Panel Page",
		filters={"active": 1},
		fields=["page_name", "page_title"],
		order_by="page_title asc",
	)


@frappe.whitelist()
def get_page_config(page_name):
	"""Fetch full Panel Page configuration for the client."""
	doc = frappe.get_doc("Panel Page", page_name)

	panels = []
	for p in sorted(doc.panels, key=lambda x: x.panel_number):
		panels.append({
			"panel_number": p.panel_number,
			"header_text": p.header_text,
			"sql_query": p.sql_query,
			"hidden_fields": _parse_csv(p.hidden_fields),
			"bold_fields": _parse_csv(p.bold_fields),
			"filter_fields": _parse_csv(p.filter_fields),
			"card_fields": _parse_csv(p.card_fields),
			"button_1_name": p.button_1_name,
			"button_1_code": p.button_1_code,
			"button_2_name": p.button_2_name,
			"button_2_code": p.button_2_code,
		})

	return {
		"page_name": doc.page_name,
		"page_title": doc.page_title,
		"male_hex": doc.male_hex,
		"female_hex": doc.female_hex,
		"panels": panels,
	}


@frappe.whitelist()
def get_panel_data(page_name, panel_number, selections=None, limit=50, start=0):
	"""Execute the SQL query for a specific panel.

	Args:
		page_name: Panel Page identifier
		panel_number: Which panel to fetch data for
		selections: JSON dict mapping panel numbers to selected row dicts
		            e.g. {"1": {"name": "EVT-001", "event_name": "Spring Camp"}}
		limit: Max rows (0 = no limit)
		start: Offset for pagination
	"""
	panel_number = int(panel_number)
	limit = int(limit)
	start = int(start)

	if isinstance(selections, str):
		selections = json.loads(selections) if selections else {}
	selections = selections or {}

	doc = frappe.get_doc("Panel Page", page_name)
	panel_def = None
	for p in doc.panels:
		if p.panel_number == panel_number:
			panel_def = p
			break

	if not panel_def:
		frappe.throw(_("Panel {0} not found in page {1}").format(panel_number, page_name))

	sql_template = panel_def.sql_query.strip().rstrip(";")

	processed_sql, params = _substitute_panel_refs(sql_template, selections)

	count_sql = f"SELECT COUNT(*) FROM ({processed_sql}) _cnt"
	total = frappe.db.sql(count_sql, params)[0][0]

	if limit:
		data_sql = f"{processed_sql} LIMIT {limit} OFFSET {start}"
	else:
		data_sql = processed_sql

	rows = frappe.db.sql(data_sql, params, as_dict=True)

	columns = list(rows[0].keys()) if rows else _get_columns_from_empty(processed_sql, params)

	return {
		"columns": columns,
		"rows": rows,
		"total": total,
		"start": start,
		"limit": limit,
	}



# ── Internal helpers ──


_PANEL_REF_RE = re.compile(r"p(\d+)\.(\w+)")


def _substitute_panel_refs(sql, selections):
	"""Replace p{N}.fieldname tokens with parameterized placeholders.

	Returns (processed_sql, params_dict). Uses %(key)s placeholders
	so values are properly escaped by the database driver.
	"""
	params = {}

	def _replacer(match):
		panel_num = match.group(1)
		field_name = match.group(2)
		param_key = f"p{panel_num}_{field_name}"
		panel_sel = selections.get(str(panel_num)) or selections.get(int(panel_num)) or {}
		value = panel_sel.get(field_name)
		if value is None:
			frappe.throw(
				_("Missing selection: p{0}.{1} is required but no row is selected in panel {0}").format(
					panel_num, field_name
				)
			)
		params[param_key] = value
		return f"%({param_key})s"

	processed = _PANEL_REF_RE.sub(_replacer, sql)
	return processed, params


def _get_columns_from_empty(sql, params):
	"""Get column names when the query returns zero rows."""
	try:
		probe_sql = f"SELECT * FROM ({sql}) _probe LIMIT 0"
		frappe.db.sql(probe_sql, params)
		cursor = frappe.db._cursor
		if cursor and cursor.description:
			return [d[0] for d in cursor.description]
	except Exception:
		pass
	return []


@frappe.whitelist()
def get_page_config_v2(page_name):
	"""Fetch full Page Definition configuration for the v2 client."""
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
		})

	return {
		"page_name": doc.page_name,
		"page_title": doc.page_title,
		"male_hex": doc.male_hex,
		"female_hex": doc.female_hex,
		"panels": panels,
	}


@frappe.whitelist()
def get_panel_data_v2(page_name, panel_number, selections=None, limit=50, start=0):
	"""Execute the Query Report for a v2 panel with inter-panel filtering and pagination.

	Args:
		page_name:    Page Definition identifier
		panel_number: Which panel to fetch data for
		selections:   JSON dict mapping panel numbers to selected row dicts
		              e.g. {"1": {"name": "EVT-001", "event_name": "Spring Camp"}}
		limit:        Max rows (0 = no limit)
		start:        Offset for pagination
	"""
	panel_number = int(panel_number)
	limit = int(limit)
	start = int(start)

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

	report_data = frappe.db.get_value(
		"Report", panel.report_name, ["query", "columns"], as_dict=True
	)
	if not report_data or not report_data.query:
		frappe.throw(_("Report {0} not found or has no SQL query").format(panel.report_name))
	sql = report_data.query.strip().rstrip(";")
	params = {}

	# Apply inter-panel filter when a previous panel has a selection
	prev_sel = selections.get(str(prev_panel.panel_number)) if prev_panel else {}
	if prev_sel:
		if panel.where_clause:
			# Explicit WHERE clause with {panel_N.fieldname} substitution
			where, params = _substitute_where_clause(panel.where_clause, selections)
			sql = f"SELECT * FROM ({sql}) _v2 WHERE {where}"
		elif panel.root_doctype and prev_panel and prev_panel.root_doctype:
			# Auto: find a Link field on this panel's Root DocType → previous panel's Root DocType
			link_field = _find_link_field(panel.root_doctype, prev_panel.root_doctype)
			if link_field and prev_sel.get("name"):
				params["_v2_link"] = prev_sel["name"]
				sql = f"SELECT * FROM ({sql}) _v2 WHERE `{link_field}` = %(_v2_link)s"

	count_sql = f"SELECT COUNT(*) FROM ({sql}) _v2_cnt"
	total = frappe.db.sql(count_sql, params)[0][0]

	data_sql = f"{sql} LIMIT {limit} OFFSET {start}" if limit else sql
	rows = frappe.db.sql(data_sql, params, as_dict=True)

	raw_keys = list(rows[0].keys()) if rows else _get_columns_from_empty(data_sql, params)
	columns = _build_column_labels(report_data.columns, raw_keys)

	return {
		"columns": columns,
		"rows": rows,
		"total": total,
		"start": start,
		"limit": limit,
	}


# ── v2 internal helpers ──


_WHERE_REF_RE = re.compile(r"\{panel_(\d+)\.(\w+)\}")


def _substitute_where_clause(where_clause, selections):
	"""Replace {panel_N.fieldname} tokens in a WHERE clause with %(key)s placeholders.

	Returns (processed_where, params_dict).
	"""
	params = {}

	def _replacer(match):
		panel_num = match.group(1)
		field_name = match.group(2)
		param_key = f"_v2_p{panel_num}_{field_name}"
		panel_sel = selections.get(str(panel_num)) or {}
		value = panel_sel.get(field_name)
		if value is None:
			frappe.throw(
				_("Missing selection: panel_{0}.{1} is required but no row is selected in panel {0}").format(
					panel_num, field_name
				)
			)
		params[param_key] = value
		return f"%({param_key})s"

	processed = _WHERE_REF_RE.sub(_replacer, where_clause)
	return processed, params


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


def _build_column_labels(report_columns_raw, row_keys):
	"""Build a column list [{fieldname, label}] using report column defs where available."""
	col_map = {}
	try:
		defined = report_columns_raw or []
		if isinstance(defined, str):
			defined = json.loads(defined)
		for c in defined:
			if isinstance(c, dict):
				fn = c.get("fieldname") or c.get("field")
				lbl = c.get("label")
				if fn and lbl:
					col_map[fn] = lbl
			elif isinstance(c, str):
				# "fieldname:Label:Type:Width" format
				parts = c.split(":")
				if len(parts) >= 2 and parts[0] and parts[1]:
					col_map[parts[0]] = parts[1]
	except Exception:
		pass

	return [
		{"fieldname": k, "label": col_map.get(k) or _title_case(k)}
		for k in row_keys
	]


def _title_case(fieldname):
	return fieldname.replace("_", " ").title()


@frappe.whitelist()
def get_active_v2_pages():
	"""Return list of active Page Definition records for the v2 landing page."""
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
