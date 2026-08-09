"""
Post-save linked DocType sync for Form Dialog read-back.

After the main write-back job finishes (WP ← Frappe push), WP-side triggers may
create or update rows in related tables (e.g. Event Sessions). This endpoint
enqueues nce_sync's run_sync_linked_doctype_rows_job for each direct-link related
DocType on the Form Dialog so those rows are pulled back into Frappe before "Show
changes" is shown. The job runner is enqueued directly (bypassing the whitelisted
delete-permission gate) so the mirror rebuild is not blocked by the caller's
permissions.

Edit-lock (collision guard)
---------------------------
While a dialog edit is in flight, we mark every table the dialog touches (its
root DocType + its direct-link related DocTypes) as "under edit" so scheduled and
manual syncs stand down and another user's overlapping submit is refused. The
dialog acquires the marks at submit start (``begin_dialog_edit``) and clears them
when the whole flow finishes (``end_dialog_edit``); a short TTL in nce_sync is the
crash backstop. The dialog's own write-back / read-back jobs deliberately do NOT
consult the marks — they are part of the edit, not syncs to hold off.
"""

from __future__ import annotations

import json
from uuid import uuid4

import frappe
from frappe import _
from frappe.utils import cint, cstr

try:
    # Edit-lock primitives live in nce_sync; degrade gracefully if it is absent.
    from nce_sync.utils.sync_gate import acquire_crud_lock, release_crud_lock
except Exception:  # pragma: no cover - nce_sync always present in this deployment
    acquire_crud_lock = None
    release_crud_lock = None

try:
    from nce_sync.utils.constants import MAX_SYNC_JOB_RUNTIME_SEC
except Exception:  # pragma: no cover
    MAX_SYNC_JOB_RUNTIME_SEC = 300


def _load_dialog(definition: str, root_doctype: str):
    """
    Load and authorise a Form Dialog definition for the given root DocType.

    Returns the Form Dialog document, or None when it is inactive / not a match
    (callers treat None as "nothing to do"). Raises PermissionError on a genuine
    mismatch so a caller cannot target a dialog for another DocType.
    """
    definition = cstr(definition or "").strip()
    root_doctype = cstr(root_doctype or "").strip()
    if not definition or not root_doctype:
        frappe.throw(_("Missing parameters"))

    if not frappe.has_permission(root_doctype, "read"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    prev = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        dialog_doc = frappe.get_doc("Form Dialog", definition)
    finally:
        frappe.flags.ignore_permissions = prev

    if cstr(dialog_doc.target_doctype or "").strip() != root_doctype:
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    if not cint(dialog_doc.is_active):
        return None

    return dialog_doc


def _qualifying_related_links(dialog_doc) -> list[tuple[str, str]]:
    """
    Return the dialog's direct-link related tables as (child_doctype, link_field)
    pairs, limited to WP-mirrored tables. Rows with a hop_chain (indirect links)
    are skipped — only direct links are pulled back / locked here.
    """
    out: list[tuple[str, str]] = []
    if not dialog_doc:
        return out
    if not frappe.db.exists("DocType", "WP Tables"):
        return out

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

        out.append((child_dt, link_field))

    return out


def _dialog_edit_doctypes(dialog_doc, root_doctype: str) -> list[str]:
    """The full set of tables a dialog edit touches: root + direct-link related."""
    dts = {cstr(root_doctype or "").strip()}
    for child_dt, _lf in _qualifying_related_links(dialog_doc):
        dts.add(child_dt)
    return sorted(d for d in dts if d)


def _dialog_edit_owner(root_doctype: str) -> str:
    """
    Identity that holds the edit marks. Scoped to (root DocType, user): a single
    user runs one dialog submit at a time, and this same value is recomputable by
    both ``begin_dialog_edit`` and ``end_dialog_edit`` within the one session.
    """
    return f"dialogedit:{cstr(root_doctype or '').strip()}:{frappe.session.user}"


@frappe.whitelist()
def begin_dialog_edit(definition: str, root_doctype: str, root_name: str | None = None) -> dict:
    """
    Mark every table this dialog touches (root + direct-link related) as "under
    edit" for the current user, so syncs stand down and another user's overlapping
    submit is refused. Called at the very start of a dialog submit.

    Returns ``{"ok": 1, "locked": [<doctype>, ...]}`` on success. On conflict
    (another edit or a live sync holds one of the tables) raises so the submit
    aborts with a friendly message.
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)

    if acquire_crud_lock is None:
        return {"ok": 1, "locked": []}  # nce_sync unavailable → no marks

    # Fail-open on infrastructure problems: only a genuine conflict should ever
    # block a submit. A bug or Redis hiccup here must not stop people editing.
    try:
        dialog_doc = _load_dialog(definition, root_doctype)
    except frappe.PermissionError:
        raise
    except Exception:
        frappe.log_error(title="begin_dialog_edit: dialog load failed", message=frappe.get_traceback())
        return {"ok": 1, "locked": []}

    if dialog_doc is None:
        return {"ok": 1, "locked": []}  # inactive dialog

    dts = _dialog_edit_doctypes(dialog_doc, root_doctype)
    owner = _dialog_edit_owner(root_doctype)

    try:
        ok, conflict_dt = acquire_crud_lock(dts, owner)
    except Exception:
        frappe.log_error(title="begin_dialog_edit: acquire failed", message=frappe.get_traceback())
        return {"ok": 1, "locked": []}

    if not ok:
        frappe.throw(
            _("An update is in progress for {0} — please try again in a moment.").format(
                conflict_dt or root_doctype
            ),
            title=_("Update in progress"),
        )

    return {"ok": 1, "locked": dts}


@frappe.whitelist()
def end_dialog_edit(definition: str, root_doctype: str, root_name: str | None = None) -> dict:
    """
    Clear the "under edit" marks set by :func:`begin_dialog_edit`. Called when the
    dialog submit flow finishes (success or failure). Owner-checked, so it only
    releases marks this user's edit still holds; the nce_sync TTL is the backstop.
    """
    if release_crud_lock is None:
        return {"ok": 1}

    owner = _dialog_edit_owner(root_doctype)
    # Never raise from release — it runs in the dialog's finally. Always at least
    # release the root under this owner; add related tables when the dialog loads.
    try:
        dialog_doc = _load_dialog(definition, root_doctype)
        dts = (
            _dialog_edit_doctypes(dialog_doc, root_doctype)
            if dialog_doc is not None
            else [cstr(root_doctype or "").strip()]
        )
        release_crud_lock(dts, owner)
    except Exception:
        try:
            release_crud_lock([cstr(root_doctype or "").strip()], owner)
        except Exception:
            frappe.log_error(title="end_dialog_edit: release failed", message=frappe.get_traceback())
    return {"ok": 1}


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

    root_name = cstr(root_name or "").strip()
    if not root_name:
        frappe.throw(_("Missing parameters"))

    if not frappe.has_permission(root_doctype, "read", doc=root_name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    dialog_doc = _load_dialog(definition, root_doctype)
    if dialog_doc is None:
        return {"sync_job_ids": []}

    job_ids: list[str] = []

    for child_dt, link_field in _qualifying_related_links(dialog_doc):
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
                timeout=MAX_SYNC_JOB_RUNTIME_SEC,
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
