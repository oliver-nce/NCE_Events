"""Event people map API — geocoded pins for enrolled people by family address.

code-index:begin
{
 "purpose": "Whitelisted API returning Google Maps pins for people enrolled on an event, geocoded via family address.",
 "read_when": "When loading the event people map or geocoding enrollment addresses for map pins.",
 "gotchas": [
  "Geocode failures skip individual pins; the request still succeeds.",
  "People without a usable family address are counted in skipped_no_address."
 ],
 "keywords": ["event", "map", "people", "geocode", "pins", "Google Maps"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any

import frappe
import requests
from frappe import _

from nce_events.utils.sql_table import physical_table_name

_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_GEOCODE_TIMEOUT = 10


def _google_maps_api_key() -> str:
	"""API key from the Google Maps API Connector. The API secret is not used."""
	connector = frappe.get_doc("API Connector", "Google Maps")
	try:
		key = connector.get_password("api_key", raise_exception=False) or ""
	except Exception:
		key = ""
	return key.strip()


def _person_display_name(first_name: str, last_name: str, people_name: str) -> str:
	first = (first_name or "").strip()
	last = (last_name or "").strip()
	combined = f"{first} {last}".strip()
	return combined if combined else people_name


def _family_address(row: dict[str, Any]) -> str:
	parts = [
		(row.get("address_1") or "").strip(),
		(row.get("address_2") or "").strip(),
		(row.get("city") or "").strip(),
		(row.get("state") or "").strip(),
		(row.get("postcode") or "").strip(),
	]
	return ", ".join(p for p in parts if p)


def _geocode_address(address: str, api_key: str) -> tuple[float, float] | None:
	try:
		resp = requests.get(
			_GEOCODE_URL,
			params={"address": address, "key": api_key},
			timeout=_GEOCODE_TIMEOUT,
		)
		resp.raise_for_status()
		data = resp.json()
	except Exception:
		return None
	if data.get("status") != "OK":
		return None
	results = data.get("results") or []
	if not results:
		return None
	loc = (results[0].get("geometry") or {}).get("location") or {}
	lat, lng = loc.get("lat"), loc.get("lng")
	if lat is None or lng is None:
		return None
	try:
		return float(lat), float(lng)
	except (TypeError, ValueError):
		return None


def _geocode_addresses(addresses: list[str], api_key: str) -> dict[str, tuple[float, float] | None]:
	"""Look up every distinct address at once. Google takes one address per call."""
	unique = list(dict.fromkeys(addresses))
	if not unique:
		return {}
	found: dict[str, tuple[float, float] | None] = {}
	workers = len(unique)
	with ThreadPoolExecutor(max_workers=workers) as pool:
		futures = {pool.submit(_geocode_address, address, api_key): address for address in unique}
		for future, address in futures.items():
			found[address] = future.result()
	return found


@frappe.whitelist()
def get_event_people_map(event_id: str) -> dict[str, Any]:
	"""Return map pins for people enrolled on an event, geocoded by family address."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	event_id = (event_id or "").strip()
	if not event_id:
		frappe.throw(_("event_id is required."))

	if not frappe.db.exists("Events", event_id):
		frappe.throw(_("Event {0} not found.").format(event_id))

	frappe.has_permission("Events", "read", throw=True)
	frappe.has_permission("Enrollments", "read", throw=True)
	frappe.has_permission("People", "read", throw=True)
	frappe.has_permission("Families", "read", throw=True)

	api_key = _google_maps_api_key()
	if not api_key:
		frappe.throw(
			_("Google Maps API Connector has no API key."),
			frappe.ValidationError,
		)

	enroll_tn = physical_table_name("Enrollments")
	people_tn = physical_table_name("People")
	families_tn = physical_table_name("Families")

	q = f"""
		SELECT
			p.`name` AS people_name,
			IFNULL(p.first_name, '') AS first_name,
			IFNULL(p.last_name, '') AS last_name,
			IFNULL(p.`position`, '') AS `position`,
			p.rating AS rating,
			IFNULL(f.address_1, '') AS address_1,
			IFNULL(f.address_2, '') AS address_2,
			IFNULL(f.city, '') AS city,
			IFNULL(f.state, '') AS state,
			IFNULL(f.postcode, '') AS postcode
		FROM `{enroll_tn}` e
		INNER JOIN `{people_tn}` p ON e.`player_id` = p.`name`
		LEFT JOIN `{families_tn}` f ON p.`family_id` = f.`name`
		WHERE e.`product_id` = %s
		ORDER BY p.`name` ASC
	"""

	rows = frappe.db.sql(q, (event_id,), as_dict=True)

	seen_people: set[str] = set()
	people: list[dict[str, Any]] = []
	skipped_no_address = 0

	for row in rows:
		people_name = row.get("people_name") or ""
		if people_name in seen_people:
			continue
		seen_people.add(people_name)

		address = _family_address(row)
		if not address:
			skipped_no_address += 1
			continue

		rating_val = row.get("rating")
		rating = "" if rating_val is None else str(rating_val)

		people.append(
			{
				"person_name": _person_display_name(
					row.get("first_name") or "",
					row.get("last_name") or "",
					people_name,
				),
				"position": (row.get("position") or "").strip(),
				"rating": rating,
				"address": address,
			}
		)

	coord_cache = _geocode_addresses([person["address"] for person in people], api_key)
	pins: list[dict[str, Any]] = []
	geocode_failed = 0

	for person in people:
		address = person["address"]
		coords = coord_cache.get(address)
		if coords is None:
			geocode_failed += 1
			continue
		lat, lng = coords
		pins.append(
			{
				"person_name": person["person_name"],
				"position": person["position"],
				"rating": person["rating"],
				"lat": lat,
				"lng": lng,
			}
		)

	return {
		"api_key": api_key,
		"pins": pins,
		"skipped_no_address": skipped_no_address,
		"geocode_failed": geocode_failed,
	}
