"""Tests for nce_events.api.credentials.

code-index:begin
{
 "purpose": "Tests for credentials.get_credentials auth_type and credential_config field reading.",
 "read_when": "When changing credentials.py auth patterns or secret field read behavior.",
 "gotchas": [
  "Secret auth must never read api_key; tests assert api_secret-only paths."
 ],
 "keywords": ["test credentials", "get_credentials", "auth_type", "api_secret", "unittest"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from nce_events.api.credentials import get_credentials


class TestGetCredentialsSecretAuth(unittest.TestCase):
	@patch("nce_events.api.credentials.frappe.get_doc")
	def test_secret_auth_reads_api_secret_only(self, mock_get_doc):
		connector = MagicMock()
		connector.get.return_value = ""
		connector.get.side_effect = lambda key, default=None: {
			"credential_config": "",
			"auth_type": "Secret",
			"base_url": "https://example.com",
		}.get(key, default)
		connector.api_secret = "shh"
		connector.get_password.side_effect = lambda field: {
			"api_secret": "shh",
		}[field]
		mock_get_doc.return_value = connector

		result = get_credentials("WP User Switch")

		self.assertEqual(result["auth_pattern"], "shared_secret")
		self.assertEqual(result["api_secret"], "shh")
		self.assertNotIn("api_key", result)
		connector.get_password.assert_called_once_with("api_secret")

	@patch("nce_events.api.credentials.frappe.get_doc")
	def test_secret_auth_never_reads_api_key(self, mock_get_doc):
		connector = MagicMock()
		connector.get.side_effect = lambda key, default=None: {
			"credential_config": "",
			"auth_type": "Secret",
			"base_url": "https://example.com",
		}.get(key, default)
		connector.api_secret = "shh"

		def _get_password(field):
			if field == "api_key":
				raise Exception("Password not found for API Connector WP User Switch api_key")
			return "shh"

		connector.get_password.side_effect = _get_password
		mock_get_doc.return_value = connector

		result = get_credentials("WP User Switch")

		self.assertEqual(result["api_secret"], "shh")
		self.assertEqual(connector.get_password.call_count, 1)

