"""
Deprecated shim: re-exports nce_events.api.panel_api.* under the historical
``nce_events.api.panel_api.<name>`` path.

The actual implementation has been split into the ``nce_events.api.panel_api_pkg``
package (Phase 5 refactor). This shim exists so that:

- Existing ``frappe.call({method: "nce_events.api.panel_api.<fn>"})`` call
  sites in JS keep resolving (the underlying function objects carry the same
  ``@frappe.whitelist`` registration regardless of how they are imported).
- Existing ``from nce_events.api.panel_api import <name>`` statements in
  ``form_dialog/save.py``, ``reports.py``, and ``tests/test_core_functions.py``
  keep resolving without a Phase 5 source change.
- Any external ``unittest.mock.patch("nce_events.api.panel_api.<name>")``
  paths that still need this attribute can find it.

New code should import directly from ``nce_events.api.panel_api_pkg`` (the
package). This shim will be removed in Phase 12 once all call sites have
been migrated. See Docs/refactor-handoff.md.
"""

from __future__ import annotations

from nce_events.api.panel_api_pkg import (
	_apply_user_filters,
	_auto_detect_contact_fields,
	_build_core_filter_where,
	_build_panel_sql,
	_count_with_core_filter,
	_ensure_tab_prefix,
	_evaluate_computed_columns,
	_find_link_field,
	_get_computed_columns,
	_get_gender_field_key,
	_get_link_fieldnames,
	_get_link_fields_with_target,
	_meta_reqd_root_fieldnames,
	_parse_csv,
	_query_with_core_filter,
	_run_computed_sql,
	_safe_filename,
	_title_case,
	_wp_doctype_label_map,
	build_panel_sql,
	debug_child_lookup,
	export_panel_data,
	get_child_doctypes,
	get_doctype_fields,
	get_multi_hop_children,
	get_panel_config,
	get_panel_data,
	save_panel_sql,
)

# Explicit re-export surface — every name imported above is part of the
# documented shim API. Listed for static type checkers (pyright treats
# `__all__` as the authoritative re-export set).
__all__ = [
	"_apply_user_filters",
	"_auto_detect_contact_fields",
	"_build_core_filter_where",
	"_build_panel_sql",
	"_count_with_core_filter",
	"_ensure_tab_prefix",
	"_evaluate_computed_columns",
	"_find_link_field",
	"_get_computed_columns",
	"_get_gender_field_key",
	"_get_link_fieldnames",
	"_get_link_fields_with_target",
	"_meta_reqd_root_fieldnames",
	"_parse_csv",
	"_query_with_core_filter",
	"_run_computed_sql",
	"_safe_filename",
	"_title_case",
	"_wp_doctype_label_map",
	"build_panel_sql",
	"debug_child_lookup",
	"export_panel_data",
	"get_child_doctypes",
	"get_doctype_fields",
	"get_multi_hop_children",
	"get_panel_config",
	"get_panel_data",
	"save_panel_sql",
]
