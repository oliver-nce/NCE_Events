from __future__ import annotations

from typing import Any

import requests
import frappe
from frappe import _

from nce_events.api.credentials import get_credentials

# API Connector document name (Desk → API Connector). Application Password in password field.
EXCHANGE_CONNECTOR = "WordPress REST"


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
    url = f"{base_url}/wp-json/nce-exchange/v1/exchange"
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
        frappe.throw(
            _("WordPress exchange endpoint returned {0}: {1}").format(
                resp.status_code, resp.text[:500]
            )
        )

    try:
        data = resp.json()
    except Exception:
        frappe.throw(_("WordPress returned a non-JSON response: {0}").format(resp.text[:500]))

    if not data.get("success"):
        # WordPress returned 200 but success=false — surface the message if present
        msg = data.get("message") or data.get("data") or "Unknown error from WordPress."
        frappe.throw(_("Exchange failed: {0}").format(str(msg)))

    return data
