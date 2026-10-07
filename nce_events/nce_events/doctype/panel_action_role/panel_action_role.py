"""Frappe Document subclass for Panel Action Role child-table rows linking actions to roles.

code-index:begin
{
 "purpose": "Frappe Document subclass for Panel Action Role child-table rows linking actions to roles.",
 "read_when": "Adding server-side hooks for panel action role assignments.",
 "gotchas": [],
 "keywords": ["PanelActionRole", "Document", "frappe", "panel_action_role"],
 "format": 1
}
code-index:end
"""

from frappe.model.document import Document


class PanelActionRole(Document):
	pass
