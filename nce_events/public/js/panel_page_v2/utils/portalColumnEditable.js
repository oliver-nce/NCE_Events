// Decides portal grid column editability from fieldtype, meta read_only, and panel read_only_fields.
//
// code-index:begin
// {
//  "purpose": "Decides portal grid column editability from fieldtype, meta read_only, and panel read_only_fields.",
//  "read_when": "When changing related or inline child column edit rules excluding portal_field_config.editable.",
//  "gotchas": [
//   "Editability is not driven by portal_field_config.editable only Show fieldtype and read_only rules."
//  ],
//  "keywords": ["portalColumnEditable", "isPortalGridColumnEditable", "RELATED_GRID_NON_EDITABLE_TYPES", "read_only_fields", "isMetaReadOnly"],
//  "format": 1
// }
// code-index:end

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
	// User lacks write permission on the child DocType — no column is editable.
	if (opts.canWrite === false) {
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
	// Permlevel gate: only writable when the column's permlevel is in the allowed
	// set. A non-array (null) means "undeterminable" — skip the gate (fail-open).
	if (Array.isArray(opts.writablePermlevels)) {
		if (!opts.writablePermlevels.includes(Number(col.permlevel || 0))) {
			return false;
		}
	}
	return true;
}

export function metaReadOnlyFromField(f) {
	if (!f || typeof f !== "object") {
		return 0;
	}
	return cint(f.read_only);
}
