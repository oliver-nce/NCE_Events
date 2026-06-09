"""fetch_from field enrichment for frozen Form Dialog schemas."""

from __future__ import annotations

from typing import Any

import frappe

# Properties on the SOURCE field that affect how the Vue dialog renders the input.
# If the local field is missing these (e.g. a Data field with fetch_from pointing to
# a Select), we copy them from the source so the dialog renders the correct widget.
_SOURCE_DISPLAY_KEYS = ("fieldtype", "options")


def _enrich_fetch_from_fields(fields_list: list[dict], meta: Any) -> list[dict]:
	"""
	For every field with fetch_from, look up the source field on the linked
	DocType and copy display-relevant properties that the local field is
	missing or has as a generic default (Data / Int with no options).

	This ensures the Vue renderer gets the right input widget (e.g. Select
	with its option list) even when the local field was defined as plain Data.
	"""
	# Build a lookup: fieldname → field dict for the current DocType
	field_map = {f.fieldname: f for f in meta.fields}

	for fd in fields_list:
		fetch_from = fd.get("fetch_from")
		if not fetch_from:
			continue

		parts = fetch_from.split(".")
		if len(parts) != 2:
			continue

		link_fieldname, source_fieldname = parts

		# Find the Link field on the current DocType to get the target DocType
		link_field = field_map.get(link_fieldname)
		if not link_field or link_field.fieldtype != "Link" or not link_field.options:
			continue

		try:
			source_meta = frappe.get_meta(link_field.options)
			source_field = source_meta.get_field(source_fieldname)
			if not source_field:
				continue

			# Copy display-relevant properties from the source when the local
			# field has a generic type that would lose input formatting.
			local_type = fd.get("fieldtype", "")
			source_type = source_field.fieldtype or ""

			# If the source has a more specific type that affects rendering
			# (e.g. Select, Rating, Check) and the local type is generic
			# (Data, Int, or matches but has no options), enrich.
			generic_types = {"Data", "Int", "Float", "Small Text", "Text"}
			if source_type and (
				local_type in generic_types
				or (local_type == source_type and not fd.get("options") and source_field.options)
			):
				fd["fieldtype"] = source_type
				if source_field.options:
					fd["options"] = source_field.options

		except Exception:
			# If we can't resolve the source, leave the field as-is
			continue

	return fields_list
