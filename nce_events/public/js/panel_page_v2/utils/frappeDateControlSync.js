/**
 * Bridge Vue modelValue ↔ Frappe Date/Datetime control when using df.change().
 *
 * Custom df.change skips Frappe's set_model_value, so stub `doc[fieldname]` must be
 * updated manually. Programmatic Vue updates must use set_input — not set_value —
 * or df.change retriggers and can freeze the tab.
 */

/** @returns {boolean} */
export function stubDocMatchesModel(docVal, modelVal) {
	if (docVal === modelVal) {
		return true;
	}
	const a = docVal ?? "";
	const b = modelVal ?? "";
	if (String(a).trim() === String(b).trim()) {
		return true;
	}
	try {
		if (typeof frappe === "undefined" || !frappe.datetime?.user_to_str) {
			return false;
		}
		const ua = frappe.datetime.user_to_str(String(a), false);
		const ub = frappe.datetime.user_to_str(String(b), false);
		return !!(ua && ub && ua === ub);
	} catch {
		return false;
	}
}

/** @param {unknown} ctrl */
export function writeStubDocField(ctrl, fieldname, value) {
	if (!ctrl?.doc || !fieldname) {
		return;
	}
	ctrl.doc[fieldname] = value;
}

/**
 * Vue → control: refresh input/picker without firing validate/set_model paths.
 *
 * @param {unknown} control - Frappe UI control instance
 * @param {string} fieldname
 * @param {unknown} modelVal
 * @param {import('vue').Ref<boolean> | { value?: boolean } | null} [fdSyncingFromLoad]
 */
export function applyVueValueToDateControl(control, fieldname, modelVal, fdSyncingFromLoad) {
	if (!control?.set_input || !control.doc) {
		return;
	}
	if (fdSyncingFromLoad?.value) {
		return;
	}
	const nv = modelVal ?? "";
	if (stubDocMatchesModel(control.doc[fieldname], nv)) {
		return;
	}
	writeStubDocField(control, fieldname, nv);
	control.set_input(nv);
}

/**
 * @param {{
 *   fieldname: string;
 *   fdSyncingFromLoad: import('vue').Ref<boolean> | { value?: boolean } | null;
 *   emit: (type: string, payload: { fieldname: string, value: unknown }) => void;
 * }} cfg
 */
export function createDateControlChangeHandler(cfg) {
	const fn = cfg.fieldname;
	return function frappeDateDfChange() {
		if (cfg.fdSyncingFromLoad?.value) {
			return;
		}
		const v = this.get_value();
		writeStubDocField(this, fn, v);
		cfg.emit("change", { fieldname: fn, value: v });
	};
}
