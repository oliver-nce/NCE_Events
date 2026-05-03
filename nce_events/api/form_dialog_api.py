"""
Deprecated shim: re-exports nce_events.api.form_dialog.* under the historical
``nce_events.api.form_dialog_api.<name>`` path.

The actual implementation has been split into the ``nce_events.api.form_dialog``
package (Phase 4 refactor). This shim exists so that:

- Existing ``frappe.call({method: "nce_events.api.form_dialog_api.<fn>"})``
  call sites in JS and other clients keep resolving (the underlying function
  objects carry the same ``@frappe.whitelist`` registration regardless of
  how they are imported).
- Any external ``unittest.mock.patch("nce_events.api.form_dialog_api.<name>")``
  paths that still need this attribute can find it.

New code should import directly from ``nce_events.api.form_dialog``. This shim
will be removed once all ``frappe.call`` sites have been migrated (see
refactor_coding_plan.md).
"""

from __future__ import annotations

from nce_events.api.form_dialog import (
	_allowed_child_names_for_related_tab,
	_assert_doctype_in_wp_tables,
	_build_portal_editor_rows,
	_build_related_child_row_dict,
	_editable_related_fieldnames_for_save,
	_enrich_fetch_from_fields,
	_filters_for_related_rows,
	_hop_walk_final_identifiers,
	_normalize_hop_chain_value,
	_normalize_portal_field_config_for_save,
	_panel_required_value_empty,
	_parse_portal_field_config_entries,
	_parse_related_doctypes_argument,
	_portal_meta_field_eligible_for_editor,
	_related_doctype_child_rows,
	_related_list_columns_from_child_row,
	_related_row_signature,
	_related_rows_for_vue_api,
	_require_system_manager,
	_sanitize_get_list_fields,
	_sync_related_doctypes,
	capture_form_dialog_from_desk,
	get_form_dialog_definition,
	get_form_dialog_related_rows,
	get_related_portal_field_editor,
	list_form_dialogs_for_doctype,
	rebuild_form_dialog,
	save_form_dialog_document,
	save_form_dialog_related_rows,
	save_related_portal_field_config,
)

# Explicit re-export surface — every name imported above is part of the
# documented shim API. Listed for static type checkers (pyright treats
# `__all__` as the authoritative re-export set).
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
	"get_form_dialog_related_rows",
	"get_related_portal_field_editor",
	"list_form_dialogs_for_doctype",
	"rebuild_form_dialog",
	"save_form_dialog_document",
	"save_form_dialog_related_rows",
	"save_related_portal_field_config",
]
