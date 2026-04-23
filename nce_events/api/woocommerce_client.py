"""Generic WooCommerce REST v3 client using API Connector credentials (server-side only)."""

from __future__ import annotations

import json
import re
from typing import Any

import requests
import frappe
from frappe import _

from nce_events.api.credentials import get_credentials

# Must match the API Connector document name (Desk → API Connector).
DEFAULT_WOOCOMMERCE_CONNECTOR: str = "WooCommerce"

_DEFAULT_TIMEOUT: int = 60
_WC_V3_SUFFIX: str = "/wp-json/wc/v3"
_ALLOWED_METHODS: frozenset[str] = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})


def _woocommerce_api_base_url(creds: dict[str, Any]) -> str:
	"""Return base URL ending at ``.../wp-json/wc/v3`` (no trailing slash)."""
	raw = (creds.get("base_url") or "").strip().rstrip("/")
	if not raw:
		frappe.throw(_("WooCommerce API Connector has no base_url configured."))
	suffix = _WC_V3_SUFFIX
	if raw.endswith(suffix):
		return raw
	return raw + suffix


def _validate_relative_path(path: str) -> None:
	"""Restrict to WooCommerce v3 product routes under ``/products``."""
	p = (path or "").strip()
	if not p.startswith("/"):
		frappe.throw(_("WooCommerce path must start with /."))
	if ".." in p or "\n" in p or "\r" in p:
		frappe.throw(_("Invalid WooCommerce path."))
	rest = p[1:]
	if rest == "products" or (rest.startswith("products/") and re.match(r"^products/\d+$", rest)):
		return
	frappe.throw(_("WooCommerce path is not allowed: {0}").format(path))


def wc_request(
	connector_name: str,
	method: str,
	path: str,
	*,
	json_body: dict[str, Any] | list[Any] | None = None,
	timeout: int = _DEFAULT_TIMEOUT,
) -> dict[str, Any] | list[Any]:
	"""
	Call WooCommerce REST API v3.

	:param connector_name: ``API Connector`` name (e.g. :data:`DEFAULT_WOOCOMMERCE_CONNECTOR`).
	:param method: HTTP method (GET, POST, PUT, PATCH, DELETE).
	:param path: Path **relative to** ``/wp-json/wc/v3``, e.g. ``/products`` or ``/products/42``.
	:param json_body: Optional JSON body for POST/PUT/PATCH.
	"""
	m = (method or "").strip().upper()
	if m not in _ALLOWED_METHODS:
		frappe.throw(_("HTTP method {0} is not allowed for WooCommerce.").format(method))

	_validate_relative_path(path)

	creds = get_credentials((connector_name or "").strip() or DEFAULT_WOOCOMMERCE_CONNECTOR)
	ck = (creds.get("api_key") or "").strip()
	cs = (creds.get("api_secret") or "").strip()
	if not ck or not cs:
		frappe.throw(
			_("WooCommerce API Connector is missing api_key or api_secret (consumer key/secret)."),
		)

	base = _woocommerce_api_base_url(creds)
	url = base + path
	params: dict[str, str] = {"consumer_key": ck, "consumer_secret": cs}

	try:
		resp = requests.request(
			m,
			url,
			params=params,
			json=json_body,
			timeout=int(timeout),
			headers={"Accept": "application/json"},
		)
	except requests.exceptions.Timeout:
		frappe.throw(_("WooCommerce request timed out."))
	except requests.exceptions.RequestException as e:
		frappe.throw(_("WooCommerce request failed: {0}").format(str(e)))

	if resp.status_code < 200 or resp.status_code >= 300:
		msg = resp.text[:800] if resp.text else ""
		try:
			err = resp.json()
			if isinstance(err, dict):
				msg = (err.get("message") or err.get("code") or json.dumps(err))[:800]
		except Exception:
			pass
		frappe.log_error(
			title="WooCommerce HTTP error",
			message=f"status={resp.status_code} path={path} body_snippet={msg}",
		)
		frappe.throw(_("WooCommerce returned {0}: {1}").format(resp.status_code, msg))

	try:
		out: Any = resp.json()
	except Exception:
		frappe.throw(_("WooCommerce returned a non-JSON response."))

	return out
