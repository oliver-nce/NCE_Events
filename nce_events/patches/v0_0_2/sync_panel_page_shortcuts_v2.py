import json

import frappe


def execute():
	"""Replace static workspace shortcuts with per-Panel-Page shortcuts."""
	if not frappe.db.exists("Workspace", "NCE Events"):
		return

	ws = frappe.get_doc("Workspace", "NCE Events")

	active_pages = frappe.get_all(
		"Panel Page", filters={"active": 1}, fields=["page_name", "page_title"]
	)

	# Rebuild shortcuts: keep non-panel-view shortcuts, replace the rest
	kept = []
	for s in ws.shortcuts:
		link = s.link_to or ""
		if s.type == "Page" and link == "panel-view":
			continue
		if s.type == "URL" and link.startswith("/app/panel-view/"):
			continue
		kept.append(s)
	ws.shortcuts = kept

	for pg in active_pages:
		ws.append("shortcuts", {
			"color": "Blue",
			"doc_view": "",
			"label": pg.page_title,
			"link_to": "/app/panel-view/" + pg.page_name,
			"type": "URL",
		})

	# Rebuild content JSON: keep non-panel blocks, add new ones
	try:
		content = json.loads(ws.content or "[]")
	except (json.JSONDecodeError, TypeError):
		content = []

	cleaned = []
	for block in content:
		bid = block.get("id", "")
		if bid == "panel_view_shortcut":
			continue
		if bid.startswith("pp_shortcut_"):
			continue
		cleaned.append(block)

	for pg in active_pages:
		cleaned.append({
			"id": "pp_shortcut_" + pg.page_name,
			"type": "shortcut",
			"data": {"shortcut_name": pg.page_title, "col": 4},
		})

	ws.content = json.dumps(cleaned)
	ws.flags.ignore_validate = True
	ws.save(ignore_permissions=True)
	frappe.db.commit()
