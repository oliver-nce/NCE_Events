from __future__ import annotations


def physical_table_name(doctype: str) -> str:
	"""Return the MariaDB table name for a DocType (``tab`` + name).

	Frappe stores each DocType in a table named ``tab`` + the DocType string;
	spaces are preserved (e.g. ``Family Members`` → ``tabFamily Members``).

	Some ``Database`` backends do not expose ``get_table_name``; use this helper
	for raw SQL when you need the physical name.
	"""
	dt = (doctype or "").strip()
	if not dt:
		raise ValueError("doctype is required")
	return "tab" + dt
