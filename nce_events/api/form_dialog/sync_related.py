"""
Post-save linked DocType sync for Form Dialog read-back.

After the main write-back job finishes (WP ← Frappe push), WP-side triggers may
create or update rows in related tables (e.g. Event Sessions). This endpoint
enqueues nce_sync's run_sync_linked_doctype_rows_job for each direct-link related
DocType on the Form Dialog so those rows are pulled back into Frappe before "Show
changes" is shown. The job runner is enqueued directly (bypassing the whitelisted
delete-permission gate) so the mirror rebuild is not blocked by the caller's
permissions.
"""

from __future__ import annotations

import json
from uuid import uuid4

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
    Enqueue nce_sync's run_sync_linked_doctype_rows_job for each direct-link
    related DocType in the Form Dialog and return the resulting job_ids.

    The job runner is enqueued directly (rather than via the whitelisted
    sync_linked_doctype_rows wrapper) so the mirror rebuild runs regardless of
    the caller's delete permission on the child DocType — see the inline note at
    the enqueue call for the rationale and its safety constraints.

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

    job_ids: list[str] = []

    for row in dialog_doc.related_doctypes or []:
        child_dt = cstr(row.child_doctype or "").strip()
        link_field = cstr(row.link_field or "").strip()

        if not child_dt or not link_field:
            continue

        hop_chain_raw = cstr(getattr(row, "hop_chain", "") or "").strip()
        try:
            hop_chain_list = json.loads(hop_chain_raw) if hop_chain_raw else []
        except (ValueError, TypeError):
            hop_chain_list = [hop_chain_raw]
        if hop_chain_list:
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
            continue

        # Bypass the whitelisted sync_linked_doctype_rows wrapper (which gates on
        # the caller's delete permission) and enqueue the job runner directly. The
        # runner deletes mirror rows via frappe.db.delete (no per-user permission
        # check), so the resync is a controlled, config-driven mirror rebuild — it
        # must run regardless of whether the current user can delete the child.
        # A generated job_id lets the readback poll it via get_sync_job_status.
        try:
            job_id = str(uuid4())
            frappe.enqueue(
                "nce_sync.utils.data_sync.run_sync_linked_doctype_rows_job",
                queue="default",
                timeout=3600,
                job_id=job_id,
                doctype=child_dt,
                link_field=link_field,
                link_value=root_name,
                user=frappe.session.user,
            )
            job_ids.append(job_id)
        except Exception as e:
            frappe.clear_last_message()
            frappe.log_error(
                title=f"trigger_linked_sync_for_dialog_readback: {child_dt}",
                message=cstr(e),
            )

    return {"sync_job_ids": job_ids}
