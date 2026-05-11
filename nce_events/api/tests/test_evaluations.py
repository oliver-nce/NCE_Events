"""Unit tests for nce_events.api.evaluations.get_event_enrollments."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import frappe

from nce_events.api.evaluations import _norm_rating, get_event_enrollments
from nce_events.utils.sql_table import physical_table_name


class TestPhysicalTableName(unittest.TestCase):
	def test_tab_prefix(self):
		self.assertEqual(physical_table_name("Enrollments"), "tabEnrollments")
		self.assertEqual(physical_table_name("Family Members"), "tabFamily Members")
	def test_none_empty(self):
		self.assertEqual(_norm_rating(None), 0)
		self.assertEqual(_norm_rating(""), 0)

	def test_int_clamp(self):
		self.assertEqual(_norm_rating(3), 3)
		self.assertEqual(_norm_rating(-1), 0)
		self.assertEqual(_norm_rating(99), 7)

	def test_float_round(self):
		self.assertEqual(_norm_rating(4.4), 4)
		self.assertEqual(_norm_rating(4.6), 5)

	def test_string_numeric(self):
		self.assertEqual(_norm_rating("2"), 2)


class TestGetEventEnrollments(unittest.TestCase):
	def test_guest_rejected(self):
		mock_session = MagicMock()
		mock_session.user = "Guest"
		with patch("nce_events.api.evaluations.frappe.session", mock_session):
			with self.assertRaises(frappe.PermissionError):
				get_event_enrollments("EVT1")

	def test_empty_event_id(self):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.evaluations.frappe.session", mock_session):
			with self.assertRaises(frappe.ValidationError):
				get_event_enrollments("   ")

	def test_event_not_found(self):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.evaluations.frappe.session", mock_session):
			with patch(
				"nce_events.api.evaluations.frappe.db.exists",
				return_value=False,
			):
				with self.assertRaises(frappe.ValidationError):
					get_event_enrollments("missing-event")

	@patch("nce_events.api.evaluations.frappe.db.sql")
	@patch("nce_events.api.evaluations.frappe.has_permission")
	@patch("nce_events.api.evaluations.frappe.db.exists", return_value=True)
	@patch("nce_events.api.evaluations._rating_sql_fragment", return_value="r.`rating`")
	@patch("nce_events.api.evaluations._player_link_field", return_value="player_id")
	@patch("nce_events.api.evaluations._events_link_field", return_value="product_id")
	@patch("nce_events.api.evaluations._enrollment_doctype", return_value="Enrollments")
	def test_returns_normalized_rows(
		self,
		mock_enroll_dt,
		mock_link,
		mock_player,
		mock_rating_sql,
		mock_exists,
		mock_perm,
		mock_sql,
	):
		mock_session = MagicMock()
		mock_session.user = "Administrator"
		mock_sql.return_value = [
			{
				"name": "1001",
				"first_name": "John",
				"last_initial": "R",
				"position": "Forward",
				"gender": "Male",
				"raw_rating": 9,
			},
		]
		with patch("nce_events.api.evaluations.frappe.session", mock_session):
			out = get_event_enrollments("270211")

		self.assertEqual(len(out), 1)
		self.assertEqual(out[0]["name"], "1001")
		self.assertEqual(out[0]["first_name"], "John")
		self.assertEqual(out[0]["last_initial"], "R")
		self.assertEqual(out[0]["position"], "Forward")
		self.assertEqual(out[0]["gender"], "Male")
		self.assertEqual(out[0]["rating"], 7)

		mock_sql.assert_called_once()
		call_args = mock_sql.call_args[0]
		self.assertEqual(call_args[1], ("270211",))


if __name__ == "__main__":
	unittest.main()
