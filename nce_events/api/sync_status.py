from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cstr


@frappe.whitelist()
def is_doctype_sync_busy(doctype: str) -> dict[str, bool]:
    """True when a WP→Frappe sync is active for this DocType (nce_sync sync gate)."""
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)

    dt = cstr(doctype or "").strip()
    if not dt:
        frappe.throw(_("Missing doctype"))

    from nce_sync.utils.sync_gate import is_doctype_syncing

    return {"busy": bool(is_doctype_syncing(dt))}


@frappe.whitelist()
def get_sync_job_status(job_id: str) -> str | None:
    """
    Return the RQ status string for job_id: 'queued', 'started',
    'finished', 'failed', 'stopped', or None if the record is gone.
    Only logged-in users may call this.
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)

    job_id = (job_id or "").strip()
    if not job_id:
        frappe.throw(_("Missing job_id"))

    try:
        from frappe.utils.background_jobs import get_job_status
        st = get_job_status(job_id)
        if st is None:
            return "missing"
        return st.value  # e.g. 'finished', 'failed', 'queued', 'started', 'stopped'
    except Exception:
        return "missing"
