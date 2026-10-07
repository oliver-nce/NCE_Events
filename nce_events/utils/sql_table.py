"""Returns MariaDB physical table name tab plus DocType for raw SQL queries.

code-index:begin
{
 "purpose": "Returns MariaDB physical table name tab plus DocType for raw SQL queries.",
 "read_when": "When writing raw SQL needing tabDocType table names without Database.get_table_name.",
 "gotchas": [],
 "keywords": ["physical_table_name", "tab", "doctype", "MariaDB", "raw SQL", "get_table_name"],
 "format": 1
}
code-index:end
"""

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
