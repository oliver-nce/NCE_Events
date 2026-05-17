/**
 * Executes captured Client Scripts (from frozen_meta.client_scripts) inside the
 * Panel Form Dialog, providing a minimal cur_frm shim.
 *
 * Scripts are sourced from frozen_meta.client_scripts — a list of JS strings
 * captured at Form Dialog build/rebuild time from the Frappe Client Script DocType.
 *
 * Shim surface (intentionally minimal — no frappe.ui.form APIs):
 *   cur_frm.doc                       reactive formData object
 *   cur_frm.get_value(fn)             read a field value
 *   cur_frm.set_value(fn, val)        write a field value
 *   cur_frm.get_field(fn)             returns { df } or null
 *   cur_frm.set_df_property(fn, prop, val)  writes to scriptFieldOverrides (hidden/reqd/read_only)
 *   cur_frm.refresh_field()           no-op — Vue reactivity handles re-render
 *
 * @param {object}                 opts
 * @param {import('vue').Ref}      opts.definition           — loaded Form Dialog definition ref
 * @param {import('vue').Ref}      opts.allFields            — flat frozen field array ref
 * @param {object}                 opts.formData             — reactive formData object
 * @param {import('vue').Reactive} opts.scriptFieldOverrides — reactive map for set_df_property writes
 */
export function useFormClientScript({ definition, allFields, formData, scriptFieldOverrides }) {
	function _buildShim(fieldname) {
		return {
			doc: formData,
			fieldname: fieldname || null,

			get_value(fn) {
				return formData[fn] !== undefined ? formData[fn] : null;
			},

			set_value(fn, val) {
				formData[fn] = val;
			},

			get_field(fn) {
				const df = (allFields.value || []).find((f) => f.fieldname === fn) || null;
				return df ? { df } : null;
			},

			set_df_property(fn, prop, val) {
				if (!scriptFieldOverrides[fn]) scriptFieldOverrides[fn] = {};
				scriptFieldOverrides[fn][prop] = val;
			},

			refresh_field() {
				// no-op — Vue reactivity handles re-render
			},
		};
	}

	function _runScripts(fieldname) {
		const scripts = definition.value?.frozen_meta?.client_scripts;
		if (!Array.isArray(scripts) || !scripts.length) return;

		const shim = _buildShim(fieldname);

		for (const src of scripts) {
			if (!src) continue;
			try {
				// eslint-disable-next-line no-new-func
				const fn = new Function("cur_frm", "frappe", src);
				fn(shim, window.frappe || {});
			} catch (e) {
				console.warn("[useFormClientScript] script error:", e);
			}
		}
	}

	/** Call after form load completes (loading → false with definition set). */
	function runOnLoad() {
		_runScripts(null);
	}

	/** Call after a field value changes, passing the changed fieldname. */
	function runOnChange(fieldname) {
		_runScripts(fieldname);
	}

	return { runOnLoad, runOnChange };
}
