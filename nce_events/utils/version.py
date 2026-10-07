"""Frappe version helpers returning major version and is_v16_or_later check.

code-index:begin
{
 "purpose": "Frappe version helpers returning major version and is_v16_or_later check.",
 "read_when": "When branching behavior on Frappe v15 vs v16 or reading frappe.__version__.",
 "gotchas": [],
 "keywords": ["get_frappe_major_version", "is_v16_or_later", "frappe.__version__", "Frappe version"],
 "format": 1
}
code-index:end
"""

import frappe


def get_frappe_major_version():
	"""Return the major version of the installed Frappe framework as an integer."""
	return int(frappe.__version__.split(".", maxsplit=1)[0])


def is_v16_or_later():
	"""Return True if the current Frappe version is 16 or above."""
	return get_frappe_major_version() >= 16
