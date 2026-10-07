/**
 * Root fields eligible for FileMaker-style find (must match server search.py skips).
 *
 * code-index:begin
 * {
 *  "purpose": "Root fields eligible for FileMaker-style find matching server search.py skip rules.",
 *  "read_when": "When changing find-searchable root fields or firstNonRelatedTabIndex for find shell.",
 *  "gotchas": [],
 *  "keywords": ["isFindSearchableRootField", "stringifyFindCriterionSeed", "firstNonRelatedTabIndex", "find shell", "search.py"],
 *  "format": 1
 * }
 * code-index:end
 */
const SKIP_FIELDTYPES = new Set([
	"Table",
	"Attach",
	"Attach Image",
	"HTML",
	"Button",
	"Signature",
	"Geolocation",
	"Barcode",
	"Color",
	"Code",
	"Section Break",
	"Column Break",
	"Tab Break",
	"Fold",
	"Heading",
	"Check",
]);

const SAFE_FIELDNAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** @param {object} field frozen-schema field */
export function isFindSearchableRootField(field) {
	const fn = String(field?.fieldname || "").trim();
	const ft = String(field?.fieldtype || "").trim();
	if (!fn || !SAFE_FIELDNAME.test(fn)) return false;
	if (SKIP_FIELDTYPES.has(ft)) return false;
	return true;
}

/** @param {unknown} v */
export function stringifyFindCriterionSeed(v) {
	if (v == null || v === "") return "";
	if (typeof v === "boolean") return v ? "1" : "0";
	return String(v);
}

/** @param {object[]} tabs */
export function firstNonRelatedTabIndex(tabs) {
	if (!Array.isArray(tabs)) return 0;
	const i = tabs.findIndex((t) => t && !t._related);
	return i >= 0 ? i : 0;
}
