"""Public utils package re-exporting writeback_fetched_fields for server callers.

code-index:begin
{
 "purpose": "Public utils package re-exporting writeback_fetched_fields for server callers.",
 "read_when": "When importing nce_events.utils writeback helpers from other modules.",
 "gotchas": [],
 "keywords": ["nce_events.utils", "writeback_fetched_fields", "__all__", "writeback"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

from .writeback import writeback_fetched_fields

__all__ = ["writeback_fetched_fields"]
