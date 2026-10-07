"""Form Dialog Document controller: validates edit conditions and requires DocType in WP Tables.

code-index:begin
{
 "purpose": "Form Dialog Document controller: validates edit conditions and requires DocType in WP Tables.",
 "read_when": "Adding Form Dialog server validation or WP Tables membership checks.",
 "gotchas": [],
 "keywords": ["FormDialog", "validate", "_assert_doctype_in_wp_tables", "WP Tables", "button_visibility", "edit_condition"],
 "format": 1
}
code-index:end
"""

import frappe
from frappe.model.document import Document

from nce_events.api.form_dialog.button_visibility import HIDE_IF_SQL, validate_hide_if_sql
from nce_events.api.form_dialog.edit_condition import (
	resolve_edit_condition_labels,
	validate_edit_condition,
)


class FormDialog(Document):
    def validate(self):
        if self.target_doctype:
            _assert_doctype_in_wp_tables(self.target_doctype)
        for row in self.buttons or []:
            if getattr(row, "hide_if", None) == HIDE_IF_SQL:
                validate_hide_if_sql(getattr(row, "hide_if_sql", None) or "")
        if getattr(self, "submit_hide_if", None) == HIDE_IF_SQL:
            validate_hide_if_sql(getattr(self, "submit_hide_if_sql", None) or "")
        root_dt = (self.target_doctype or "").strip()
        if root_dt:
            for row in (self.related_doctypes or []) + (self.inline_child_tables or []):
                raw = (getattr(row, "edit_condition", None) or "").strip()
                if not raw:
                    continue
                resolved = resolve_edit_condition_labels(raw, root_dt)
                row.edit_condition = validate_edit_condition(resolved, root_dt)


def _assert_doctype_in_wp_tables(doctype: str) -> None:
    """Raise if the DocType is not listed in WP Tables (nce_sync)."""
    if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
        frappe.throw(
            f"DocType '{doctype}' is not listed in WP Tables and cannot be used for Form Dialogs."
        )
