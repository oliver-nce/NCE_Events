import { isLayoutField } from "./frappeFieldExpr.js";
import { isVirtualDocField } from "../composables/frozenFormValidate.js";
import { isEmptyScalarValue } from "./formDialogSnapshot.js";

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

const FRAPPE_WIDGET_WRAP_SEL = ".ppv2-fd-datetime-frappe, .ppv2-fd-link-frappe";

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

function isLiveValueEmpty(liveRaw, fieldtype) {
	if (liveRaw === undefined || liveRaw === null || liveRaw === "") {
		return true;
	}
	const ft = String(fieldtype || "").trim();
	if (ft === "Date" || ft === "Datetime") {
		const s = String(liveRaw).trim();
		if (!s) {
			return true;
		}
		// Partial/placeholder text in Frappe date input — treat as empty for optional skip.
		if (/[a-z]/i.test(s)) {
			return true;
		}
	}
	return false;
}

function shouldSkipOptionalEmpty({ field, liveRaw, originalValue, isFieldMandatory }) {
	if (typeof isFieldMandatory === "function" && isFieldMandatory(field)) {
		return false;
	}
	const ft = String(field?.fieldtype || "").trim();
	const liveEmpty = isLiveValueEmpty(liveRaw, ft);
	const origEmpty = isEmptyScalarValue(originalValue, ft);
	return liveEmpty && origEmpty;
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
 * Blur the focused Frappe Date/Datetime/Link control only when it is writable and
 * committing it is meaningful (required, has a value, or original was non-empty).
 * @returns {string|null} fieldname blurred, or null
 */
export function blurFocusedFrappeWidgetIfNeeded(formBodyEl, options = {}) {
	const { writableFields = [], originalData = null, isFieldMandatory = () => false } = options;
	const active = document.activeElement;
	if (!active?.blur || !formBodyEl?.contains?.(active)) {
		return null;
	}
	const wrap = active.closest?.("[data-fd-fieldname]");
	if (!wrap || !formBodyEl.contains(wrap)) {
		return null;
	}
	if (!wrap.querySelector(FRAPPE_WIDGET_WRAP_SEL)) {
		return null;
	}
	const fn = wrap.getAttribute("data-fd-fieldname");
	if (!fn) {
		return null;
	}
	const field = writableFields.find((f) => f?.fieldname === fn);
	if (!field) {
		return null;
	}
	const liveRaw = readLiveValueFromWrap(wrap, field.fieldtype);
	if (
		shouldSkipOptionalEmpty({
			field,
			liveRaw,
			originalValue: originalData?.[fn],
			isFieldMandatory,
		})
	) {
		return null;
	}
	active.blur();
	return fn;
}

/**
 * Patch formData from visible DOM for writable scalar fields mounted in the body.
 * Skips non-editable fields, unsupported types, and optional fields that are empty
 * in both DOM and originalData (untouched blanks).
 * @returns {{ patched: boolean, count: number, fields: string[] }}
 */
export function syncWritableControlsIntoFormData(formBodyEl, formData, fields, options = {}) {
	const { originalData = null, isFieldMandatory = () => false } = options;
	if (!formBodyEl?.querySelector || !formData || !fields?.length) {
		return { patched: false, count: 0, fields: [] };
	}
	const patchedFields = [];
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
		if (
			shouldSkipOptionalEmpty({
				field: f,
				liveRaw,
				originalValue: originalData?.[fn],
				isFieldMandatory,
			})
		) {
			continue;
		}
		const next = coerceScrapedValue(ft, liveRaw === "" ? null : liveRaw);
		if (!valuesEquivalent(ft, formData[fn], next)) {
			formData[fn] = next;
			patchedFields.push(fn);
		}
	}
	return {
		patched: patchedFields.length > 0,
		count: patchedFields.length,
		fields: patchedFields,
	};
}

/** @deprecated Use syncWritableControlsIntoFormData */
export function syncLaggingControlsIntoFormData(formBodyEl, formData, fields, options) {
	return syncWritableControlsIntoFormData(formBodyEl, formData, fields, options);
}
