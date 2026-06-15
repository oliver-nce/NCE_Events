import { isFieldInPanelReadOnlyList } from "./panelFieldReadOnly.js";

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

function cint(v) {
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? 0 : n;
}

function isMetaReadOnly(col) {
	if (!col) {
		return false;
	}
	return Number(col.read_only) === 1 || col.read_only === true || col.read_only === "1";
}

/**
 * Whether a portal grid column (related tab / inline child) accepts edits.
 * Editability is NOT driven by portal_field_config.editable — only Show, fieldtype,
 * DocType read_only, and Page Panel read_only_fields.
 */
export function isPortalGridColumnEditable(col, opts = {}) {
	if (opts.readOnlyHost) {
		return false;
	}
	if (!col) {
		return false;
	}
	const ft = col.fieldtype;
	if (!ft || RELATED_GRID_NON_EDITABLE_TYPES.has(ft)) {
		return false;
	}
	if (isMetaReadOnly(col)) {
		return false;
	}
	if (isFieldInPanelReadOnlyList(col.fieldname, opts.readOnlyFields, opts.linkField)) {
		return false;
	}
	return true;
}

export function metaReadOnlyFromField(f) {
	if (!f || typeof f !== "object") {
		return 0;
	}
	return cint(f.read_only);
}
