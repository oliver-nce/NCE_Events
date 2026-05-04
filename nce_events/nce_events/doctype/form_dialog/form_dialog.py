import frappe
from frappe.model.document import Document

from nce_events.api.form_dialog.button_visibility import HIDE_IF_SQL, validate_hide_if_sql


class FormDialog(Document):
    def validate(self):
        if self.target_doctype:
            _assert_doctype_in_wp_tables(self.target_doctype)
        for row in self.buttons or []:
            if getattr(row, "hide_if", None) == HIDE_IF_SQL:
                validate_hide_if_sql(getattr(row, "hide_if_sql", None) or "")
        if getattr(self, "submit_hide_if", None) == HIDE_IF_SQL:
            validate_hide_if_sql(getattr(self, "submit_hide_if_sql", None) or "")


def _assert_doctype_in_wp_tables(doctype: str) -> None:
    """Raise if the DocType is not listed in WP Tables (nce_sync)."""
    if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
        frappe.throw(
            f"DocType '{doctype}' is not listed in WP Tables and cannot be used for Form Dialogs."
        )
