"""Unit tests for nce_events.api.event_people_map.get_event_people_map.

code-index:begin
{
 "purpose": "Unit tests for event people map API permissions, address filtering, and geocode caching.",
 "read_when": "When changing get_event_people_map SQL, geocoding, or credential validation.",
 "gotchas": [],
 "keywords": ["test event people map", "geocode", "Google Maps", "unittest"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import frappe

from nce_events.api.event_people_map import get_event_people_map


def _mock_geocode_response(lat: float = 40.0, lng: float = -75.0):
	resp = MagicMock()
	resp.raise_for_status = MagicMock()
	resp.json.return_value = {
		"status": "OK",
		"results": [{"geometry": {"location": {"lat": lat, "lng": lng}}}],
	}
	return resp


def _mock_connector(api_key):
	connector = MagicMock()
	connector.get_password.return_value = api_key
	return connector


class TestGetEventPeopleMap(unittest.TestCase):
	def test_guest_rejected(self):
		mock_session = MagicMock()
		mock_session.user = "Guest"
		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			with self.assertRaises(frappe.PermissionError):
				get_event_people_map("EVT1")

	def test_missing_event_raises_validation_error(self):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			with self.assertRaises(frappe.ValidationError):
				get_event_people_map("   ")

	@patch("nce_events.api.event_people_map.requests.get")
	@patch("nce_events.api.event_people_map.frappe.get_doc")
	@patch("nce_events.api.event_people_map.frappe.db.sql")
	@patch("nce_events.api.event_people_map.frappe.has_permission")
	@patch("nce_events.api.event_people_map.frappe.db.exists", return_value=True)
	def test_one_person_one_pin(
		self,
		mock_exists,
		mock_perm,
		mock_sql,
		mock_get_doc,
		mock_requests_get,
	):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		mock_get_doc.return_value = _mock_connector("test-maps-key")
		mock_sql.return_value = [
			{
				"people_name": "P001",
				"first_name": "Jane",
				"last_name": "Doe",
				"position": "Forward",
				"rating": "5",
				"address_1": "123 Main St",
				"address_2": "",
				"city": "Philadelphia",
				"state": "PA",
				"postcode": "19103",
			},
		]
		mock_requests_get.return_value = _mock_geocode_response(39.95, -75.16)

		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			out = get_event_people_map("EVT1")

		self.assertEqual(out["api_key"], "test-maps-key")
		self.assertEqual(len(out["pins"]), 1)
		self.assertEqual(out["pins"][0]["person_name"], "Jane Doe")
		self.assertEqual(out["pins"][0]["position"], "Forward")
		self.assertEqual(out["pins"][0]["rating"], "5")
		self.assertEqual(out["pins"][0]["lat"], 39.95)
		self.assertEqual(out["pins"][0]["lng"], -75.16)
		self.assertEqual(out["skipped_no_address"], 0)
		self.assertEqual(out["geocode_failed"], 0)
		mock_requests_get.assert_called_once()

	@patch("nce_events.api.event_people_map.requests.get")
	@patch("nce_events.api.event_people_map.frappe.get_doc")
	@patch("nce_events.api.event_people_map.frappe.db.sql")
	@patch("nce_events.api.event_people_map.frappe.has_permission")
	@patch("nce_events.api.event_people_map.frappe.db.exists", return_value=True)
	def test_same_address_geocoded_once(
		self,
		mock_exists,
		mock_perm,
		mock_sql,
		mock_get_doc,
		mock_requests_get,
	):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		mock_get_doc.return_value = _mock_connector("test-maps-key")
		mock_sql.return_value = [
			{
				"people_name": "P001",
				"first_name": "A",
				"last_name": "One",
				"position": "",
				"rating": "",
				"address_1": "1 Shared Rd",
				"address_2": "",
				"city": "Town",
				"state": "PA",
				"postcode": "",
			},
			{
				"people_name": "P002",
				"first_name": "B",
				"last_name": "Two",
				"position": "",
				"rating": "7",
				"address_1": "1 Shared Rd",
				"address_2": "",
				"city": "Town",
				"state": "PA",
				"postcode": "",
			},
		]
		mock_requests_get.return_value = _mock_geocode_response(41.0, -74.0)

		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			out = get_event_people_map("EVT1")

		self.assertEqual(len(out["pins"]), 2)
		self.assertEqual(out["pins"][0]["lat"], out["pins"][1]["lat"])
		self.assertEqual(out["pins"][0]["lng"], out["pins"][1]["lng"])
		mock_requests_get.assert_called_once()

	@patch("nce_events.api.event_people_map.requests.get")
	@patch("nce_events.api.event_people_map.frappe.get_doc")
	@patch("nce_events.api.event_people_map.frappe.db.sql")
	@patch("nce_events.api.event_people_map.frappe.has_permission")
	@patch("nce_events.api.event_people_map.frappe.db.exists", return_value=True)
	def test_skipped_no_address(
		self,
		mock_exists,
		mock_perm,
		mock_sql,
		mock_get_doc,
		mock_requests_get,
	):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		mock_get_doc.return_value = _mock_connector("test-maps-key")
		mock_sql.return_value = [
			{
				"people_name": "P999",
				"first_name": "",
				"last_name": "",
				"position": "",
				"rating": "",
				"address_1": "",
				"address_2": "",
				"city": "",
				"state": "",
				"postcode": "",
			},
		]

		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			out = get_event_people_map("EVT1")

		self.assertEqual(out["pins"], [])
		self.assertEqual(out["skipped_no_address"], 1)
		self.assertEqual(out["geocode_failed"], 0)
		mock_requests_get.assert_not_called()

	@patch("nce_events.api.event_people_map.frappe.get_doc")
	@patch("nce_events.api.event_people_map.frappe.has_permission")
	@patch("nce_events.api.event_people_map.frappe.db.exists", return_value=True)
	def test_missing_api_key(
		self,
		mock_exists,
		mock_perm,
		mock_get_doc,
	):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		connector = _mock_connector("")
		mock_get_doc.return_value = connector
		secret = "super-secret-key-should-not-leak"

		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			with self.assertRaises(frappe.ValidationError) as ctx:
				get_event_people_map("EVT1")

		self.assertIn("Google Maps API Connector has no API key.", str(ctx.exception))
		self.assertNotIn(secret, str(ctx.exception))
		connector.get_password.assert_called_once_with("api_key", raise_exception=False)

	@patch("nce_events.api.event_people_map.requests.get")
	@patch("nce_events.api.event_people_map.frappe.get_doc")
	@patch("nce_events.api.event_people_map.frappe.db.sql", return_value=[])
	@patch("nce_events.api.event_people_map.frappe.has_permission")
	@patch("nce_events.api.event_people_map.frappe.db.exists", return_value=True)
	def test_reads_api_key_only(
		self,
		mock_exists,
		mock_perm,
		mock_sql,
		mock_get_doc,
		mock_requests_get,
	):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		connector = _mock_connector("test-maps-key")
		mock_get_doc.return_value = connector

		with patch("nce_events.api.event_people_map.frappe.session", mock_session):
			out = get_event_people_map("EVT1")

		self.assertEqual(out["api_key"], "test-maps-key")
		self.assertEqual(out["pins"], [])
		connector.get_password.assert_called_once_with("api_key", raise_exception=False)
		mock_requests_get.assert_not_called()


if __name__ == "__main__":
	unittest.main()
