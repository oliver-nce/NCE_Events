"""Credential helper — read credential_config from API Connector."""
from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

_PASSWORD_FIELDS: frozenset[str] = frozenset(("api_key", "api_secret", "password"))


def get_credentials(connector_name: str) -> dict[str, Any]:
	"""Read API Connector and return credentials based on its credential_config JSON.

	Returns a dict with:
		auth_pattern  – how to authenticate (bearer_token, basic_auth, …)
		base_url      – API base URL
		notes         – brief description of the auth scheme
		<field_name>  – value for each *required* credential field
		_config       – the full parsed credential_config for reference
	"""
	connector = frappe.get_doc("API Connector", connector_name)
	config_raw = (connector.get("credential_config") or "").strip()

	if not config_raw:
		frappe.throw(
			_(
				"No credential_config on API Connector '{0}'. "
				"Use the Credential Config button to generate it."
			).format(connector_name)
		)

	config: dict[str, Any] = json.loads(config_raw)

	result: dict[str, Any] = {
		"auth_pattern": config.get("auth_pattern", ""),
		"base_url": config.get("base_url", ""),
		"notes": config.get("notes", ""),
		"_config": config,
	}

	for field_name, field_info in config.get("fields", {}).items():
		if not field_info.get("required"):
			continue
		if field_name in _PASSWORD_FIELDS:
			result[field_name] = connector.get_password(field_name)
		else:
			result[field_name] = connector.get(field_name)

	return result
