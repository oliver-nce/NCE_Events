"""Copy Display Settings data to new Settings single doctype."""
import frappe


def execute():
	if not frappe.db.table_exists("tabDisplay Settings"):
		return
	if not frappe.db.table_exists("tabSettings"):
		return

	doc = frappe.db.get_value(
		"Display Settings",
		"Display Settings",
		["font_family", "font_weight", "font_size", "text_color", "muted_text_color"],
		as_dict=True,
	)
	if not doc:
		return

	settings = frappe.get_single("Settings")
	settings.font_family = doc.get("font_family") or "Inter"
	settings.font_weight = doc.get("font_weight") or "400 Regular"
	settings.font_size = doc.get("font_size") or "13px"
	settings.text_color = doc.get("text_color") or "#333333"
	settings.muted_text_color = doc.get("muted_text_color") or "#555555"
	settings.default_provider = "Anthropic"
	settings.flags.ignore_permissions = True
	settings.save()
	frappe.db.commit()
