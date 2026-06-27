"""Resolve NCE Theme table tokens for Page Panel Desk previews and docs."""

from __future__ import annotations

import json
from typing import Any

import frappe

from nce_events.api.panel_api_pkg.theme_slug import _site_default_theme_name

TIER_TO_BORDER_CLASS = {
	"thin": "theme-border-thin",
	"normal": "theme-border",
	"strong": "theme-border-strong",
}

LEGACY_PX_TIER = {
	"0.5px": "thin",
	"1px": "normal",
	"2px": "strong",
	"3px": "strong",
}


def _default_payload() -> dict[str, Any]:
	try:
		from themes.utils.default_theme import DEFAULT_THEME_PAYLOAD

		return dict(DEFAULT_THEME_PAYLOAD)
	except ImportError:
		return {
			"secondary_color": "#10B981",
			"surface_color": "#F9FAFB",
			"border_color": "#E5E7EB",
			"row_color": "#F9FAFB",
			"row_alt_color": "#F3F4F6",
			"table_header_bg_color": "#10B981",
			"table_row_divider_color": "#E5E7EB",
			"table_col_divider_color": "#E5E7EB",
			"table_row_divider_width": "thin",
			"table_col_divider_width": "thin",
		}


def _theme_doc_name(theme_link: str | None) -> str | None:
	theme = (theme_link or "").strip()
	if theme:
		return theme if frappe.db.exists("NCE Theme", theme) else None
	return _site_default_theme_name()


def _parse_theme_json(doc_name: str | None) -> dict[str, Any]:
	if not doc_name:
		return {}
	raw = frappe.db.get_value("NCE Theme", doc_name, "theme_json") or "{}"
	try:
		parsed = json.loads(raw) if isinstance(raw, str) else dict(raw or {})
	except (json.JSONDecodeError, TypeError):
		return {}
	return parsed if isinstance(parsed, dict) else {}


def normalize_table_width_tier(raw: Any) -> str:
	s = str(raw or "thin").strip().lower()
	if s in LEGACY_PX_TIER:
		s = LEGACY_PX_TIER[s]
	return s if s in TIER_TO_BORDER_CLASS else "thin"


def tier_to_border_class(tier: str) -> str:
	return TIER_TO_BORDER_CLASS.get(normalize_table_width_tier(tier), "theme-border-thin")


def get_theme_table_tokens(theme_link: str | None = None) -> dict[str, str]:
	"""Table chrome defaults from linked NCE Theme (or site default).

	Used by Page Panel Colours tab so empty panel overrides preview the same
	values as the Themes editor Tables section.
	"""
	base = _default_payload()
	payload = {**base, **_parse_theme_json(_theme_doc_name(theme_link))}

	def colour(key: str, fallback_key: str) -> str:
		return str(payload.get(key) or payload.get(fallback_key) or base.get(key) or "")

	row_tier = normalize_table_width_tier(payload.get("table_row_divider_width"))
	col_tier = normalize_table_width_tier(payload.get("table_col_divider_width"))
	row_width_class = tier_to_border_class(row_tier)
	col_width_class = tier_to_border_class(col_tier)

	return {
		"row_divider_width_tier": row_tier,
		"col_divider_width_tier": col_tier,
		"row_divider_width_class": row_width_class,
		"col_divider_width_class": col_width_class,
		"col_header_line_width_class": row_width_class,
		"header_bg_hex": colour("table_header_bg_color", "secondary_color"),
		"row_even_bg_hex": colour("row_color", "surface_color"),
		"row_odd_bg_hex": colour("row_alt_color", "row_color"),
		"row_divider_color_hex": colour("table_row_divider_color", "border_color"),
		"col_divider_color_hex": colour("table_col_divider_color", "border_color"),
	}
