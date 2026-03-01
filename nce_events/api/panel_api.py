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
def build_page(page_name):
	"""Create or update the Frappe Page record for a Page Definition, and ensure
	a shortcut exists in the NCE Events workspace."""
	doc = frappe.get_doc("Page Definition", page_name)
	script = _page_script(doc.page_name, doc.page_title)

	if frappe.db.exists("Page", page_name):
		page = frappe.get_doc("Page", page_name)
		page.title = doc.page_title
		page.script = script
		page.save(ignore_permissions=True)
	else:
		page = frappe.get_doc({
			"doctype": "Page",
			"name": page_name,
			"page_name": page_name,
			"title": doc.page_title,
			"module": "NCE Events",
			"standard": "No",
			"script": script,
			"roles": [{"role": "System Manager"}],
		})
		page.insert(ignore_permissions=True)

	_ensure_workspace_shortcut(page_name, doc.page_title)
	frappe.db.commit()

	return {"page_url": f"/app/{page_name}"}


def _page_script(page_name, page_title):
	return (
		f'frappe.pages["{page_name}"].on_page_show = function(wrapper) {{\n'
		f'\tif (!wrapper._page_obj) {{\n'
		f'\t\twrapper._page_obj = frappe.ui.make_app_page({{\n'
		f'\t\t\tparent: wrapper,\n'
		f'\t\t\ttitle: "{page_title}",\n'
		f'\t\t\tsingle_column: true,\n'
		f'\t\t}});\n'
		f'\t}}\n'
		f'\tvar page = wrapper._page_obj;\n'
		f'\tif (wrapper._explorer) return;\n'
		f'\tfrappe.require([\n'
		f'\t\t"/assets/nce_events/js/panel_page/store.js",\n'
		f'\t\t"/assets/nce_events/js/panel_page/ui.js",\n'
		f'\t\t"/assets/nce_events/css/panel_page.css",\n'
		f'\t], function() {{\n'
		f'\t\twrapper._explorer = new nce_events.panel_page.ExplorerV2(page, "{page_name}");\n'
		f'\t}});\n'
		f'}};\n'
	)


def _ensure_workspace_shortcut(page_name, page_title):
	try:
		workspace = frappe.get_doc("Workspace", "NCE Events")
		for s in workspace.shortcuts:
			if s.link_to == page_name:
				s.label = page_title
				workspace.save(ignore_permissions=True)
				return
		workspace.append("shortcuts", {
			"label": page_title,
			"type": "Page",
			"link_to": page_name,
		})
		workspace.save(ignore_permissions=True)
	except frappe.DoesNotExistError:
		pass


def _parse_csv(value):
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]
