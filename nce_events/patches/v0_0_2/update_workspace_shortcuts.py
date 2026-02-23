import json

import frappe


def execute():
	"""Add Panel View shortcut to the NCE Events workspace."""
	if not frappe.db.exists("Workspace", "NCE Events"):
		return

	ws = frappe.get_doc("Workspace", "NCE Events")

	# Check if Panel View shortcut already exists
	has_panel_view = any(s.label == "Panel View" for s in ws.shortcuts)
	if has_panel_view:
		return

	# Add the shortcut row
	ws.append("shortcuts", {
		"color": "Blue",
		"doc_view": "",
		"label": "Panel View",
		"link_to": "panel-view",
		"type": "Page",
	})

	# Update the content JSON to include the shortcut block
	try:
		content = json.loads(ws.content or "[]")
	except (json.JSONDecodeError, TypeError):
		content = []

	has_block = any(
		b.get("id") == "panel_view_shortcut" for b in content
	)
	if not has_block:
		content.append({
			"id": "panel_view_shortcut",
			"type": "shortcut",
			"data": {"shortcut_name": "Panel View", "col": 4},
		})
		ws.content = json.dumps(content)

	ws.save(ignore_permissions=True)
	frappe.db.commit()
