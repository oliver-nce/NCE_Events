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
		})

	return {
		"page_name": doc.page_name,
		"page_title": doc.page_title,
		"male_hex": doc.male_hex,
		"female_hex": doc.female_hex,
		"panels": panels,
	}


@frappe.whitelist()
def get_panel_data_v2(page_name, panel_number, selections=None):
	"""Execute the Query Report for a v2 panel using Frappe's native report runner.

	Inter-panel filtering is applied Python-side after the report runs.
	No pagination — all matching rows are returned.
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

	# Run the report natively — same path as the Frappe report UI
	from frappe.desk.query_report import run as _run_report
	result = _run_report(report_name=panel.report_name, filters={}, user=frappe.session.user)
	raw_columns = result.get("columns") or []
	raw_data = result.get("result") or []

	# Parse columns into [{fieldname, label}]
	columns = _parse_report_column_defs(raw_columns)
	col_fieldnames = [c["fieldname"] for c in columns]

	# Convert rows to dicts
	if raw_data and isinstance(raw_data[0], (list, tuple)):
		rows = [frappe._dict(zip(col_fieldnames, row)) for row in raw_data]
	else:
		rows = [frappe._dict(row) if not isinstance(row, frappe._dict) else row for row in raw_data]

	# Apply inter-panel filter Python-side
	prev_sel = selections.get(str(prev_panel.panel_number)) if prev_panel else {}
	if prev_sel:
		if panel.where_clause:
			rows = _apply_python_filter(rows, panel.where_clause, selections)
		elif panel.root_doctype and prev_panel and prev_panel.root_doctype:
			link_field = _find_link_field(panel.root_doctype, prev_panel.root_doctype)
			if link_field and prev_sel.get("name"):
				filter_val = str(prev_sel["name"])
				rows = [r for r in rows if str(r.get(link_field, "")) == filter_val]

	return {
		"columns": columns,
		"rows": rows,
		"total": len(rows),
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
		combined = r'\b(' + '|'.join(re.escape(k) for k in sorted_keys) + r')\b'
		translated = re.sub(combined, lambda m: all_col_map.get(m.group(1), m.group(1)), translated)

	return {"translated": translated, "warnings": warnings}


@frappe.whitelist()
def get_report_columns(report_name):
	"""Return the column names for a Query Report by running its SQL with LIMIT 0."""
	sql = frappe.db.get_value("Report", report_name, "query")
	if not sql:
		return []
	sql = sql.strip().rstrip(";")
	try:
		frappe.db.sql(f"SELECT * FROM ({sql}) _cols LIMIT 0")
		cursor = frappe.db._cursor
		if cursor and cursor.description:
			return [d[0] for d in cursor.description]
	except Exception as e:
		frappe.log_error(str(e), "get_report_columns")
	return []


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
