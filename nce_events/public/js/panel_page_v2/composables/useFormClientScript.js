/**
 * Runs captured Client Scripts inside the Panel Form Dialog.
 *
 * Two-phase approach:
 *  1. activateScripts() — intercepts frappe.ui.form.on, runs each script's refresh
 *     handler with a DOM-safe shim. Applies set_df_property overrides and discovers
 *     add_custom_button registrations. For scripts that do pure DOM injection (no
 *     add_custom_button), still returns a "Tools" tab so mountTool can render them.
 *  2. mountTool(tool, domContainer) — called by PanelFormScriptToolTab on mount.
 *     Re-runs refresh with a full shim that has layout.wrapper pointing to the real
 *     DOM container, rendering the complete JS UI into that element.
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
		const origOn = window.frappe?.ui?.form?.on;

		for (const src of scripts) {
			if (!src) continue;
			const captured = {};
			try {
				if (window.frappe?.ui?.form) {
					window.frappe.ui.form.on = (registeredDt, events) => {
						if (registeredDt === dt) Object.assign(captured, events);
					};
				}
				// eslint-disable-next-line no-new-func
				new Function('frappe', src)(window.frappe || {});
			} catch (e) {
				console.warn('[useFormClientScript] capture error:', e);
			} finally {
				if (window.frappe?.ui?.form && origOn) window.frappe.ui.form.on = origOn;
			}
			result.push(captured);
		}

		return (_cachedHandlers = result);
	}

	/** Build a base shim for frm. Callers should overlay layout/fields_dict/page as needed. */
	function _buildBaseShim() {
		return {
			doc: formData,
			doctype: _resolveDoctype(),
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
			set_query() {},
			is_new() { return false; },
			add_custom_button() {},
		};
	}

	/**
	 * Build a Proxy that silently absorbs all property reads and method calls.
	 * Returned functions also return a Proxy, so chaining (e.g. page.add_action().then(...))
	 * doesn't throw.
	 */
	function _makeAbsorbProxy() {
		const fn = () => _makeAbsorbProxy();
		return new Proxy(fn, {
			get(_, k) {
				if (k === Symbol.toPrimitive || k === 'valueOf' || k === 'toString') return () => '';
				return _makeAbsorbProxy();
			},
			apply() { return _makeAbsorbProxy(); },
		});
	}

	/**
	 * Build a fields_dict Proxy that returns a fake field object for every fieldname.
	 * Each field's $wrapper points to `anchorEl` so DOM-insertion calls work
	 * without crashing.
	 *
	 * @param {HTMLElement} anchorEl  — An element already inside the target container.
	 */
	function _makeFieldsDictProxy(anchorEl) {
		const $anchor = window.$ ? window.$(anchorEl) : null;
		return new Proxy({}, {
			get(_, fn) {
				if (typeof fn === 'symbol') return undefined;
				return {
					$wrapper: $anchor || { before() {}, append() {}, find() { return { hide() {}, show() {} }; } },
					wrapper: anchorEl,
					df: {},
					get_value() { return null; },
				};
			},
		});
	}

	/**
	 * Phase 1 — call after load completes.
	 * Runs refresh handlers with a DOM-safe shim, applies field overrides,
	 * discovers tool groups. If scripts exist with refresh handlers but make no
	 * add_custom_button calls (i.e. they do pure DOM injection), returns a single
	 * generic "Tools" tab so mountTool can render them.
	 *
	 * @returns {Array<{ label: string, buttons: Array<{label: string, handler: Function}> }>}
	 */
	function activateScripts() {
		_cachedHandlers = null; // reset cache on each load
		const handlers = _captureHandlers();
		const toolGroups = {};
		let hasRefreshHandlers = false;

		// Attach a real-but-invisible DOM element so scripts that do
		// $(frm.layout.wrapper) / frm.fields_dict[x].$wrapper don't throw.
		const $safeHost = window.$ ? window.$('<div style="display:none;position:absolute;left:-9999px"></div>').appendTo('body') : null;
		const safeHost = $safeHost ? $safeHost[0] : document.createElement('div');
		const $safeAnchor = window.$ ? window.$('<div></div>').appendTo(safeHost) : null;
		const safeAnchor = $safeAnchor ? $safeAnchor[0] : safeHost;

		for (const h of handlers) {
			if (typeof h.refresh !== 'function') continue;
			hasRefreshHandlers = true;

			const shim = _buildBaseShim();
			shim.layout = { wrapper: safeHost };
			shim.$wrapper = $safeHost;
			shim.wrapper = safeHost;
			shim.fields_dict = _makeFieldsDictProxy(safeAnchor);
			shim.page = _makeAbsorbProxy();

			shim.add_custom_button = (label, handler, group) => {
				const groupKey = group || '__ungrouped__';
				const groupLabel = group || 'Tools';
				if (!toolGroups[groupKey]) toolGroups[groupKey] = { label: groupLabel, buttons: [] };
				toolGroups[groupKey].buttons.push({ label, handler });
			};

			try {
				h.refresh(shim);
			} catch (e) {
				console.warn('[useFormClientScript] refresh error (discovery):', e);
			}
		}

		if ($safeHost) $safeHost.remove();

		// Scripts that do pure DOM manipulation have no add_custom_button calls.
		// Still push a "Tools" tab so mountTool gets to render their full UI.
		if (hasRefreshHandlers && Object.keys(toolGroups).length === 0) {
			return [{ label: 'Tools', buttons: [] }];
		}

		return Object.values(toolGroups);
	}

	/**
	 * Phase 2 — called by PanelFormScriptToolTab on mount.
	 * Re-runs refresh with a full DOM-aware shim so scripts can render
	 * their complete HTML UI (tab bars, buttons, etc.) into the container.
	 *
	 * @param {{ label: string, buttons: Array }} tool
	 * @param {HTMLElement} domContainer
	 */
	function mountTool(tool, domContainer) {
		const handlers = _captureHandlers();
		const $container = window.$ ? window.$(domContainer) : null;

		// Create an anchor element inside the container.
		// Scripts that insert content relative to frm.fields_dict[x].$wrapper
		// (e.g. $wrapper.before($tabBar)) will insert before this anchor,
		// placing content inside domContainer correctly.
		const $anchor = $container ? window.$('<div class="ppv2-tool-anchor" style="display:none"></div>').appendTo($container) : null;
		const anchorEl = $anchor ? $anchor[0] : domContainer;

		for (const h of handlers) {
			if (typeof h.refresh !== 'function') continue;
			const shim = _buildBaseShim();

			// Point all DOM references at the real container.
			shim.layout = { wrapper: domContainer };
			shim.$wrapper = $container;
			shim.wrapper = domContainer;
			shim.fields_dict = _makeFieldsDictProxy(anchorEl);
			shim.page = _makeAbsorbProxy();

			// Render any add_custom_button registrations into the container.
			shim.add_custom_button = (label, handler /*, group */) => {
				const btn = document.createElement('button');
				btn.textContent = label;
				btn.className = 'ppv2-script-tool-btn';
				btn.addEventListener('click', () => {
					try { handler(); } catch (e) { console.warn('[useFormClientScript] button error:', e); }
				});
				domContainer.appendChild(btn);
			};

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
		const $dummy = window.$ ? window.$('<div style="display:none"></div>').appendTo('body') : null;
		const dummyEl = $dummy ? $dummy[0] : document.createElement('div');

		for (const h of handlers) {
			const fn = h[fieldname];
			if (typeof fn === 'function') {
				const shim = _buildBaseShim();
				shim.layout = { wrapper: dummyEl };
				shim.fields_dict = _makeFieldsDictProxy(dummyEl);
				shim.page = _makeAbsorbProxy();
				try {
					fn(shim);
				} catch (e) {
					console.warn('[useFormClientScript] change error:', e);
				}
			}
		}

		if ($dummy) $dummy.remove();
	}

	return { activateScripts, mountTool, runOnChange };
}
