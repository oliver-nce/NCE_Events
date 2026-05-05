/**
 * Unsaved Form Dialog rows: Vue formData can lag Frappe Date / Int inputs.
 * Read the visible control value from the dialog DOM by Frappe fieldname.
 */
export function readLiveFieldValue(formBodyEl, fieldname) {
	if (!formBodyEl?.querySelector || !fieldname) {
		return null;
	}
	const sel =
		typeof CSS !== "undefined" && typeof CSS.escape === "function"
			? `[data-fd-fieldname="${CSS.escape(String(fieldname))}"]`
			: `[data-fd-fieldname="${String(fieldname).replace(/"/g, "")}"]`;
	const wrap = formBodyEl.querySelector(sel);
	if (!wrap) {
		return null;
	}
	const dateInp =
		wrap.querySelector(".ppv2-fd-datetime-frappe input.form-control") ||
		wrap.querySelector(".ppv2-fd-datetime-frappe input");
	const numInp = wrap.querySelector('input[type="number"]');
	const anyInp = wrap.querySelector("input:not([type=hidden]):not([type=checkbox])");
	const el = dateInp || numInp || anyInp;
	if (!el || el.value == null) {
		return null;
	}
	const v = String(el.value).trim();
	return v === "" ? null : v;
}
