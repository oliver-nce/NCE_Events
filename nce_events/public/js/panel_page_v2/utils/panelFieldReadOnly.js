/**
 * Match Page Panel Display read_only_fields keys against a field in Form Dialog.
 *
 * Root frozen fields: exact fieldname match (no dots).
 * Related / inline child columns: bare fieldname or `{linkField}.{fieldname}`.
 */

export function isFieldInPanelReadOnlyList(fieldname, readOnlyFields, linkField = null) {
	if (!Array.isArray(readOnlyFields) || !readOnlyFields.length) {
		return false;
	}
	const fn = String(fieldname || "").trim();
	if (!fn) {
		return false;
	}
	const link = linkField ? String(linkField).trim() : "";
	for (const raw of readOnlyFields) {
		const k = String(raw || "").trim();
		if (!k) {
			continue;
		}
		if (k === fn) {
			return true;
		}
		if (link && k === `${link}.${fn}`) {
			return true;
		}
	}
	return false;
}

/** Root frozen-schema field — panel list uses bare fieldnames only. */
export function isRootFieldPanelReadOnly(fieldname, readOnlyFields) {
	if (!Array.isArray(readOnlyFields) || !readOnlyFields.length) {
		return false;
	}
	const fn = String(fieldname || "").trim();
	if (!fn || fn.includes(".")) {
		return false;
	}
	return readOnlyFields.some((raw) => String(raw || "").trim() === fn);
}
