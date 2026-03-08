"""Unit tests for pure/near-pure API helper functions.

Covers:
  - panel_api._build_core_filter_where
  - tags._compute_jinja_tag
  - translator.translate_wp_query  (mocked frappe.get_all)
"""
from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from nce_events.api.panel_api import _build_core_filter_where
from nce_events.api.tags import _compute_jinja_tag


# ──────────────────────────────────────────────────────────
# _build_core_filter_where
# ──────────────────────────────────────────────────────────

class TestBuildCoreFilterWhere(unittest.TestCase):

	def test_core_filter_only(self):
		where, params = _build_core_filter_where("Event", None, "status='Open'")
		self.assertEqual(where, "(status='Open')")
		self.assertEqual(params, [])

	def test_empty_filters_dict(self):
		where, params = _build_core_filter_where("Event", {}, "1=1")
		self.assertEqual(where, "(1=1)")
		self.assertEqual(params, [])

	def test_simple_equality_filter(self):
		where, params = _build_core_filter_where(
			"Event", {"city": "Paris"}, "status='Open'",
		)
		self.assertEqual(where, "(status='Open') AND `city` = %s")
		self.assertEqual(params, ["Paris"])

	def test_operator_filter(self):
		where, params = _build_core_filter_where(
			"Event", {"age": [">=", 18]}, "1=1",
		)
		self.assertEqual(where, "(1=1) AND `age` >= %s")
		self.assertEqual(params, [18])

	def test_in_operator(self):
		where, params = _build_core_filter_where(
			"Event", {"color": ["in", ["red", "blue"]]}, "1=1",
		)
		self.assertEqual(where, "(1=1) AND `color` IN (%s, %s)")
		self.assertEqual(params, ["red", "blue"])

	def test_in_with_tuple(self):
		where, params = _build_core_filter_where(
			"Event", {"id": ["in", (1, 2, 3)]}, "1=1",
		)
		self.assertEqual(where, "(1=1) AND `id` IN (%s, %s, %s)")
		self.assertEqual(params, [1, 2, 3])

	def test_multiple_filters(self):
		where, params = _build_core_filter_where(
			"Event",
			{"city": "Paris", "age": [">=", 18], "status": ["in", ["A", "B"]]},
			"docstatus=1",
		)
		self.assertIn("(docstatus=1)", where)
		self.assertIn("`city` = %s", where)
		self.assertIn("`age` >= %s", where)
		self.assertIn("`status` IN (%s, %s)", where)
		self.assertEqual(params, ["Paris", 18, "A", "B"])

	def test_like_operator(self):
		where, params = _build_core_filter_where(
			"Event", {"name": ["like", "%test%"]}, "1=1",
		)
		self.assertEqual(where, "(1=1) AND `name` like %s")
		self.assertEqual(params, ["%test%"])


# ──────────────────────────────────────────────────────────
# _compute_jinja_tag
# ──────────────────────────────────────────────────────────

class TestComputeJinjaTag(unittest.TestCase):

	def test_plain_field_no_gender(self):
		result = _compute_jinja_tag("first_name", "", "", "gender")
		self.assertEqual(result, "{{ first_name }}")

	def test_plain_field_none_values(self):
		result = _compute_jinja_tag("email", None, None, "gender")
		self.assertEqual(result, "{{ email }}")

	def test_male_only(self):
		result = _compute_jinja_tag("salutation", "Mr", "", "gender")
		self.assertIn("{% if (gender|lower) == 'male' %}", result)
		self.assertNotIn("{{%", result)
		self.assertIn("Mr", result)
		self.assertIn("salutation", result)
		self.assertIn("{% endif %}", result)

	def test_female_only(self):
		result = _compute_jinja_tag("salutation", "", "Ms", "gender")
		self.assertIn("{% if (gender|lower) == 'male' %}", result)
		self.assertIn("salutation", result)
		self.assertIn("Ms", result)

	def test_both_male_and_female(self):
		result = _compute_jinja_tag("salutation", "Mr", "Ms", "gender")
		self.assertEqual(
			result,
			"{% if (gender|lower) == 'male' %}Mr{% else %}Ms{% endif %}",
		)

	def test_whitespace_stripped(self):
		result = _compute_jinja_tag("x", "  Mr  ", "  Ms  ", "gender")
		self.assertEqual(
			result,
			"{% if (gender|lower) == 'male' %}Mr{% else %}Ms{% endif %}",
		)

	def test_always_uses_gender(self):
		"""Pronoun tags always use 'gender' field (case-insensitive male/female)."""
		result = _compute_jinja_tag("title", "Sir", "Madam", "sex")
		self.assertIn("(gender|lower)", result)


# ──────────────────────────────────────────────────────────
# translate_wp_query  (requires mocked frappe)
# ──────────────────────────────────────────────────────────

WP_TABLES_FIXTURE = [
	{
		"table_name": "wp_users",
		"frappe_doctype": "User",
		"column_mapping": json.dumps({
			"user_email": "email",
			"user_login": {"fieldname": "username", "is_name": False},
			"ID": {"fieldname": "", "is_name": True},
		}),
	},
	{
		"table_name": "wp_posts",
		"frappe_doctype": "Blog Post",
		"column_mapping": json.dumps({
			"post_title": "title",
			"post_author": "blogger",
		}),
	},
]


class TestTranslateWpQuery(unittest.TestCase):

	def _translate(self, query):
		with patch("nce_events.api.translator.frappe") as mock_frappe:
			mock_frappe.get_all.return_value = WP_TABLES_FIXTURE
			from nce_events.api.translator import translate_wp_query
			result = translate_wp_query.__wrapped__(query)
		return result

	def test_empty_query(self):
		with patch("nce_events.api.translator.frappe") as mock_frappe:
			from nce_events.api.translator import translate_wp_query
			result = translate_wp_query.__wrapped__("")
		self.assertEqual(result["translated"], "")
		self.assertEqual(result["warnings"], [])

	def test_table_name_replaced(self):
		result = self._translate("SELECT * FROM wp_users")
		self.assertIn("`tabUser`", result["translated"])
		self.assertNotIn("wp_users", result["translated"])

	def test_qualified_column_replaced(self):
		result = self._translate("SELECT wp_users.user_email FROM wp_users")
		self.assertIn("`tabUser`.email", result["translated"])

	def test_is_name_resolved_to_name(self):
		result = self._translate("SELECT wp_users.ID FROM wp_users")
		self.assertIn("`tabUser`.name", result["translated"])

	def test_bare_column_replaced(self):
		result = self._translate("SELECT post_title FROM wp_posts")
		self.assertIn("title", result["translated"])

	def test_multiple_tables(self):
		query = "SELECT * FROM wp_users JOIN wp_posts ON wp_users.ID = wp_posts.post_author"
		result = self._translate(query)
		self.assertIn("`tabUser`", result["translated"])
		self.assertIn("`tabBlog Post`", result["translated"])

	def test_no_warnings_on_good_data(self):
		result = self._translate("SELECT * FROM wp_users")
		self.assertEqual(result["warnings"], [])

	def test_bad_column_mapping_produces_warning(self):
		bad_fixture = [
			{
				"table_name": "wp_bad",
				"frappe_doctype": "Bad",
				"column_mapping": "not valid json {{{",
			},
		]
		with patch("nce_events.api.translator.frappe") as mock_frappe:
			mock_frappe.get_all.return_value = bad_fixture
			from nce_events.api.translator import translate_wp_query
			result = translate_wp_query.__wrapped__("SELECT * FROM wp_bad")
		self.assertTrue(len(result["warnings"]) > 0)
		self.assertIn("wp_bad", result["warnings"][0])
