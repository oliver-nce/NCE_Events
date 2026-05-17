/**
 * Runs captured Client Scripts inside the Panel Form Dialog.
 *
 * Two-phase approach:
 *  1. activateScripts() — intercepts frappe.ui.form.on, runs each script's refresh
 *     handler with a base shim. Applies set_df_property overrides and discovers
 *     add_custom_button registrations. Returns scriptTools array (one entry per group).
 *  2. mountTool(tool, domContainer) — called by PanelFormScriptToolTab on mount.
 *     Re-runs refresh with a full shim that has $wrapper pointing to the real DOM
 *     container, rendering the complete JS UI into that element.
 *
 * @param {object}                   opts
 * @param {import('vue').Ref}        opts.definition
 * @param {import('vue').Ref}        opts.allFields
 * @param {object}                   opts.formData
 * @param {import('vue').Reactive}   opts.scriptFieldOverrides
 * @param {import('vue').Ref|string} opts.doctype
 */
export function useFormClientScript({ definition, allFields, formData, scriptFieldOverrides, doctype }) {

	// Cached per-load: array of event-handler maps captured from each script.
	let _cachedHandlers = null;

	function _resolveDoctype() {
		return (doctype && typeof doctype === 'object' && 'value' in doctype)
			? doctype.value
			: doctype;
	}

	/** Run all script bodies, intercepting frappe.ui.form.on to capture handlers. */
	function _captureHandlers() {
		if (_cachedHandlers !== null) return _cachedHandlers;

		const scripts = definition.value?.frozen_meta?.client_scripts;
		if (!Array.isArray(scripts) || !scripts.length) return (_cachedHandlers = []);

		const dt = _resolveDoctype();
		const result = [];

		for (const src of scripts) {
			if (!src) continue;
			const captured = {};
			try {
				const origOn = window.frappe?.ui?.form?.on;
				if (window.frappe?.ui?.form) {
					window.frappe.ui.form.on = (registeredDt, events) => {
						if (registeredDt === dt) Object.assign(captured, events);
					};
				}
				// eslint-disable-next-line no-new-func
				new Function('frappe', src)(window.frappe || {});
				if (window.frappe?.ui?.form && origOn) window.frappe.ui.form.on = origOn;
			} catch (e) {
				console.warn('[useFormClientScript] capture error:', e);
				// Restore on error too
				if (window.frappe?.ui?.form) {
					try {
						const origOn = window.frappe.ui.form.on;
						if (typeof origOn === 'function') window.frappe.ui.form.on = origOn;
					} catch (_) {}
				}
			}
			result.push(captured);
		}

		return (_cachedHandlers = result);
	}

	/** Build the base shim (no DOM). add_custom_button is a no-op; callers override it. */
	function _buildBaseShim() {
		return {
			doc: formData,
			get_value(fn) { return formData[fn] !== undefined ? formData[fn] : null; },
			set_value(fn, val) { formData[fn] = val; },
			get_field(fn) {
				const df = (allFields.value || []).find((f) => f.fieldname === fn) || null;
				return df ? { df } : null;
			},
			set_df_property(fn, prop, val) {
				if (!scriptFieldOverrides[fn]) scriptFieldOverrides[fn] = {};
				scriptFieldOverrides[fn][prop] = val;
			},
			refresh_field() {},
			add_custom_button() {},
		};
	}

	/**
	 * Phase 1 — call after load completes.
	 * Runs refresh handlers, applies field overrides, discovers tool groups.
	 * Resets handler cache so each load gets a fresh capture.
	 *
	 * @returns {Array<{ label: string, buttons: Array<{label: string, handler: Function}> }>}
	 */
	function activateScripts() {
		_cachedHandlers = null; // reset cache on each load
		const handlers = _captureHandlers();
		const toolGroups = {};

		for (const h of handlers) {
			if (typeof h.refresh !== 'function') continue;
			const shim = _buildBaseShim();
			shim.add_custom_button = (label, handler, group) => {
				const groupKey = group || '__ungrouped__';
				const groupLabel = group || 'Tools';
				if (!toolGroups[groupKey]) toolGroups[groupKey] = { label: groupLabel, buttons: [] };
				toolGroups[groupKey].buttons.push({ label, handler });
			};
			try {
				h.refresh(shim);
			} catch (e) {
				console.warn('[useFormClientScript] refresh error:', e);
			}
		}

		return Object.values(toolGroups);
	}

	/**
	 * Phase 2 — called by PanelFormScriptToolTab on mount.
	 * Re-runs refresh with a DOM-aware shim so scripts can render their full HTML UI
	 * into the provided container element.
	 *
	 * @param {{ label: string, buttons: Array }} tool
	 * @param {HTMLElement} domContainer
	 */
	function mountTool(tool, domContainer) {
		const handlers = _captureHandlers();
		const $container = window.$ ? window.$(domContainer) : null;

		for (const h of handlers) {
			if (typeof h.refresh !== 'function') continue;
			const shim = _buildBaseShim();

			// Render buttons for this tool's group into the DOM container.
			shim.add_custom_button = (label, handler, group) => {
				const groupLabel = group || 'Tools';
				if (groupLabel !== tool.label) return;
				const btn = document.createElement('button');
				btn.textContent = label;
				btn.className = 'ppv2-script-tool-btn';
				btn.addEventListener('click', () => {
					try { handler(); } catch (e) { console.warn('[useFormClientScript] button error:', e); }
				});
				domContainer.appendChild(btn);
			};

			// Provide DOM container for scripts that render HTML directly.
			shim.$wrapper = $container;
			shim.wrapper = domContainer;
			shim.fields_dict = new Proxy({}, {
				get(_, fn) {
					return { wrapper: domContainer, $wrapper: $container };
				},
			});

			try {
				h.refresh(shim);
			} catch (e) {
				console.warn('[useFormClientScript] mount error:', e);
			}
		}
	}

	/**
	 * Call after a field value changes to trigger field-level event handlers.
	 * Frappe scripts register these as: frappe.ui.form.on(dt, { fieldname: fn })
	 *
	 * @param {string} fieldname
	 */
	function runOnChange(fieldname) {
		const handlers = _captureHandlers();
		for (const h of handlers) {
			const fn = h[fieldname];
			if (typeof fn === 'function') {
				try {
					fn(_buildBaseShim());
				} catch (e) {
					console.warn('[useFormClientScript] change error:', e);
				}
			}
		}
	}

	return { activateScripts, mountTool, runOnChange };
}
