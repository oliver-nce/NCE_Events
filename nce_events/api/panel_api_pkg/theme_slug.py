"""Resolve Page Panel NCE Theme links to Active theme slugs."""

from __future__ import annotations

import frappe


def _site_default_theme_name() -> str | None:
	"""NCE Theme doc name marked is_default=1 (site default for unassigned UI)."""
	try:
		if not frappe.db.exists("DocType", "NCE Theme"):
			return None
	except Exception:
		return None
	rows = frappe.get_all(
		"NCE Theme",
		filters={"is_default": 1},
		pluck="name",
		limit=1,
	)
	return rows[0] if rows else None


def _active_theme_slug(theme_name: str | None) -> str | None:
	"""Slug for an Active NCE Theme doc, or None."""
	if not theme_name or not frappe.db.exists("NCE Theme", theme_name):
		return None
	slug, status = frappe.db.get_value("NCE Theme", theme_name, ["slug", "status"])
	if status == "Active" and slug:
		return slug
	return None


def resolve_theme_slug(theme_link: str | None) -> str | None:
	"""Resolve Page Panel theme Link to an Active slug.

	- Empty link → site default NCE Theme (is_default=1), if Active.
	- Set link → that NCE Theme doc's slug only (never redirected).
	- Missing/inactive → None (caller may omit data-nce-theme).
	"""
	try:
		if not frappe.db.exists("DocType", "NCE Theme"):
			return None
	except Exception:
		return None

	theme = (theme_link or "").strip()
	if not theme:
		return _active_theme_slug(_site_default_theme_name())

	if not frappe.db.exists("NCE Theme", theme):
		return None

	return _active_theme_slug(theme)
