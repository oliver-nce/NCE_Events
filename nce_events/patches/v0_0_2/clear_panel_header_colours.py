"""Clear per-panel header colour overrides so every Page Panel header follows the theme default.

code-index:begin
{
 "purpose": "Empties header title/toolbar bg and fg overrides on all Page Panels so headers use the themed default.",
 "read_when": "Wondering why panel header colours were reset or how headers fall back to theme-bg-primary-600.",
 "gotchas": [
  "Runs once via patches.txt; re-picking a header colour on the Colours tab afterwards is kept."
 ],
 "keywords": ["execute", "Page Panel", "header_bg_class", "header_toolbar_bg_class", "theme", "patch"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe

HEADER_FIELDS = (
	"header_bg_class",
	"header_fg_type",
	"header_toolbar_bg_class",
	"header_toolbar_fg_type",
)


def execute() -> None:
	"""Set the header colour fields to empty on every Page Panel."""
	columns = [f for f in HEADER_FIELDS if frappe.db.has_column("Page Panel", f)]
	if not columns:
		return
	assignments = ", ".join(f"`{c}` = ''" for c in columns)
	frappe.db.sql(f"UPDATE `tabPage Panel` SET {assignments}")
	frappe.db.commit()
