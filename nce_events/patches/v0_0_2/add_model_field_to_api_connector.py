"""Add model field to API Connector so each provider can set its default model.

code-index:begin
{
 "purpose": "Migration patch adding a model Custom Field to API Connector for default LLM model.",
 "read_when": "Tracing API Connector schema changes or why model field is missing on old sites.",
 "gotchas": [],
 "keywords": ["API Connector", "model", "Custom Field", "migration", "execute"],
 "format": 1
}
code-index:end
"""
import frappe


def execute():
	if not frappe.db.table_exists("tabAPI Connector"):
		return
	if frappe.db.exists("Custom Field", {"dt": "API Connector", "fieldname": "model"}):
		return

	frappe.get_doc(
		{
			"doctype": "Custom Field",
			"dt": "API Connector",
			"fieldname": "model",
			"label": "Model",
			"fieldtype": "Data",
			"description": "Default model for this provider (e.g. claude-sonnet-4-20250514). Leave blank to use built-in default.",
			"insert_after": "password",
		}
	).insert(ignore_permissions=True)
	frappe.db.commit()
