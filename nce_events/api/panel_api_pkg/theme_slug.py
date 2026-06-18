"""Resolve Page Panel NCE Theme links to Active theme slugs."""

from __future__ import annotations

import frappe
from frappe.utils import cint


def _site_default_theme_name() -> str | None:
	"""NCE Theme doc name for the live site Default (is_default=1)."""
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


def _active_theme_slug(theme_name: str) -> str | None:
	"""Slug for an Active NCE Theme doc, or None."""
	if not theme_name or not frappe.db.exists("NCE Theme", theme_name):
		return None
	slug, status = frappe.db.get_value("NCE Theme", theme_name, ["slug", "status"])
	if status == "Active" and slug:
		return slug
	return None


def _link_means_site_default(theme_link: str, default_name: str | None) -> bool:
	"""True when Page Panel.theme should follow the live Default, not a stale Default doc."""
	if default_name and theme_link == default_name:
		return True
	if theme_link == "Default":
		return True
	if not frappe.db.exists("NCE Theme", theme_link):
		return False
	if cint(frappe.db.get_value("NCE Theme", theme_link, "is_default")):
		return True
	linked_theme_name = (frappe.db.get_value("NCE Theme", theme_link, "theme_name") or "").strip()
	return linked_theme_name == "Default"


def resolve_theme_slug(theme_link: str | None) -> str | None:
	"""Resolve Page Panel theme Link to an Active NCE Theme slug, or None for site base.

	Links that mean "use site Default" (legacy doc name Default, theme_name Default,
	is_default flag, or the current default doc) always resolve to the live Default
	theme (is_default=1), so promoting a new Default updates all panels in one place.
	"""
	theme = (theme_link or "").strip()
	if not theme:
		return None
	try:
		if not frappe.db.exists("DocType", "NCE Theme"):
			return None
	except Exception:
		return None
	if not frappe.db.exists("NCE Theme", theme):
		return None

	default_name = _site_default_theme_name()
	if default_name and _link_means_site_default(theme, default_name):
		return _active_theme_slug(default_name)

	return _active_theme_slug(theme)
