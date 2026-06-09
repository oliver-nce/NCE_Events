/** Pure cell-format helpers for related-doctype and similar portal grids. */

export const RELATED_GRID_NON_EDITABLE_TYPES = new Set([
	"Link",
	"Dynamic Link",
	"Table",
	"Attach",
	"Attach Image",
	"HTML",
	"Read Only",
	"Button",
	"Barcode",
	"Geolocation",
]);

/** Related table column: show red asterisk when child DocType marks field mandatory (`reqd`). */
export function relatedColumnMandatory(col) {
	if (!col || col.reqd == null) {
		return false;
	}
	return Number(col.reqd) === 1 || col.reqd === true || col.reqd === "1";
}

export function parseSelectOptions(optionsStr) {
	if (optionsStr == null || typeof optionsStr !== "string") {
		return [];
	}
	return optionsStr
		.split("\n")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function isSelectColumn(col) {
	return !!(col && col.fieldtype === "Select");
}

export function relatedCellRaw(rw, col) {
	if (!rw || !col) {
		return null;
	}
	return rw[col.fieldname];
}

export function relatedCellTruthy(rw, col) {
	const v = relatedCellRaw(rw, col);
	return v === 1 || v === true || v === "1" || v === "Yes";
}

export function formatRelatedCell(rw, col) {
	const v = relatedCellRaw(rw, col);
	if (v == null || v === "") {
		return "";
	}
	if (typeof v === "object") {
		try {
			return JSON.stringify(v);
		} catch {
			return String(v);
		}
	}
	return String(v);
}

/** Options from DocType meta plus current row value if missing from the list. */
export function selectOptionsForCell(col, rw) {
	const base = parseSelectOptions(col.options);
	const cur = String(relatedCellRaw(rw, col) ?? "").trim();
	if (cur && !base.includes(cur)) {
		return [...base, cur];
	}
	if (base.length) {
		return base;
	}
	return cur ? [cur] : [];
}

export function isRelatedColEditable(col) {
	if (!col || !(Number(col.editable) === 1 || col.editable === true)) {
		return false;
	}
	const ft = col.fieldtype;
	return !RELATED_GRID_NON_EDITABLE_TYPES.has(ft);
}

export function isRelatedNumberField(col) {
	const ft = col?.fieldtype;
	return ft === "Int" || ft === "Float" || ft === "Currency";
}

export function isRelatedLongText(col) {
	return col?.fieldtype === "Text" || col?.fieldtype === "Long Text";
}
