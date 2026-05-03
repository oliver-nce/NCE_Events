"""Tests for nce_events.api.woocommerce_client."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import frappe

from nce_events.api.woocommerce_client import DEFAULT_WOOCOMMERCE_CONNECTOR, wc_request


class TestWooCommerceClient(unittest.TestCase):
	@patch("nce_events.api.woocommerce_client.requests.request")
	@patch("nce_events.api.woocommerce_client.get_credentials")
	def test_post_products_returns_json(self, mock_creds, mock_req):
		mock_creds.return_value = {
			"base_url": "https://shop.example",
			"api_key": "ck_test",
			"api_secret": "cs_test",
		}
		resp = MagicMock()
		resp.status_code = 201
		resp.text = '{"id": 42, "slug": "my-slug"}'
		resp.json.return_value = {"id": 42, "slug": "my-slug"}
		mock_req.return_value = resp

		out = wc_request(
			DEFAULT_WOOCOMMERCE_CONNECTOR,
			"POST",
			"/products",
			json_body={"name": "X"},
		)
		self.assertEqual(out["id"], 42)
		args, kwargs = mock_req.call_args
		self.assertEqual(args[0], "POST")
		self.assertTrue(args[1].startswith("https://shop.example/wp-json/wc/v3/products"))
		self.assertEqual(kwargs["params"]["consumer_key"], "ck_test")
		self.assertEqual(kwargs["params"]["consumer_secret"], "cs_test")

	@patch("nce_events.api.woocommerce_client.get_credentials")
	def test_rejects_bad_path(self, mock_creds):
		mock_creds.return_value = {
			"base_url": "https://shop.example",
			"api_key": "ck",
			"api_secret": "cs",
		}
		with self.assertRaises(frappe.ValidationError):
			wc_request(DEFAULT_WOOCOMMERCE_CONNECTOR, "POST", "/wp-json/wc/v3/products", json_body={})

	@patch("nce_events.api.woocommerce_client.get_credentials")
	def test_rejects_bad_method(self, mock_creds):
		mock_creds.return_value = {
			"base_url": "https://shop.example",
			"api_key": "ck",
			"api_secret": "cs",
		}
		with self.assertRaises(frappe.ValidationError):
			wc_request(DEFAULT_WOOCOMMERCE_CONNECTOR, "TRACE", "/products", json_body={})

	@patch("nce_events.api.woocommerce_client.get_credentials")
	def test_base_url_already_includes_wc_v3(self, mock_creds):
		mock_creds.return_value = {
			"base_url": "https://shop.example/wp-json/wc/v3",
			"api_key": "ck",
			"api_secret": "cs",
		}
		with patch("nce_events.api.woocommerce_client.requests.request") as mock_req:
			resp = MagicMock()
			resp.status_code = 200
			resp.json.return_value = {}
			mock_req.return_value = resp
			wc_request(DEFAULT_WOOCOMMERCE_CONNECTOR, "GET", "/products")
			url = mock_req.call_args[0][1]
			self.assertTrue(url.endswith("/wp-json/wc/v3/products"))


if __name__ == "__main__":
	unittest.main()
