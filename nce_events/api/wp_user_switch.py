"""Signed URL builder for the NCE WordPress user-switch bridge plugin."""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any
from urllib.parse import urlencode

import frappe
from frappe import _

from nce_events.api.credentials import get_credentials

DEFAULT_WP_USER_SWITCH_CONNECTOR: str = "WP User Switch"


def _require_switch_permission() -> None:
	if "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only System Manager can use WP user switch."), frappe.PermissionError)


def build_wp_switch_url(
	family_id: str,
	connector_name: str = "",
	redirect_to: str = "",
) -> str:
	"""Build a signed URL for the WP nce-user-switch-bridge endpoint."""
	fid = (family_id or "").strip()
	if not fid:
		frappe.throw(_("Family ID is required."))

	cname = (connector_name or "").strip() or DEFAULT_WP_USER_SWITCH_CONNECTOR
	creds = get_credentials(cname)

	base_url = (creds.get("base_url") or "").strip().rstrip("/")
	secret = (creds.get("api_secret") or "").strip()
	if not base_url:
		frappe.throw(_("WP User Switch API Connector has no base_url configured."))
	if not secret:
		frappe.throw(_("WP User Switch API Connector is missing api_secret (shared secret)."))

	ts = int(time.time())
	message = f"{fid}|{ts}".encode()
	sig = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()

	params: dict[str, str | int] = {
		"nce_switch": "1",
		"family_id": fid,
		"ts": ts,
		"sig": sig,
	}
	redirect = (redirect_to or "").strip()
	if redirect:
		params["redirect_to"] = redirect

	return f"{base_url}/?{urlencode(params)}"


@frappe.whitelist()
def get_wp_switch_url(
	family_id: str,
	connector_name: str = "",
	redirect_to: str = "",
) -> dict[str, Any]:
	"""Return a signed WP switch URL for the given Families.ID."""
	_require_switch_permission()
	return {
		"url": build_wp_switch_url(family_id, connector_name=connector_name, redirect_to=redirect_to),
	}
