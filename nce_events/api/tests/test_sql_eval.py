"""Tests for nce_events.api.sql_eval (generic SQL scalar evaluation)."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import frappe

from nce_events.api.sql_eval import (
	evaluate_sql_expressions,
	split_sql_code_and_string_literals,
	substitution_token_allowlist_for_doctype,
)


class TestSplitSqlLiterals(unittest.TestCase):
	def test_concat_literal_not_substituted(self):
		segs = split_sql_code_and_string_literals("CONCAT('event_name=', event_name)")
		self.assertEqual(
			segs,
			[
				("code", "CONCAT("),
				("str", "event_name="),
				("code", ", event_name)"),
			],
		)


class TestEvaluateSqlExpressions(unittest.TestCase):
	@patch("nce_events.api.sql_eval.frappe.db.sql")
	def test_binds_allowlisted_tokens(self, mock_sql):
		mock_sql.return_value = [{"out": 42}]
		row = {"a": 10, "b": 32}
		allow = frozenset({"a", "b"})
		out = evaluate_sql_expressions({"out": "a + b"}, row, allow)
		self.assertEqual(out["out"], 42)
		mock_sql.assert_called_once()
		sql, params = mock_sql.call_args[0][:2]
		self.assertIn("FROM DUAL", sql)
		self.assertEqual(params.get("a"), 10)
		self.assertEqual(params.get("b"), 32)

	@patch("nce_events.api.sql_eval.frappe.db.sql")
	def test_empty_expressions(self, mock_sql):
		self.assertEqual(evaluate_sql_expressions({}, {"x": 1}, frozenset({"x"})), {})
		mock_sql.assert_not_called()


class TestSubstitutionTokenAllowlist(unittest.TestCase):
	@patch("nce_events.api.sql_eval.frappe.get_meta")
	def test_includes_name(self, mock_meta):
		df = MagicMock()
		df.fieldname = "title"
		mock_meta.return_value.fields = [df]
		toks = substitution_token_allowlist_for_doctype("Any DocType")
		self.assertEqual(toks, frozenset({"title", "name"}))


class TestEvaluateSqlExpressionsApi(unittest.TestCase):
	@patch("nce_events.api.sql_eval.substitution_token_allowlist_for_doctype", return_value=frozenset({"x"}))
	@patch("nce_events.api.sql_eval.evaluate_sql_expressions")
	def test_reference_doctype_builds_allowlist(self, mock_eval, _mock_allow):
		mock_eval.return_value = {"k": 1}
		from nce_events.api.sql_eval import evaluate_sql_expressions_api

		r = evaluate_sql_expressions_api({"k": "x"}, {"x": 5}, reference_doctype="Any DocType")
		self.assertEqual(r, {"k": 1})
		mock_eval.assert_called_once_with({"k": "x"}, {"x": 5}, frozenset({"x"}))


if __name__ == "__main__":
	unittest.main()
