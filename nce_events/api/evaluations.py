"""Evaluations API — enrollment rows for event-scoped rating Kanban."""

from __future__ import annotations

from typing import Any

import frappe
from frappe import _

from nce_events.utils.sql_table import physical_table_name


def _norm_rating(val: Any) -> int:
	"""Coerce rating to int 0..7 for Kanban lanes."""
	if val is None or val == "":
		return 0
	try:
		n = int(round(float(val)))
	except (TypeError, ValueError):
		return 0
	return max(0, min(7, n))


def _enrollment_doctype() -> str:
	if frappe.db.exists("DocType", "Enrollments"):
		return "Enrollments"
	if frappe.db.exists("DocType", "Registrations"):
		return "Registrations"
	frappe.throw(
		_("Neither Enrollments nor Registrations DocType exists."),
		frappe.ValidationError,
	)


def _events_link_field(enrollment_dt: str) -> str:
	meta = frappe.get_meta(enrollment_dt)
	for df in meta.fields:
		if df.fieldtype == "Link" and df.options in ("Events", "Event"):
			return df.fieldname
	for candidate in ("product_id", "event", "parent_event"):
		if meta.has_field(candidate):
			return candidate
	frappe.throw(
		_("No field linking {0} to Events was found.").format(enrollment_dt),
		frappe.ValidationError,
	)


def _player_link_field(enrollment_dt: str) -> str:
	meta = frappe.get_meta(enrollment_dt)
	for df in meta.fields:
		if df.fieldtype == "Link" and df.options in ("Family Members", "Family Member"):
			return df.fieldname
	for candidate in ("player_id", "player"):
		if meta.has_field(candidate):
			return candidate
	frappe.throw(
		_("No Link from {0} to Family Members was found.").format(enrollment_dt),
		frappe.ValidationError,
	)


def _rating_sql_fragment(enrollment_dt: str) -> str:
	"""SQL expression for numeric rating; prefers enrollment row over legacy FM rating."""
	meta = frappe.get_meta(enrollment_dt)
	if meta.has_field("rating"):
		return "r.`rating`"
	return "fm.`rating`"


def _validate_sql_identifier(fieldname: str) -> str:
	"""Ensure a fieldname from Meta is safe to embed as `identifier` in SQL."""
	if not fieldname or not fieldname.replace("_", "").isalnum() or not fieldname[0].isalpha():
		frappe.throw(_("Invalid field name in schema."))
	return fieldname


@frappe.whitelist()
def get_event_enrollments(event_id: str) -> list[dict[str, Any]]:
	"""Return enrollment rows for one event (``Events.name`` / product id string).

	Each item: ``name``, ``first_name``, ``last_initial``, ``position``, ``gender``, ``rating`` (0..7).
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	event_id = (event_id or "").strip()
	if not event_id:
		frappe.throw(_("event_id is required."))

	if not frappe.db.exists("Events", event_id):
		frappe.throw(_("Event {0} not found.").format(event_id))

	frappe.has_permission("Events", "read", throw=True)

	enroll_dt = _enrollment_doctype()
	frappe.has_permission(enroll_dt, "read", throw=True)

	link_f = _validate_sql_identifier(_events_link_field(enroll_dt))
	player_f = _validate_sql_identifier(_player_link_field(enroll_dt))

	enroll_tn = physical_table_name(enroll_dt)
	fm_tn = physical_table_name("Family Members")
	rating_expr = _rating_sql_fragment(enroll_dt)

	q = f"""
		SELECT
			r.`name` AS name,
			IFNULL(fm.first_name, '') AS first_name,
			IFNULL(LEFT(TRIM(fm.last_name), 1), '') AS last_initial,
			IFNULL(fm.preferred_position, '') AS `position`,
			IFNULL(fm.gender, '') AS gender,
			{rating_expr} AS raw_rating
		FROM `{enroll_tn}` r
		INNER JOIN `{fm_tn}` fm ON r.`{player_f}` = fm.`name`
		WHERE r.`{link_f}` = %s
		ORDER BY fm.last_name ASC, fm.first_name ASC
	"""

	rows = frappe.db.sql(q, (event_id,), as_dict=True)
	out: list[dict[str, Any]] = []
	for row in rows:
		out.append(
			{
				"name": row.get("name"),
				"first_name": (row.get("first_name") or "").strip(),
				"last_initial": (row.get("last_initial") or "").strip(),
				"position": (row.get("position") or "").strip(),
				"gender": (row.get("gender") or "").strip(),
				"rating": _norm_rating(row.get("raw_rating")),
			}
		)
	return out
