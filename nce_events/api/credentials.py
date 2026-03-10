"""Credential helper — read credential_config from API Connector."""
from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

_PASSWORD_FIELDS: frozenset[str] = frozenset((
	"api_key", "api_secret", "password", "bearer_token", "oauth_refresh_token",
))

_AUTH_TYPE_FIELDS: dict[str, list[str]] = {
	"API Key": ["api_key", "api_secret"],
	"Basic Auth": ["username", "password"],
	"Bearer Token": ["bearer_token"],
	"OAuth2": ["oauth_refresh_token"],
	"None": [],
}


def _safe_get_password(connector: Any, field_name: str) -> str:
	"""Read an encrypted field, returning empty string if not set."""
	try:
		val = connector.get_password(field_name)
		return val if val else ""
	except Exception:
		return ""


def get_credentials(connector_name: str) -> dict[str, Any]:
	"""Read API Connector and return credentials.

	If credential_config JSON exists, uses it to determine which fields to read.
	Otherwise falls back to reading fields based on auth_type.

	Returns a dict with:
		auth_pattern  – how to authenticate (bearer_token, basic_auth, …)
		base_url      – API base URL
		notes         – brief description of the auth scheme
		<field_name>  – value for each credential field
		_config       – the full parsed credential_config (None if fallback)
	"""
	connector = frappe.get_doc("API Connector", connector_name)
	config_raw = (connector.get("credential_config") or "").strip()

	if config_raw:
		return _from_config(connector, config_raw)
	return _from_auth_type(connector)


def _from_config(connector: Any, config_raw: str) -> dict[str, Any]:
	"""Read credentials using credential_config JSON."""
	config: dict[str, Any] = json.loads(config_raw)

	result: dict[str, Any] = {
		"auth_pattern": config.get("auth_pattern", ""),
		"base_url": config.get("base_url", connector.get("base_url") or ""),
		"notes": config.get("notes", ""),
		"_config": config,
	}

	for field_name, field_info in config.get("fields", {}).items():
		if not field_info.get("required"):
			continue
		if field_name in _PASSWORD_FIELDS:
			result[field_name] = _safe_get_password(connector, field_name)
		else:
			result[field_name] = connector.get(field_name) or ""

	return result


def _from_auth_type(connector: Any) -> dict[str, Any]:
	"""Fallback: read credentials based on auth_type field."""
	auth_type = (connector.get("auth_type") or "None").strip()
	fields_to_read = _AUTH_TYPE_FIELDS.get(auth_type, [])

	auth_pattern_map = {
		"API Key": "api_key_header",
		"Basic Auth": "basic_auth",
		"Bearer Token": "bearer_token",
		"OAuth2": "oauth2",
		"None": "none",
	}

	result: dict[str, Any] = {
		"auth_pattern": auth_pattern_map.get(auth_type, "none"),
		"base_url": connector.get("base_url") or "",
		"notes": "",
		"_config": None,
	}

	for field_name in fields_to_read:
		if field_name in _PASSWORD_FIELDS:
			result[field_name] = _safe_get_password(connector, field_name)
		else:
			result[field_name] = connector.get(field_name) or ""

	# Always include username if it has a value (often used for sender identity)
	if "username" not in result:
		username = connector.get("username") or ""
		if username:
			result["username"] = username

	return result
