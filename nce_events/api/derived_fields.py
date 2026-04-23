"""Convenience composition: WP Tables derived specs + :mod:`nce_events.api.sql_eval`.

For **generic** building blocks use:

- :mod:`nce_events.api.sql_eval` — ``evaluate_sql_expressions``, whitelisted ``evaluate_sql_expressions_api``
- :mod:`nce_events.api.wp_tables_mapping` — ``get_wp_tables_column_mapping``,
  ``get_derived_sql_specs`` / whitelisted ``get_derived_sql_specs_api``

This module stays **DocType-agnostic**: the caller passes ``doctype`` (any mapped DocType).
No WooCommerce or Events-specific logic lives here.
"""

from __future__ import annotations

from typing import Any

from nce_events.api.sql_eval import (
	evaluate_sql_expressions,
	split_sql_code_and_string_literals,
	substitution_token_allowlist_for_doctype,
)
from nce_events.api.wp_tables_mapping import get_derived_sql_specs

# Back-compat for tests / older imports
_split_sql_code_and_string_literals = split_sql_code_and_string_literals


def get_derived_field_specs(doctype: str) -> list[dict[str, str]]:
	"""Return ``[{fieldname, sql_expression}, ...]`` from ``WP Tables`` ``column_mapping`` for ``doctype``."""
	return get_derived_sql_specs(doctype)


def evaluate_derived_fields(doctype: str, row: dict[str, Any]) -> dict[str, Any]:
	"""
	Evaluate derived expressions from mapping for ``doctype`` against ``row``.

	Equivalent to composing ``get_derived_field_specs`` + ``substitution_token_allowlist_for_doctype``
	+ :func:`nce_events.api.sql_eval.evaluate_sql_expressions`.
	"""
	specs = get_derived_field_specs(doctype)
	if not specs:
		return {}
	expressions = {s["fieldname"]: s["sql_expression"] for s in specs}
	allowlist = substitution_token_allowlist_for_doctype(doctype)
	return evaluate_sql_expressions(expressions, row, allowlist)


def apply_derived_fields_to_doc(
	doctype: str,
	doc: dict[str, Any],
	*,
	in_place: bool = True,
) -> dict[str, Any]:
	"""Merge evaluated derived fields into ``doc`` (create/update flows)."""
	derived = evaluate_derived_fields(doctype, doc)
	if not derived:
		return doc
	if in_place:
		doc.update(derived)
		return doc
	out = dict(doc)
	out.update(derived)
	return out
