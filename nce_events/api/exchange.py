from __future__ import annotations

import time
from typing import Any

import requests
import frappe
from frappe import _

from nce_events.api.credentials import get_credentials

# API Connector document name (Desk → API Connector). Application Password in password field.
EXCHANGE_CONNECTOR = "WordPress REST"

_EXCHANGE_PATH = "/nce-exchange/v1/exchange"
_REFUND_PATH = "/nce-exchange/v1/refund-item"
_REFUND_ITEMS_BY_PRODUCT_PATH = "/nce-exchange/v1/refund-items-by-product"
_LOG_BODY_LIMIT = 8000
_SYNC_WAIT_TIMEOUT_SEC = 120
_SYNC_POLL_INTERVAL_SEC = 2


def _build_wp_api_url(base_url: str, path: str) -> str:
    """Build a WordPress REST URL under ``/wp-json``."""
    raw = (base_url or "").strip().rstrip("/")
    if not raw:
        return ""
    segment = (path or "").strip()
    if not segment.startswith("/"):
        segment = f"/{segment}"
    if raw.endswith("/wp-json"):
        return f"{raw}{segment}"
    return f"{raw}/wp-json{segment}"


def _exchange_error_snippet(resp: requests.Response) -> str:
    text = (resp.text or "").strip()
    if not text:
        return _("(empty response body — see Error Log » WordPress exchange HTTP error)")
    try:
        data = resp.json()
    except Exception:
        return text[:500]
    if isinstance(data, dict):
        for key in ("message", "error", "code"):
            val = data.get(key)
            if val:
                return str(val)[:500]
    return text[:500]


def _log_exchange_http_error(
    url: str,
    payload: dict[str, Any],
    resp: requests.Response,
    *,
    title: str = "WordPress exchange HTTP error",
) -> None:
    body = resp.text or ""
    safe_payload = dict(payload)
    try:
        frappe.log_error(
            title=title,
            message=(
                f"status={resp.status_code}\n"
                f"url={url}\n"
                f"payload={safe_payload}\n"
                f"response_headers={dict(resp.headers)}\n"
                f"response_body={body[:_LOG_BODY_LIMIT]}"
            ),
        )
    except Exception:
        pass


def _parse_cancellation_fee(raw: object) -> float:
    """Return a non-negative fee amount; empty/None → 0."""
    if raw is None:
        return 0.0
    s = str(raw).strip()
    if not s:
        return 0.0
    try:
        fee = float(s)
    except (TypeError, ValueError):
        frappe.throw(_("Cancellation fee must be a number."))
    if fee < 0:
        frappe.throw(_("Cancellation fee cannot be negative."))
    return fee


def _wait_for_enrollments_sync_then_verify_exists(enrollment_name: str) -> None:
    """Wait for WP→Frappe sync to release Enrollments, then confirm the record still exists."""
    from nce_sync.utils.sync_gate import is_doctype_syncing

    deadline = time.monotonic() + _SYNC_WAIT_TIMEOUT_SEC
    while is_doctype_syncing("Enrollments"):
        if time.monotonic() >= deadline:
            frappe.throw(
                _(
                    "A WordPress sync is still running after waiting {0} seconds. Please try again shortly."
                ).format(_SYNC_WAIT_TIMEOUT_SEC)
            )
        time.sleep(_SYNC_POLL_INTERVAL_SEC)

    if not frappe.db.exists("Enrollments", enrollment_name):
        frappe.throw(
            _(
                "This enrollment no longer exists — it was removed by a sync. No action was performed."
            )
        )


def _load_exchange_credentials() -> tuple[str, str, str]:
    creds = get_credentials(EXCHANGE_CONNECTOR)
    username = creds.get("username") or ""
    password = creds.get("password") or ""
    base_url = (creds.get("base_url") or "").rstrip("/")
    if not username or not password:
        frappe.throw(
            _("{0} API Connector is missing username or password.").format(EXCHANGE_CONNECTOR)
        )
    if not base_url:
        frappe.throw(
            _("{0} API Connector has no base_url configured.").format(EXCHANGE_CONNECTOR)
        )
    return username, password, base_url


def _post_wp_exchange_request(
    *,
    path: str,
    body: dict[str, Any],
    action_noun: str,
    log_title: str,
) -> dict[str, Any]:
    """POST form fields to a WordPress nce-exchange endpoint; return parsed JSON."""
    username, password, base_url = _load_exchange_credentials()
    url = _build_wp_api_url(base_url, path)
    if not url:
        frappe.throw(
            _("{0} API Connector has no base_url configured.").format(EXCHANGE_CONNECTOR)
        )

    try:
        resp = requests.post(
            url,
            data=body,
            auth=(username, password),
            timeout=120,
        )
    except requests.exceptions.ConnectionError as e:
        frappe.throw(_("Could not connect to WordPress: {0}").format(str(e)))
    except requests.exceptions.Timeout:
        frappe.throw(_("WordPress {0} endpoint timed out after 120 seconds.").format(action_noun))
    except requests.exceptions.RequestException as e:
        frappe.throw(_("HTTP error calling WordPress: {0}").format(str(e)))

    if resp.status_code == 401:
        frappe.throw(
            _("WordPress returned 401 Unauthorised. Check the {0} API Connector credentials.").format(
                EXCHANGE_CONNECTOR
            )
        )

    if resp.status_code != 200:
        _log_exchange_http_error(url, body, resp, title=log_title)
        if resp.status_code == 404 and path == _REFUND_ITEMS_BY_PRODUCT_PATH:
            frappe.throw(
                _(
                    "WordPress bulk refund endpoint returned 404. Deploy nce-product-exchange "
                    "v1.3.0+ (route /nce-exchange/v1/refund-items-by-product). Details: {0}"
                ).format(_exchange_error_snippet(resp))
            )
        frappe.throw(
            _("WordPress {0} endpoint returned {1}: {2}").format(
                action_noun,
                resp.status_code,
                _exchange_error_snippet(resp),
            )
        )

    try:
        data = resp.json()
    except Exception:
        frappe.throw(_("WordPress returned a non-JSON response: {0}").format(resp.text[:500]))

    if not data.get("success"):
        msg = data.get("error") or f"Unknown error from WordPress {action_noun}."
        frappe.throw(_("{0} failed: {1}").format(action_noun.capitalize(), str(msg)))

    return data


def execute_bulk_refund_by_product(
    product_id: str | int,
    cancellation_fee: float | str | None = None,
) -> dict[str, Any]:
    """Refund all enrollments for one WooCommerce product ID (one WordPress API call)."""
    wp_id = int(product_id)
    if wp_id <= 0:
        frappe.throw(_("Invalid product id."))

    body: dict[str, Any] = {"product_id": wp_id}
    fee = _parse_cancellation_fee(cancellation_fee)
    if fee > 0:
        body["cancellation_fee"] = fee

    return _post_wp_exchange_request(
        path=_REFUND_ITEMS_BY_PRODUCT_PATH,
        body=body,
        action_noun="bulk refund",
        log_title="WordPress bulk refund HTTP error",
    )


def _post_wp_enrollment_action(
    *,
    path: str,
    enrollment_name: str,
    payload: dict[str, Any],
    action_noun: str,
    log_title: str,
) -> dict[str, Any]:
    """POST form fields to a WordPress enrollment endpoint.

    On success, local Enrollments cleanup is deferred to WP→Frappe sync (see commented
    ``delete_doc`` below).
    """
    if not frappe.db.exists("Enrollments", enrollment_name):
        frappe.throw(_("Enrollment {0} not found.").format(enrollment_name))

    order_item_id = enrollment_name
    username, password, base_url = _load_exchange_credentials()
    url = _build_wp_api_url(base_url, path)
    if not url:
        frappe.throw(
            _("{0} API Connector has no base_url configured.").format(EXCHANGE_CONNECTOR)
        )

    body = {"order_item_id": int(order_item_id), **payload}
    _wait_for_enrollments_sync_then_verify_exists(enrollment_name)

    try:
        resp = requests.post(
            url,
            data=body,
            auth=(username, password),
            timeout=30,
        )
    except requests.exceptions.ConnectionError as e:
        frappe.throw(_("Could not connect to WordPress: {0}").format(str(e)))
    except requests.exceptions.Timeout:
        frappe.throw(_("WordPress {0} endpoint timed out after 30 seconds.").format(action_noun))
    except requests.exceptions.RequestException as e:
        frappe.throw(_("HTTP error calling WordPress: {0}").format(str(e)))

    if resp.status_code == 401:
        frappe.throw(
            _("WordPress returned 401 Unauthorised. Check the {0} API Connector credentials.").format(
                EXCHANGE_CONNECTOR
            )
        )

    if resp.status_code != 200:
        _log_exchange_http_error(url, body, resp, title=log_title)
        if resp.status_code == 404 and path == _REFUND_PATH:
            frappe.throw(
                _(
                    "WordPress refund endpoint returned 404. Deploy the latest "
                    "nce-product-exchange plugin on WordPress (route /nce-exchange/v1/refund-item). "
                    "Details: {0}"
                ).format(_exchange_error_snippet(resp))
            )
        frappe.throw(
            _("WordPress {0} endpoint returned {1}: {2}").format(
                action_noun,
                resp.status_code,
                _exchange_error_snippet(resp),
            )
        )

    try:
        data = resp.json()
    except Exception:
        frappe.throw(_("WordPress returned a non-JSON response: {0}").format(resp.text[:500]))

    if not data.get("success"):
        msg = data.get("error") or f"Unknown error from WordPress {action_noun}."
        frappe.throw(_("{0} failed: {1}").format(action_noun.capitalize(), str(msg)))

    # Local mirror cleanup is deferred to the next WP→Frappe Enrollments sync.
    # frappe.delete_doc("Enrollments", enrollment_name, force=True)
    return data


@frappe.whitelist()
def execute_product_exchange(
    enrollment_name: str,
    new_product_id: int | str,
    cancellation_fee: float | str | None = None,
) -> dict[str, Any]:
    """Call the WordPress NCE Exchange endpoint to switch a player to a new event.

    Reads order_item_id from the Enrollments doc, fetches Basic Auth credentials
    from the :data:`EXCHANGE_CONNECTOR` API Connector, and POSTs form fields to:
        {base_url}/wp-json/nce-exchange/v1/exchange

    Optional ``cancellation_fee`` (default 0) is added to the replacement order on
    the WordPress side when greater than zero.

    Auth is WordPress Application Password (Basic Auth). Payload is
    ``application/x-www-form-urlencoded`` (same as curl ``-d``), not JSON.

    Returns the full parsed JSON response from WordPress on success.
    Raises frappe.ValidationError with a clear message on any failure.
    """
    # --- 1. Load the Enrollment record ---
    if not frappe.db.exists("Enrollments", enrollment_name):
        frappe.throw(_("Enrollment {0} not found.").format(enrollment_name))

    new_product_id = int(new_product_id)
    fee = _parse_cancellation_fee(cancellation_fee)

    payload: dict[str, Any] = {"new_product_id": new_product_id}
    if fee > 0:
        payload["cancellation_fee"] = fee

    return _post_wp_enrollment_action(
        path=_EXCHANGE_PATH,
        enrollment_name=enrollment_name,
        payload=payload,
        action_noun="exchange",
        log_title="WordPress exchange HTTP error",
    )


@frappe.whitelist()
def execute_product_refund(
    enrollment_name: str,
    cancellation_fee: float | str | None = None,
) -> dict[str, Any]:
    """Cancel an enrollment via WordPress ``/nce-exchange/v1/refund-item``.

    Issues store credit and optionally charges a cancellation fee (separate fee order
    when ``cancellation_fee`` > 0). Local Enrollments mirror is removed by the next
    WP→Frappe sync after WordPress cancels the line.
    """
    if not frappe.db.exists("Enrollments", enrollment_name):
        frappe.throw(_("Enrollment {0} not found.").format(enrollment_name))

    fee = _parse_cancellation_fee(cancellation_fee)
    payload: dict[str, Any] = {}
    if fee > 0:
        payload["cancellation_fee"] = fee

    return _post_wp_enrollment_action(
        path=_REFUND_PATH,
        enrollment_name=enrollment_name,
        payload=payload,
        action_noun="refund",
        log_title="WordPress refund HTTP error",
    )
