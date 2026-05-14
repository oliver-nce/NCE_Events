"""
Post-save linked DocType sync for Form Dialog read-back.

After the main write-back job finishes (WP ← Frappe push), WP-side triggers may
create or update rows in related tables (e.g. Event Sessions). This endpoint
queues nce_sync.api.sync_linked_doctype_rows for each direct-link related DocType
on the Form Dialog so those rows are pulled back into Frappe before "Show changes"
is shown.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, cstr


@frappe.whitelist()
def trigger_linked_sync_for_dialog_readback(
    definition: str,
    root_doctype: str,
    root_name: str,
) -> dict:
    """
    Queue nce_sync.api.sync_linked_doctype_rows for each direct-link related
    DocType in the Form Dialog and return the resulting job_ids.

    Only processes rows where:
    - child_doctype and link_field are set
    - hop_chain is empty (direct link only)
    - child_doctype is in WP Tables with Mirrored or Linked status

    Args:
        definition: Form Dialog document name.
        root_doctype: Must match the Form Dialog target_doctype.
        root_name: Primary key of the root document (used as link_value).

    Returns:
        ``{ "sync_job_ids": ["<uuid>", ...] }``
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)

    definition = cstr(definition or "").strip()
    root_doctype = cstr(root_doctype or "").strip()
    root_name = cstr(root_name or "").strip()

    if not definition or not root_doctype or not root_name:
        frappe.throw(_("Missing parameters"))

    if not frappe.has_permission(root_doctype, "read", doc=root_name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    prev = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        dialog_doc = frappe.get_doc("Form Dialog", definition)
    finally:
        frappe.flags.ignore_permissions = prev

    if not cint(dialog_doc.is_active):
        return {"sync_job_ids": []}

    if cstr(dialog_doc.target_doctype or "").strip() != root_doctype:
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    if not frappe.db.exists("DocType", "WP Tables"):
        return {"sync_job_ids": []}

    from nce_sync.api import sync_linked_doctype_rows

    job_ids: list[str] = []
    diag: list[str] = []
    diag.append(f"definition={definition!r} root_doctype={root_doctype!r} root_name={root_name!r}")
    diag.append(f"related_doctypes count={len(dialog_doc.related_doctypes or [])}")

    for row in dialog_doc.related_doctypes or []:
        child_dt = cstr(row.child_doctype or "").strip()
        link_field = cstr(row.link_field or "").strip()
        diag.append(f"row: child_dt={child_dt!r} link_field={link_field!r}")

        if not child_dt or not link_field:
            diag.append("  → skip: missing child_dt or link_field")
            continue

        hop_chain = cstr(getattr(row, "hop_chain", "") or "").strip()
        if hop_chain:
            diag.append(f"  → skip: hop_chain={hop_chain!r}")
            continue

        wp_rows = frappe.get_all(
            "WP Tables",
            filters={
                "frappe_doctype": child_dt,
                "mirror_status": ["in", ["Mirrored", "Linked"]],
            },
            fields=["name"],
            limit_page_length=1,
        )
        if not wp_rows:
            diag.append(f"  → skip: no WP Tables entry for {child_dt!r}")
            continue

        try:
            result = sync_linked_doctype_rows(
                doctype=child_dt,
                link_field=link_field,
                link_value=root_name,
            )
            job_id = cstr(result.get("job_id") or "").strip()
            diag.append(f"  → queued job_id={job_id!r} result_keys={list(result.keys())}")
            if job_id:
                job_ids.append(job_id)
            else:
                diag.append("  → WARNING: job_id was empty!")
        except Exception as e:
            diag.append(f"  → EXCEPTION: {cstr(e)[:300]}")
            frappe.log_error(
                title=f"trigger_linked_sync_for_dialog_readback: {child_dt}",
                message=cstr(e),
            )

    diag.append(f"final job_ids={job_ids!r}")
    frappe.log_error(
        title="trigger_linked_sync_for_dialog_readback DIAG",
        message="\n".join(diag),
    )
    return {"sync_job_ids": job_ids}
