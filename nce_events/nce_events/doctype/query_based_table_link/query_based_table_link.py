from __future__ import annotations

import json
import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, cstr

_FIELD_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

ALLOWED_OPS: frozenset[str] = frozenset({"=", "!=", "<>", "<", ">", "<=", ">="})

# Canonical SQL-ish form stored in where_clause.
_OP_SQL: dict[str, str] = {
	"=": "=",
	"!=": "<>",
	"<>": "<>",
	"<": "<",
	">": ">",
	"<=": "<=",
	">=": ">=",
}

_SKIP_FIELDTYPES: frozenset[str] = frozenset(
	{
		"Section Break",
		"Column Break",
		"Tab Break",
		"HTML",
		"Fold",
		"Heading",
		"Button",
		"Table",
		"Table MultiSelect",
	}
)


def normalize_op(raw: object) -> str:
	op = cstr(raw or "").strip()
	if op == "≠":
		return "<>"
	if op == "≤":
		return "<="
	if op == "≥":
		return ">="
	if op not in ALLOWED_OPS:
		frappe.throw(_("Invalid comparison operator: {0}").format(op))
	return _OP_SQL[op]


def normalize_conditions(raw: object) -> list[dict[str, str]]:
	"""Parse conditions_json into [{left_field, op, right_field}, …]."""
	if raw is None or raw == "":
		return []
	if isinstance(raw, str):
		try:
			raw = json.loads(raw)
		except json.JSONDecodeError:
			frappe.throw(_("conditions_json must be valid JSON"))
	if not isinstance(raw, list):
		frappe.throw(_("conditions_json must be a list"))
	out: list[dict[str, str]] = []
	for item in raw:
		if not isinstance(item, dict):
			frappe.throw(_("Each condition must be an object"))
		lf = cstr(item.get("left_field") or "").strip()
		rf = cstr(item.get("right_field") or "").strip()
		if not lf or not rf:
			frappe.throw(_("Each condition needs left_field and right_field"))
		if not _FIELD_NAME_RE.match(lf) or not _FIELD_NAME_RE.match(rf):
			frappe.throw(_("Invalid field name in condition"))
		out.append({"left_field": lf, "op": normalize_op(item.get("op")), "right_field": rf})
	return out


def build_where_clause(conditions: list[dict[str, str]]) -> str:
	"""AND-join canonical left.field OP right.field pairs."""
	parts = [f"left.{c['left_field']} {c['op']} right.{c['right_field']}" for c in conditions]
	return " AND ".join(parts)


def normalize_sort(raw: object) -> list[dict[str, str]]:
	"""Parse sort JSON into [{fieldname, dir}, …] with dir asc|desc."""
	if raw is None or raw == "":
		return []
	if isinstance(raw, str):
		try:
			raw = json.loads(raw)
		except json.JSONDecodeError:
			frappe.throw(_("Sort JSON must be valid JSON"))
	if not isinstance(raw, list):
		frappe.throw(_("Sort JSON must be a list"))
	out: list[dict[str, str]] = []
	for item in raw:
		if not isinstance(item, dict):
			frappe.throw(_("Each sort row must be an object"))
		fn = cstr(item.get("fieldname") or "").strip()
		if not fn:
			continue
		if not _FIELD_NAME_RE.match(fn):
			frappe.throw(_("Invalid sort field name"))
		direction = cstr(item.get("dir") or "asc").strip().lower()
		if direction not in ("asc", "desc"):
			direction = "asc"
		out.append({"fieldname": fn, "dir": direction})
	return out


def _doctype_fieldnames(doctype: str) -> set[str]:
	meta = frappe.get_meta(doctype)
	names = {"name"}
	for f in meta.fields:
		fn = cstr(f.fieldname or "").strip()
		if fn and cstr(f.fieldtype) not in _SKIP_FIELDTYPES:
			names.add(fn)
	return names


def _assert_in_wp_tables(doctype: str) -> None:
	if not doctype:
		return
	if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
		frappe.throw(_("{0} is not listed in WP Tables").format(doctype))


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def wp_tables_doctype_query(doctype, txt, searchfield, start, page_len, filters):
	"""Link search: DocType names that appear on WP Tables."""
	txt = cstr(txt or "").strip()
	flt: dict[str, object] = (
		{"frappe_doctype": ["like", f"%{txt}%"]} if txt else {"frappe_doctype": ["is", "set"]}
	)
	rows = frappe.get_all(
		"WP Tables",
		filters=flt,
		fields=["frappe_doctype"],
		order_by="frappe_doctype",
		start=cint(start),
		page_length=cint(page_len) or 20,
	)
	seen: set[str] = set()
	out: list[list[str]] = []
	for row in rows:
		dt = cstr(row.get("frappe_doctype") or "").strip()
		if dt and dt not in seen:
			seen.add(dt)
			out.append([dt])
	return out


def normalize_index_fields(raw: object) -> list[str]:
	"""Parse index-field JSON into unique valid fieldnames (order preserved)."""
	if raw is None or raw == "":
		return []
	if isinstance(raw, str):
		try:
			raw = json.loads(raw)
		except json.JSONDecodeError:
			frappe.throw(_("Index JSON must be valid JSON"))
	if not isinstance(raw, list):
		frappe.throw(_("Index JSON must be a list"))
	out: list[str] = []
	seen: set[str] = set()
	for item in raw:
		fn = cstr(item or "").strip()
		if not fn or fn in seen:
			continue
		if not _FIELD_NAME_RE.match(fn):
			frappe.throw(_("Invalid index field name"))
		seen.add(fn)
		out.append(fn)
	return out


def ensure_search_index(doctype: str, fieldname: str) -> None:
	"""Set DocField/Custom Field search_index and create the MariaDB index via Frappe.

	Does not drop indexes. Skips ``name`` (already the primary key).
	"""
	doctype = cstr(doctype or "").strip()
	fieldname = cstr(fieldname or "").strip()
	if not doctype or not fieldname or fieldname == "name":
		return

	df_name = frappe.db.get_value("DocField", {"parent": doctype, "fieldname": fieldname}, "name")
	if df_name:
		if not cint(frappe.db.get_value("DocField", df_name, "search_index")):
			frappe.db.set_value("DocField", df_name, "search_index", 1, update_modified=False)
	else:
		cf_name = frappe.db.get_value(
			"Custom Field", {"dt": doctype, "fieldname": fieldname}, "name"
		)
		if not cf_name:
			return
		if not cint(frappe.db.get_value("Custom Field", cf_name, "search_index")):
			frappe.db.set_value("Custom Field", cf_name, "search_index", 1, update_modified=False)

	try:
		frappe.db.add_index(doctype, [fieldname])
	except Exception:
		# Index may already exist from a prior save or schema_mirror.
		pass
	frappe.clear_cache(doctype=doctype)


def _assert_fields_exist(doctype: str, fieldnames: set[str], side: str) -> None:
	if not doctype:
		return
	allowed = _doctype_fieldnames(doctype)
	missing = sorted(fn for fn in fieldnames if fn not in allowed)
	if missing:
		frappe.throw(
			_("Unknown {0} field(s) on {1}: {2}").format(side, doctype, ", ".join(missing))
		)


class QueryBasedTableLink(Document):
	def validate(self):
		conditions = normalize_conditions(getattr(self, "conditions_json", None))
		if not conditions:
			frappe.throw(_("Add at least one field pair to the relationship."))
		self.conditions_json = json.dumps(conditions, separators=(",", ":"))
		self.where_clause = build_where_clause(conditions)

		title = cstr(getattr(self, "title", None) or "").strip()
		if not title:
			frappe.throw(_("Title is required"))
		self.title = title

		left_dt = cstr(getattr(self, "left_table", None) or "").strip()
		right_dt = cstr(getattr(self, "right_table", None) or "").strip()
		_assert_in_wp_tables(left_dt)
		_assert_in_wp_tables(right_dt)
		_assert_fields_exist(left_dt, {c["left_field"] for c in conditions}, _("left"))
		_assert_fields_exist(right_dt, {c["right_field"] for c in conditions}, _("right"))

		left_sort = normalize_sort(getattr(self, "left_sort_json", None))
		right_sort = normalize_sort(getattr(self, "right_sort_json", None))
		self.left_sort_json = json.dumps(left_sort, separators=(",", ":")) if left_sort else ""
		self.right_sort_json = json.dumps(right_sort, separators=(",", ":")) if right_sort else ""
		self.left_sort_enabled = 1 if cint(getattr(self, "left_sort_enabled", 0)) else 0
		self.right_sort_enabled = 1 if cint(getattr(self, "right_sort_enabled", 0)) else 0
		if self.left_sort_enabled:
			_assert_fields_exist(left_dt, {r["fieldname"] for r in left_sort}, _("left sort"))
		if self.right_sort_enabled:
			_assert_fields_exist(right_dt, {r["fieldname"] for r in right_sort}, _("right sort"))

		left_idx = normalize_index_fields(getattr(self, "left_index_json", None))
		right_idx = normalize_index_fields(getattr(self, "right_index_json", None))
		self.left_index_json = json.dumps(left_idx, separators=(",", ":")) if left_idx else ""
		self.right_index_json = json.dumps(right_idx, separators=(",", ":")) if right_idx else ""
		if left_idx:
			_assert_fields_exist(left_dt, set(left_idx), _("left index"))
		if right_idx:
			_assert_fields_exist(right_dt, set(right_idx), _("right index"))

	def on_update(self):
		left_dt = cstr(getattr(self, "left_table", None) or "").strip()
		right_dt = cstr(getattr(self, "right_table", None) or "").strip()
		for fn in normalize_index_fields(getattr(self, "left_index_json", None)):
			ensure_search_index(left_dt, fn)
		for fn in normalize_index_fields(getattr(self, "right_index_json", None)):
			ensure_search_index(right_dt, fn)
