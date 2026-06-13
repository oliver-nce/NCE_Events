import { toRaw } from "vue";

/** Loose scalar compare — matches PanelFormDialogBody field dirty highlighting. */
export function scalarValuesEquivalent(a, b) {
	if (a === b) {
		return true;
	}
	if (a == null && b == null) {
		return true;
	}
	if (a == null || b == null) {
		return false;
	}
	if ((a === 0 || a === "0" || a === false) && (b === 0 || b === "0" || b === false)) {
		return true;
	}
	if ((a === 1 || a === "1" || a === true) && (b === 1 || b === "1" || b === true)) {
		return true;
	}
	return String(a) === String(b);
}

/** True when a scalar field has no stored/visible value (Check 0/1 are never empty). */
export function isEmptyScalarValue(value, fieldtype) {
	const ft = String(fieldtype || "").trim();
	if (ft === "Check") {
		return false;
	}
	return value == null || value === "";
}

/** Stable JSON for dirty-checking reactive form state vs loaded snapshot. */
export function snapshotForCompare(data) {
	const raw = toRaw(data) || {};
	const sorted = {};
	for (const k of Object.keys(raw).sort()) {
		let v = raw[k];
		if (v === undefined) v = null;
		sorted[k] = v;
	}
	return JSON.stringify(sorted);
}

/** Root form dirty check with 0/"0" and 1/"1" normalization. */
export function isFormDataDirty(formData, originalData) {
	const fd = toRaw(formData) || {};
	const orig = toRaw(originalData) || {};
	const keys = new Set([...Object.keys(fd), ...Object.keys(orig)]);
	for (const k of keys) {
		if (!scalarValuesEquivalent(fd[k], orig[k])) {
			return true;
		}
	}
	return false;
}
