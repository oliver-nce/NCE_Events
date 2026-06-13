import { isLayoutField } from "./frappeFieldExpr.js";
import { isVirtualDocField } from "../composables/frozenFormValidate.js";

/**
 * Display-baseline dirty check: compare what each control shows now vs at load/save.
 * Read-only — never writes into formData (avoids Frappe date format side effects).
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

export function findFieldWrap(formBodyEl, fieldname) {
	if (!formBodyEl?.querySelector || !fieldname) {
		return null;
	}
	return formBodyEl.querySelector(fieldWrapSelector(fieldname));
}

/** Editable scalar fields that render a control in the dialog body. */
export function isBaselineField(field) {
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

/** Canonical display string for baseline compare. */
export function displayValueKey(value) {
	if (value === undefined || value === null) {
		return "";
	}
	if (value === false) {
		return "0";
	}
	if (value === true) {
		return "1";
	}
	return String(value);
}

/**
 * Read the visible control text/value from a field wrapper.
 * @returns {string|undefined} undefined when no readable control in DOM
 */
export function readDisplayedValueFromWrap(wrap, fieldtype) {
	if (!wrap) {
		return undefined;
	}
	const ft = String(fieldtype || "").trim();

	if (wrap.querySelector(".ppv2-fd-readonly-plain") && !wrap.querySelector("input, select, textarea")) {
		const plain = wrap.querySelector(".ppv2-fd-readonly-plain");
		return displayValueKey(plain?.textContent?.trim() ?? "");
	}

	if (ft === "Check") {
		const cb = wrap.querySelector('input[type="checkbox"]');
		if (!cb) {
			return undefined;
		}
		return cb.checked ? "1" : "0";
	}

	const sel = wrap.querySelector("select");
	if (sel) {
		return displayValueKey(sel.value ?? "");
	}

	const ta = wrap.querySelector("textarea");
	if (ta) {
		return displayValueKey(ta.value ?? "");
	}

	const linkInp =
		wrap.querySelector(".ppv2-fd-link-frappe input.form-control") ||
		wrap.querySelector(".ppv2-fd-link-frappe input");
	if (linkInp) {
		return displayValueKey(String(linkInp.value ?? "").trim());
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
	return displayValueKey(el.value);
}

/**
 * @param {Element} formBodyEl
 * @param {Array} fields — writable visible field defs
 * @returns {Record<string, string>}
 */
export function captureDisplayBaseline(formBodyEl, fields) {
	const baseline = {};
	if (!formBodyEl?.querySelector || !fields?.length) {
		return baseline;
	}
	for (const f of fields) {
		const fn = f?.fieldname;
		if (!fn || !isBaselineField(f)) {
			continue;
		}
		const wrap = findFieldWrap(formBodyEl, fn);
		if (!wrap) {
			continue;
		}
		const displayed = readDisplayedValueFromWrap(wrap, f.fieldtype);
		if (displayed === undefined) {
			continue;
		}
		baseline[fn] = displayed;
	}
	return baseline;
}

/**
 * @returns {{ dirty: boolean, changedFields: string[] }}
 */
export function diffDisplayBaseline(baseline, current) {
	const changedFields = [];
	const keys = new Set([...Object.keys(baseline || {}), ...Object.keys(current || {})]);
	for (const fn of keys) {
		const baseVal = baseline?.[fn];
		const curVal = current?.[fn];
		if (baseVal === undefined) {
			if (curVal !== undefined && curVal !== "") {
				changedFields.push(fn);
			}
			continue;
		}
		if (curVal === undefined) {
			continue;
		}
		if (curVal !== baseVal) {
			changedFields.push(fn);
		}
	}
	return { dirty: changedFields.length > 0, changedFields };
}

/**
 * Blur only the focused Frappe Date/Datetime/Link control (commits open picker via df.change).
 * @returns {string|null} fieldname blurred
 */
export function blurFocusedFrappeWidget(formBodyEl, writableFieldnames) {
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
	if (writableFieldnames && !writableFieldnames.has(fn)) {
		return null;
	}
	active.blur();
	return fn;
}
