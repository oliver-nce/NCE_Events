/**
 * Panel Form Dialog shell: dirty confirm + Alt+Arrow row navigation key handler.
 *
 * code-index:begin
 * {
 *  "purpose": "Form dialog shell helpers for dirty discard confirm and Alt+Arrow row navigation keydown handler.",
 *  "read_when": "When changing unsaved changes discard confirm or Alt+Arrow prev/next keyboard nav.",
 *  "gotchas": [],
 *  "keywords": ["confirmDiscardIfDirty", "createRowNavKeydownHandler", "onFormDialogKeydown", "Alt ArrowLeft", "getCanPrev", "getCanNext", "unsaved changes"],
 *  "format": 1
 * }
 * code-index:end
 */

function __(t) {
	return typeof window.__ === "function" ? window.__(t) : t;
}

/**
 * @param {() => boolean} isDirty
 * @param {() => void} proceed
 */
export function confirmDiscardIfDirty(isDirty, proceed) {
	if (!isDirty()) {
		proceed();
		return;
	}
	const msg = __(
		"You have unsaved changes. Discard them and continue?",
	);
	if (typeof frappe !== "undefined" && frappe.confirm) {
		frappe.confirm(msg, () => proceed(), () => {});
	} else if (window.confirm(msg)) {
		proceed();
	}
}

/**
 * @param {object} opts
 * @param {() => boolean} opts.getOpen
 * @param {() => boolean} opts.getCanPrev
 * @param {() => boolean} opts.getCanNext
 * @param {() => void} opts.onNavPrev — already includes discard confirm if needed
 * @param {() => void} opts.onNavNext
 */
export function createRowNavKeydownHandler({ getOpen, getCanPrev, getCanNext, onNavPrev, onNavNext }) {
	return function onFormDialogKeydown(e) {
		if (!getOpen()) return;
		if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
		if (e.key === "ArrowLeft" && getCanPrev()) {
			e.preventDefault();
			onNavPrev();
		} else if (e.key === "ArrowRight" && getCanNext()) {
			e.preventDefault();
			onNavNext();
		}
	};
}
