/**
 * Column layout for form-dialog inline child-table grids (any DocType).
 * Uses fieldtype + label length — not hardcoded fieldnames.
 */

const PRIMARY_FIELD_TYPES = new Set([
	"Link",
	"Dynamic Link",
	"Data",
	"Select",
	"Autocomplete",
	"Text",
	"Small Text",
	"Long Text",
	"Read Only",
	"HTML Editor",
	"Text Editor",
	"Markdown Editor",
]);

const NUMERIC_FIELD_TYPES = new Set([
	"Int",
	"Float",
	"Currency",
	"Percent",
	"Date",
	"Datetime",
	"Time",
	"Duration",
]);

const COMPACT_FIELD_TYPES = new Set(["Select", "Autocomplete", "Barcode", "Color"]);

export function isInlineActionButtonColumn(col) {
	return col?.isActionButton || col?.fieldtype === "Button";
}

/** First non-check, non-button column absorbs remaining table width. */
export function primaryInlineColumnIndex(columns) {
	const list = columns || [];
	for (let i = 0; i < list.length; i++) {
		const col = list[i];
		if (!col || isInlineActionButtonColumn(col) || col.fieldtype === "Check") {
			continue;
		}
		if (PRIMARY_FIELD_TYPES.has(col.fieldtype)) {
			return i;
		}
	}
	for (let i = 0; i < list.length; i++) {
		const col = list[i];
		if (!col || isInlineActionButtonColumn(col) || col.fieldtype === "Check") {
			continue;
		}
		return i;
	}
	return list.length ? 0 : -1;
}

export function inlineColumnRole(col, columnIndex, columns) {
	if (!col) {
		return "medium";
	}
	if (isInlineActionButtonColumn(col)) {
		return "action";
	}
	if (col.fieldtype === "Check") {
		return "check";
	}
	if (columnIndex === primaryInlineColumnIndex(columns)) {
		return "primary";
	}
	if (NUMERIC_FIELD_TYPES.has(col.fieldtype)) {
		return "numeric";
	}
	if (COMPACT_FIELD_TYPES.has(col.fieldtype)) {
		return "compact";
	}
	return "medium";
}

function labelWidthRem(label, { min = 5, max = 11, base = 3.25, perChar = 0.42 } = {}) {
	const len = String(label || "").trim().length;
	if (!len) {
		return min;
	}
	return Math.max(min, Math.min(max, base + len * perChar));
}

/** Optional inline width for <col> when label needs more room than CSS default. */
export function inlineColStyle(col, columnIndex, columns) {
	const role = inlineColumnRole(col, columnIndex, columns);
	const label = col?.label || col?.fieldname || "";
	if (role === "check") {
		return { width: `${labelWidthRem(label, { min: 5.25, max: 10, base: 3.5, perChar: 0.4 })}rem` };
	}
	if (role === "action") {
		return { width: `${labelWidthRem(label, { min: 7.5, max: 12, base: 5, perChar: 0.45 })}rem` };
	}
	return null;
}

export function inlineColgroupClass(col, columnIndex, columns) {
	return `ppv2-fd-child-col-${inlineColumnRole(col, columnIndex, columns)}`;
}

export function inlineHeaderClass(col, columnIndex, columns) {
	const role = inlineColumnRole(col, columnIndex, columns);
	if (role === "check" || role === "action" || role === "numeric") {
		return `ppv2-fd-child-th-${role}`;
	}
	if (role === "primary") {
		return "ppv2-fd-child-th-primary";
	}
	return "";
}

export function inlineCellClass(col, columnIndex, columns) {
	const role = inlineColumnRole(col, columnIndex, columns);
	if (role === "check" || role === "action" || role === "numeric") {
		return `ppv2-fd-child-td-${role}`;
	}
	if (role === "primary") {
		return "ppv2-fd-child-td-primary";
	}
	return "";
}

/** Precomputed per-column layout for a grid (colgroup / header / cell classes + col width). */
export function buildInlineColumnLayout(columns) {
	return (columns || []).map((col, columnIndex) => ({
		colgroupClass: inlineColgroupClass(col, columnIndex, columns),
		headerClass: inlineHeaderClass(col, columnIndex, columns),
		cellClass: inlineCellClass(col, columnIndex, columns),
		colStyle: inlineColStyle(col, columnIndex, columns),
	}));
}
