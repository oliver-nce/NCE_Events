/**
 * Legacy re-exports — display baseline replaced formData-writing scrape.
 */
import {
	findFieldWrap,
	readDisplayedValueFromWrap,
} from "./formDialogDisplayBaseline.js";

export {
	isBaselineField as isScrapableWritableField,
	blurFocusedFrappeWidget,
	captureDisplayBaseline,
	diffDisplayBaseline,
} from "./formDialogDisplayBaseline.js";

/** @deprecated No longer patches formData — returns empty result. */
export function syncWritableControlsIntoFormData() {
	return { patched: false, count: 0, fields: [] };
}

/** @deprecated Use blurFocusedFrappeWidget */
export function blurFocusedFrappeWidgetIfNeeded() {
	return null;
}

/** @deprecated Use syncWritableControlsIntoFormData */
export function syncLaggingControlsIntoFormData() {
	return { patched: false, count: 0, fields: [] };
}

export function readLiveFieldValue(formBodyEl, fieldname, fieldtype) {
	const wrap = findFieldWrap(formBodyEl, fieldname);
	if (!wrap) {
		return null;
	}
	const v = readDisplayedValueFromWrap(wrap, fieldtype);
	if (v === undefined || v === "") {
		return null;
	}
	return v;
}
