import { isLayoutField } from "./frappeFieldExpr.js";
import { isVirtualDocField } from "../composables/frozenFormValidate.js";

/**
 * Unsaved Form Dialog rows: Vue formData can lag visible control values
 * (Frappe pickers, blur-only inputs, etc.). Read DOM by fieldname before dirty/save.
 */

const SCRAPE_SKIP_FIELDTYPES = new Set([
	"Table",
	"Table MultiSelect",
	"Button",
	"Attach",
	"Attach Image",
	"Signature",
	"Geolocation",
	"Read Only",
	"HTML",
	"Image",
	"Heading",
]);

function fieldWrapSelector(fieldname) {
	return typeof CSS !== "undefined" && typeof CSS.escape === "function"
		? `[data-fd-fieldname="${CSS.escape(String(fieldname))}"]`
		: `[data-fd-fieldname="${String(fieldname).replace(/"/g, "")}"]`;
}

function findFieldWrap(formBodyEl, fieldname) {
	if (!formBodyEl?.querySelector || !fieldname) {
		return null;
	}
	return formBodyEl.querySelector(fieldWrapSelector(fieldname));
}

/** Layout / virtual / child-table fields have no editable scalar control in the dialog body. */
export function isScrapableWritableField(field) {
	if (!field?.fieldname) {
		return false;
	}
	const ft = String(field.fieldtype || "").trim();
	if (isLayoutField(ft) || SCRAPE_SKIP_FIELDTYPES.has(ft)) {
		return false;
	}
	if (field.hidden) {
		return false;
	}
	return !isVirtualDocField(field);
}

/**
 * @param {Element} wrap
 * @param {string} fieldtype
 * @returns {unknown|undefined} undefined when no readable control; null/"" when cleared
 */
function readLiveValueFromWrap(wrap, fieldtype) {
	if (!wrap) {
		return undefined;
	}
	const ft = String(fieldtype || "").trim();

	if (wrap.querySelector(".ppv2-fd-readonly-plain") && !wrap.querySelector("input, select, textarea")) {
		return undefined;
	}

	if (ft === "Check") {
		const cb = wrap.querySelector('input[type="checkbox"]');
		if (!cb) {
			return undefined;
		}
		return cb.checked ? 1 : 0;
	}

	const sel = wrap.querySelector("select");
	if (sel) {
		return String(sel.value ?? "");
	}

	const ta = wrap.querySelector("textarea");
	if (ta) {
		return ta.value ?? "";
	}

	const linkInp =
		wrap.querySelector(".ppv2-fd-link-frappe input.form-control") ||
		wrap.querySelector(".ppv2-fd-link-frappe input");
	if (linkInp) {
		const v = String(linkInp.value ?? "").trim();
		return v === "" ? null : v;
	}

	const dateInp =
		wrap.querySelector(".ppv2-fd-datetime-frappe input.form-control") ||
		wrap.querySelector(".ppv2-fd-datetime-frappe input");
	const numInp = wrap.querySelector('input[type="number"]');
	const timeInp = wrap.querySelector('input[type="time"]');
	const anyInp = wrap.querySelector("input:not([type=hidden]):not([type=checkbox])");
	const el = dateInp || numInp || timeInp || anyInp;
	if (!el || el.value == null) {
		return undefined;
	}
	return String(el.value).trim();
}

export function readLiveFieldValue(formBodyEl, fieldname, fieldtype) {
	const wrap = findFieldWrap(formBodyEl, fieldname);
	if (!wrap) {
		return null;
	}
	const v = readLiveValueFromWrap(wrap, fieldtype);
	if (v === undefined) {
		return null;
	}
	if (v === "") {
		return null;
	}
	return v;
}

function coerceScrapedValue(fieldtype, live) {
	if (live == null || live === "") {
		return null;
	}
	const ft = String(fieldtype || "").trim();
	if (ft === "Check") {
		return live ? 1 : 0;
	}
	if (ft === "Int") {
		const n = parseInt(String(live), 10);
		return Number.isNaN(n) ? live : n;
	}
	if (ft === "Float" || ft === "Currency" || ft === "Percent") {
		const n = parseFloat(String(live));
		return Number.isNaN(n) ? live : n;
	}
	return live;
}

function valuesEquivalent(fieldtype, a, b) {
	const ca = coerceScrapedValue(fieldtype, a == null || a === "" ? null : a);
	const cb = coerceScrapedValue(fieldtype, b == null || b === "" ? null : b);
	if (ca === cb) {
		return true;
	}
	if (ca == null && cb == null) {
		return true;
	}
	if (ca == null || cb == null) {
		return false;
	}
	return String(ca).trim() === String(cb).trim();
}

/**
 * Patch formData from visible DOM for all writable scalar fields mounted in the body.
 * Skips layout, virtual, hidden, read-only, and unsupported types (child tables, attach).
 * @returns {boolean} true when any field was patched
 */
export function syncWritableControlsIntoFormData(formBodyEl, formData, fields) {
	if (!formBodyEl?.querySelector || !formData || !fields?.length) {
		return false;
	}
	let patched = false;
	for (const f of fields) {
		const fn = f?.fieldname;
		const ft = String(f?.fieldtype || "").trim();
		if (!fn || !isScrapableWritableField(f)) {
			continue;
		}
		const wrap = findFieldWrap(formBodyEl, fn);
		if (!wrap) {
			continue;
		}
		const liveRaw = readLiveValueFromWrap(wrap, ft);
		if (liveRaw === undefined) {
			continue;
		}
		const next = coerceScrapedValue(ft, liveRaw === "" ? null : liveRaw);
		if (!valuesEquivalent(ft, formData[fn], next)) {
			formData[fn] = next;
			patched = true;
		}
	}
	return patched;
}

/** @deprecated Use syncWritableControlsIntoFormData */
export function syncLaggingControlsIntoFormData(formBodyEl, formData, fields) {
	return syncWritableControlsIntoFormData(formBodyEl, formData, fields);
}
