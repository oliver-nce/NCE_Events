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


# ── Workspace sync ──


_PP_PAGE_PREFIX = "pp-"

_PAGE_SCRIPT_TEMPLATE = """frappe.pages["{page_name}"].on_page_show = function(wrapper) {{
	if (!wrapper._page_obj) {{
		wrapper._page_obj = frappe.ui.make_app_page({{
			parent: wrapper,
			title: "{page_title}",
			single_column: true,
		}});
	}}
	var page = wrapper._page_obj;
	if (wrapper._current === "{panel_page}" && wrapper._explorer) return;
	wrapper._current = "{panel_page}";
	if (wrapper._explorer) {{
		wrapper._explorer.destroy();
		wrapper._explorer = null;
	}}
	frappe.require([
		"/assets/nce_events/js/panel_page/store.js",
		"/assets/nce_events/js/panel_page/ui.js",
		"/assets/nce_events/css/panel_page.css",
	], function() {{
		wrapper._explorer = new nce_events.panel_page.Explorer(page, "{panel_page}");
	}});
}};"""


def sync_workspace_shortcuts(doc=None, method=None):
	"""Keep workspace shortcuts in sync with active Panel Pages.

	For each active Panel Page:
	  1. Create a real Frappe Page record (so workspace shortcuts can reference it)
	  2. Add a workspace shortcut pointing to that page

	For inactive/deleted Panel Pages:
	  1. Remove the Frappe Page record
	  2. Remove the workspace shortcut
	"""
	active_pages = frappe.get_all(
		"Panel Page", filters={"active": 1}, fields=["page_name", "page_title"]
	)
	active_frappe_names = {f"{_PP_PAGE_PREFIX}{pg.page_name}" for pg in active_pages}

	# ── Sync Frappe Page records ──

	existing_pp_pages = frappe.get_all(
		"Page",
		filters=[["name", "like", f"{_PP_PAGE_PREFIX}%"], ["module", "=", "NCE Events"]],
		fields=["name"],
		pluck="name",
	)

	# Remove pages for inactive/deleted Panel Pages
	for page_name in existing_pp_pages:
		if page_name not in active_frappe_names:
			frappe.delete_doc("Page", page_name, force=True, ignore_permissions=True)

	# Create/update pages for active Panel Pages
	for pg in active_pages:
		frappe_page_name = f"{_PP_PAGE_PREFIX}{pg.page_name}"
		script = _PAGE_SCRIPT_TEMPLATE.format(
			page_name=frappe_page_name,
			page_title=pg.page_title.replace('"', '\\"'),
			panel_page=pg.page_name.replace('"', '\\"'),
		)

		_save_page(frappe_page_name, pg.page_title, script)

	# ── Sync workspace shortcuts ──

	if not frappe.db.exists("Workspace", "NCE Events"):
		return

	ws = frappe.get_doc("Workspace", "NCE Events")

	# Remove all managed shortcuts (pp- pages, panel-view, and old URL attempts)
	ws.shortcuts = [
		s for s in ws.shortcuts
		if not (s.link_to or "").startswith(_PP_PAGE_PREFIX)
		and not (s.link_to or "").startswith("panel-view")
		and not (s.link_to or "").startswith("/app/panel-view")
	]

	try:
		content = json.loads(ws.content or "[]")
	except (json.JSONDecodeError, TypeError):
		content = []

	content = [
		b for b in content
		if not str(b.get("id", "")).startswith("pp_shortcut_")
		and b.get("id") != "panel_view_shortcut"
	]

	# Add shortcuts for active Panel Pages
	for pg in active_pages:
		frappe_page_name = f"{_PP_PAGE_PREFIX}{pg.page_name}"
		ws.append("shortcuts", {
			"color": "Blue",
			"doc_view": "",
			"label": pg.page_title,
			"link_to": frappe_page_name,
			"type": "Page",
		})
		content.append({
			"id": f"pp_shortcut_{pg.page_name}",
			"type": "shortcut",
			"data": {"shortcut_name": pg.page_title, "col": 4},
		})

	ws.content = json.dumps(content)
	ws.save(ignore_permissions=True)
	frappe.db.commit()


def _save_page(frappe_page_name, title, script):
	"""Create or update a Frappe Page, temporarily enabling developer mode."""
	was_dev = frappe.conf.developer_mode
	frappe.conf.developer_mode = True
	try:
		if frappe.db.exists("Page", frappe_page_name):
			page_doc = frappe.get_doc("Page", frappe_page_name)
			page_doc.title = title
			page_doc.script = script
			page_doc.save(ignore_permissions=True)
		else:
			page_doc = frappe.get_doc({
				"doctype": "Page",
				"name": frappe_page_name,
				"page_name": frappe_page_name,
				"title": title,
				"module": "NCE Events",
				"standard": "No",
				"script": script,
				"roles": [{"role": "System Manager"}],
			})
			page_doc.insert(ignore_permissions=True)
	finally:
		frappe.conf.developer_mode = was_dev


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


def _parse_csv(value):
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]
