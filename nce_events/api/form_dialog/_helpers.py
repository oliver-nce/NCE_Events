"""
Back-compat façade re-exporting form_dialog domain submodules.

New code should import from ``_fd_*`` modules directly; these re-exports keep
existing call sites and tests working with zero churn.
"""

from __future__ import annotations

from ._fd_capture_meta import (
	FD_LEAD_TAB_ANCHOR,
	_build_frozen_meta_json,
	_capture_client_scripts,
	_frozen_tab_visually_nonempty,
	_main_tab_skeleton_from_frozen_fields,
	_sync_form_dialog_tab_notes_from_fields,
)
from ._fd_fetch_from import _enrich_fetch_from_fields
from ._fd_gating import (
	_assert_doctype_in_wp_tables,
	_panel_required_value_empty,
	_require_form_dialog_capture_schema_ready,
	_require_system_manager,
)
from ._fd_inline_children import (
	_build_inline_child_row_dict,
	_parse_inline_child_tables_argument,
	_sync_inline_child_tables,
	table_fields_for_capture_wizard,
)
from ._fd_related import (
	_build_related_child_row_dict,
	_filters_for_related_rows,
	_hop_walk_final_identifiers,
	_normalize_hop_chain_value,
	_parse_related_doctypes_argument,
	_related_doctype_child_rows,
	_related_list_columns_from_child_row,
	_related_row_signature,
	_related_tab_portal_config_key,
	_sanitize_get_list_fields,
	_sync_related_doctypes,
)
from ._fd_script_tools import (
	_parse_script_tool_groups_argument,
	_sync_script_tool_groups,
)

__all__ = [
	"FD_LEAD_TAB_ANCHOR",
	"_assert_doctype_in_wp_tables",
	"_build_frozen_meta_json",
	"_build_inline_child_row_dict",
	"_build_related_child_row_dict",
	"_capture_client_scripts",
	"_enrich_fetch_from_fields",
	"_filters_for_related_rows",
	"_frozen_tab_visually_nonempty",
	"_hop_walk_final_identifiers",
	"_main_tab_skeleton_from_frozen_fields",
	"_normalize_hop_chain_value",
	"_panel_required_value_empty",
	"_parse_inline_child_tables_argument",
	"_parse_related_doctypes_argument",
	"_parse_script_tool_groups_argument",
	"_related_doctype_child_rows",
	"_related_list_columns_from_child_row",
	"_related_row_signature",
	"_related_tab_portal_config_key",
	"_require_form_dialog_capture_schema_ready",
	"_require_system_manager",
	"_sanitize_get_list_fields",
	"_sync_form_dialog_tab_notes_from_fields",
	"_sync_inline_child_tables",
	"_sync_related_doctypes",
	"_sync_script_tool_groups",
	"table_fields_for_capture_wizard",
]
