import frappe

from nce_events.api.panel_api import _SKIP_FIELDNAMES, _SKIP_FIELDTYPES, _title_case


_DEFAULT_SYNTHETICS = [
	{"field_name": "he_she", "label": "He/She (lower)", "male_value": "he", "female_value": "she"},
	{"field_name": "he_she_cap", "label": "He/She", "male_value": "He", "female_value": "She"},
	{"field_name": "him_her", "label": "Him/Her", "male_value": "him", "female_value": "her"},
	{"field_name": "his_her", "label": "His/Her", "male_value": "his", "female_value": "her"},
]


@frappe.whitelist()
def rebuild_field_tags():
	"""Scan all custom DocTypes and rebuild the Field Tag child table."""
	doc = frappe.get_doc("Messaging Configuration")
	gender_field = doc.gender_field or "gender"

	neutral_fieldnames = {
		row.field_name.strip()
		for row in (doc.neutral_tags or [])
		if row.field_name
	}

	existing = {}
	for row in (doc.field_tags or []):
		key = (row.field_name or "") + ":" + (row.source_table or "")
		existing[key] = {
			"expose": row.expose,
			"male_value": row.male_value or "",
			"female_value": row.female_value or "",
			"synthetic": row.synthetic,
		}

	synthetic_by_fn = {}
	for row in (doc.field_tags or []):
		if row.synthetic:
			synthetic_by_fn[row.field_name] = {
				"field_name": row.field_name,
				"label": row.label,
				"male_value": row.male_value or "",
				"female_value": row.female_value or "",
				"expose": row.expose,
			}

	for ds in _DEFAULT_SYNTHETICS:
		if ds["field_name"] not in synthetic_by_fn:
			prev = existing.get(ds["field_name"] + ":", {})
			synthetic_by_fn[ds["field_name"]] = {
				"field_name": ds["field_name"],
				"label": ds["label"],
				"male_value": prev.get("male_value") or ds["male_value"],
				"female_value": prev.get("female_value") or ds["female_value"],
				"expose": prev.get("expose", 1),
			}

	custom_dts = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		pluck="frappe_doctype",
	)
	custom_dts = list(set(custom_dts))

	new_rows = []
	seen_neutral = set()

	for dt_name in sorted(custom_dts):
		try:
			meta = frappe.get_meta(dt_name)
		except Exception:
			continue

		source_table = "tab" + dt_name

		for field in meta.fields:
			if field.fieldtype in _SKIP_FIELDTYPES:
				continue
			if field.fieldname in _SKIP_FIELDNAMES:
				continue

			fn = field.fieldname
			label = field.label or _title_case(fn)

			if fn in neutral_fieldnames:
				if fn in seen_neutral:
					continue
				seen_neutral.add(fn)
				prev = existing.get(fn + ":", {})
				new_rows.append({
					"field_name": fn,
					"label": label,
					"male_value": prev.get("male_value", ""),
					"female_value": prev.get("female_value", ""),
					"jinja_tag": _compute_jinja_tag(fn, prev.get("male_value", ""), prev.get("female_value", ""), gender_field),
					"source_table": "",
					"source_doctype": "",
					"expose": prev.get("expose", 1),
					"synthetic": 0,
				})
			else:
				key = fn + ":" + source_table
				prev = existing.get(key, {})
				new_rows.append({
					"field_name": fn,
					"label": label,
					"male_value": prev.get("male_value", ""),
					"female_value": prev.get("female_value", ""),
					"jinja_tag": _compute_jinja_tag(fn, prev.get("male_value", ""), prev.get("female_value", ""), gender_field),
					"source_table": source_table,
					"source_doctype": dt_name,
					"expose": prev.get("expose", 1),
					"synthetic": 0,
				})

	new_rows.sort(key=lambda r: (r.get("label") or "").lower())

	all_synthetics = sorted(
		synthetic_by_fn.values(),
		key=lambda r: (r.get("label") or "").lower(),
	)
	for s in all_synthetics:
		s["jinja_tag"] = _compute_jinja_tag(
			s["field_name"], s.get("male_value", ""),
			s.get("female_value", ""), gender_field,
		)
		s["source_table"] = ""
		s["source_doctype"] = ""
		s["synthetic"] = 1

	doc.field_tags = []
	for row_data in new_rows + all_synthetics:
		doc.append("field_tags", row_data)

	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"total": len(doc.field_tags)}


def _compute_jinja_tag(field_name, male_value, female_value, gender_field):
	male = (male_value or "").strip()
	female = (female_value or "").strip()
	if male or female:
		return (
			"{{% if " + gender_field + " == 'Male' %}}"
			+ (male or field_name)
			+ "{{% else %}}"
			+ (female or field_name)
			+ "{{% endif %}}"
		)
	return "{{ " + field_name + " }}"
