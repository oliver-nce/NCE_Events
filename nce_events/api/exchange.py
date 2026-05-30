from __future__ import annotations

from typing import Any

import requests
import frappe
from frappe import _

from nce_events.api.credentials import get_credentials

# API Connector document name (Desk → API Connector). Application Password in password field.
EXCHANGE_CONNECTOR = "WordPress REST"

_EXCHANGE_PATH = "/nce-exchange/v1/exchange"
_LOG_BODY_LIMIT = 8000


def _build_exchange_url(base_url: str) -> str:
    """Build exchange REST URL; accept site root or base_url already ending in /wp-json."""
    raw = (base_url or "").strip().rstrip("/")
    if not raw:
        return ""
    if raw.endswith("/wp-json"):
        return f"{raw}{_EXCHANGE_PATH}"
    return f"{raw}/wp-json{_EXCHANGE_PATH}"


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
) -> None:
    body = resp.text or ""
    safe_payload = dict(payload)
    try:
        frappe.log_error(
            title="WordPress exchange HTTP error",
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


@frappe.whitelist()
def execute_product_exchange(enrollment_name: str, new_product_id: int | str) -> dict[str, Any]:
    """Call the WordPress NCE Exchange endpoint to switch a player to a new event.

    Reads order_item_id from the Enrollments doc, fetches Basic Auth credentials
    from the :data:`EXCHANGE_CONNECTOR` API Connector, and POSTs form fields to:
        {base_url}/wp-json/nce-exchange/v1/exchange

    Auth is WordPress Application Password (Basic Auth). Payload is
    ``application/x-www-form-urlencoded`` (same as curl ``-d``), not JSON.

    Returns the full parsed JSON response from WordPress on success.
    Raises frappe.ValidationError with a clear message on any failure.
    """
    # --- 1. Load the Enrollment record ---
    if not frappe.db.exists("Enrollments", enrollment_name):
        frappe.throw(_("Enrollment {0} not found.").format(enrollment_name))

    doc = frappe.get_doc("Enrollments", enrollment_name)

    # The Frappe primary key (name) is the WooCommerce order_item_id
    order_item_id = doc.name

    new_product_id = int(new_product_id)

    # --- 2. Fetch credentials ---
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

    # --- 3. POST to WordPress endpoint (form body + Basic Auth, matches curl -u / -d) ---
    url = _build_exchange_url(base_url)
    if not url:
        frappe.throw(
            _("{0} API Connector has no base_url configured.").format(EXCHANGE_CONNECTOR)
        )
    payload = {
        "order_item_id": int(order_item_id),
        "new_product_id": new_product_id,
    }

    try:
        resp = requests.post(
            url,
            data=payload,
            auth=(username, password),
            timeout=30,
        )
    except requests.exceptions.ConnectionError as e:
        frappe.throw(_("Could not connect to WordPress: {0}").format(str(e)))
    except requests.exceptions.Timeout:
        frappe.throw(_("WordPress exchange endpoint timed out after 30 seconds."))
    except requests.exceptions.RequestException as e:
        frappe.throw(_("HTTP error calling WordPress: {0}").format(str(e)))

    # --- 5. Handle response ---
    if resp.status_code == 401:
        frappe.throw(
            _("WordPress returned 401 Unauthorised. Check the {0} API Connector credentials.").format(
                EXCHANGE_CONNECTOR
            )
        )

    if resp.status_code != 200:
        _log_exchange_http_error(url, payload, resp)
        frappe.throw(
            _("WordPress exchange endpoint returned {0}: {1}").format(
                resp.status_code,
                _exchange_error_snippet(resp),
            )
        )

    try:
        data = resp.json()
    except Exception:
        frappe.throw(_("WordPress returned a non-JSON response: {0}").format(resp.text[:500]))

    if not data.get("success"):
        msg = data.get("error") or "Unknown error from WordPress."
        frappe.throw(_("Exchange failed: {0}").format(str(msg)))

    frappe.delete_doc("Enrollments", enrollment_name, force=True)

    return data
