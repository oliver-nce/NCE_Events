"""Clear per-panel header colour overrides so every Page Panel header follows the theme default.

code-index:begin
{
 "purpose": "Empties header title/toolbar bg and fg overrides on all Page Panels so headers use the themed default.",
 "read_when": "Wondering why panel header colours were reset or how headers fall back to theme-bg-primary-600.",
 "gotchas": [
  "Runs once via patches.txt; re-picking a header colour on the Colours tab afterwards is kept."
 ],
 "keywords": ["execute", "Page Panel", "patch", "no-op"],
 "format": 1
}
code-index:end

Fields removed; patch already applied historically. execute() is intentionally a no-op.
"""

from __future__ import annotations


def execute() -> None:
	"""No-op: chrome override fields were removed from Page Panel."""
	return None
