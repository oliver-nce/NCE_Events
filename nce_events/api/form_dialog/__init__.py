"""
Server API for Form Dialog CRUD and frozen schema capture.

Capture, rebuild, and list require System Manager. get_form_dialog_definition and
get_form_dialog_related_rows are readable by any logged-in user for active dialogs
(V2 panel). save_form_dialog_related_rows writes child rows allowed by the related
portal editor (editable fields). save uses normal DocType create/write permission
on the target record.

This package is the Phase 4 split of the original ``form_dialog_api`` module
(the deprecated shim was removed in Phase 12). The submodules group functions
by domain:

- ``_helpers``       — internal utilities (validation, hop-chain, related-row
                       column derivation, fetch_from enrichment).
- ``capture``        — ``capture_form_dialog_from_desk``, ``rebuild_form_dialog``,
                       ``get_form_dialog_definition``, ``list_form_dialogs_for_doctype``.
- ``related_rows``   — ``get_form_dialog_related_rows``, ``save_form_dialog_related_rows``.
- ``portal_fields``  — ``get_related_portal_field_editor``, ``save_related_portal_field_config``.
- ``save``           — ``save_form_dialog_document``.
"""

from __future__ import annotations

from ._helpers import (
	_assert_doctype_in_wp_tables,
	_build_related_child_row_dict,
	_enrich_fetch_from_fields,
	_filters_for_related_rows,
	_hop_walk_final_identifiers,
	_normalize_hop_chain_value,
	_panel_required_value_empty,
	_parse_related_doctypes_argument,
	_related_doctype_child_rows,
	_related_list_columns_from_child_row,
	_related_row_signature,
	_require_system_manager,
	_sanitize_get_list_fields,
	_sync_related_doctypes,
)
from .action_registry import list_portal_action_methods
from .capture import (
	capture_form_dialog_from_desk,
	get_form_dialog_definition,
	list_form_dialogs_for_doctype,
	rebuild_form_dialog,
)
from .portal_fields import (
	_build_portal_editor_rows,
	_normalize_portal_field_config_for_save,
	_parse_portal_field_config_entries,
	_portal_meta_field_eligible_for_editor,
	get_inline_child_portal_field_editor,
	get_related_portal_field_editor,
	save_inline_child_portal_actions,
	save_inline_child_portal_field_config,
	save_related_portal_actions,
	save_related_portal_field_config,
)
from .portal_actions import get_portal_actions_for_row, run_portal_action
from .related_rows import (
	_allowed_child_names_for_related_tab,
	_editable_related_fieldnames_for_save,
	_related_rows_for_vue_api,
	get_form_dialog_related_rows,
	save_form_dialog_related_rows,
)
from .button_visibility import (
	get_form_dialog_button_hidden_map,
	get_form_dialog_footer_visibility,
	validate_hide_if_sql,
)
from .save import save_form_dialog_document

__all__ = [
	"_allowed_child_names_for_related_tab",
	"_assert_doctype_in_wp_tables",
	"_build_portal_editor_rows",
	"_build_related_child_row_dict",
	"_editable_related_fieldnames_for_save",
	"_enrich_fetch_from_fields",
	"_filters_for_related_rows",
	"_hop_walk_final_identifiers",
	"_normalize_hop_chain_value",
	"_normalize_portal_field_config_for_save",
	"_panel_required_value_empty",
	"_parse_portal_field_config_entries",
	"_parse_related_doctypes_argument",
	"_portal_meta_field_eligible_for_editor",
	"_related_doctype_child_rows",
	"_related_list_columns_from_child_row",
	"_related_row_signature",
	"_related_rows_for_vue_api",
	"_require_system_manager",
	"_sanitize_get_list_fields",
	"_sync_related_doctypes",
	"capture_form_dialog_from_desk",
	"get_form_dialog_definition",
	"get_form_dialog_button_hidden_map",
	"get_form_dialog_footer_visibility",
	"get_form_dialog_related_rows",
	"get_portal_actions_for_row",
	"get_related_portal_field_editor",
	"list_form_dialogs_for_doctype",
	"list_portal_action_methods",
	"rebuild_form_dialog",
	"run_portal_action",
	"save_form_dialog_document",
	"validate_hide_if_sql",
	"save_form_dialog_related_rows",
	"save_inline_child_portal_actions",
	"save_inline_child_portal_field_config",
	"save_related_portal_actions",
	"save_related_portal_field_config",
]
