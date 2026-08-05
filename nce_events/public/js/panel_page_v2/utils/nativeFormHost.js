/**
 * Mount a real frappe.ui.form.Form inside Panel Form Dialog tab panes.
 * One host instance per dialog open; reparents frm.wrapper when switching tabs.
 */

function layoutFieldtypes() {
	return new Set([
		"Section Break",
		"Column Break",
		"Tab Break",
		"Fold",
		"Heading",
		"HTML",
		"Button",
	]);
}

function isLayoutFieldtype(fieldtype) {
	return layoutFieldtypes().has(fieldtype);
}

function ensureFrappeFormReady() {
	return new Promise((resolve, reject) => {
		if (typeof frappe !== "undefined" && frappe.model && frappe.ui?.form?.Form) {
			resolve();
			return;
		}
		if (typeof frappe === "undefined" || typeof frappe.require !== "function") {
			reject(new Error("Frappe is not available on this page"));
			return;
		}
		frappe.require(
			["form.bundle.js"],
			() => {
				if (frappe.ui?.form?.Form) {
					resolve();
					return;
				}
				reject(new Error("form.bundle.js loaded but frappe.ui.form.Form is missing"));
			},
			(err) => {
				reject(err || new Error("Failed to load form.bundle.js"));
			},
		);
	});
}

/**
 * @returns {Promise<object|null>} frappe.ui.form.Form instance
 */
export function createNativeFormHost({ onDirty } = {}) {
	let frm = null;
	let bootstrapped = false;
	let bootPromise = null;
	let hiddenParent = null;
	let currentContainer = null;
	let dirtyBound = false;

	function _notifyDirty() {
		if (typeof onDirty === "function") {
			onDirty();
		}
	}

	function _bindDirtyListeners() {
		if (dirtyBound || !frm?.wrapper) {
			return;
		}
		const $w = window.$ ? window.$(frm.wrapper) : null;
		if (!$w) {
			return;
		}
		$w.on(
			"change input",
			"input, select, textarea",
			() => _notifyDirty(),
		);
		$w.on("click", ".grid-add-row, .grid-remove-rows", () => _notifyDirty());
		dirtyBound = true;
	}

	function _hideFormChrome() {
		if (!frm?.wrapper) {
			return;
		}
		const $w = window.$ ? window.$(frm.wrapper) : null;
		if (!$w) {
			return;
		}
		$w.find(".page-actions, .standard-actions, .form-footer").hide();
	}

	function _applyView({ mode, focusFieldname, hideFieldnames } = {}) {
		if (!frm?.wrapper) {
			return;
		}
		const $root = window.$ ? window.$(frm.wrapper) : null;
		if (!$root) {
			return;
		}

		const hideSet = new Set(
			Array.isArray(hideFieldnames)
				? hideFieldnames.map((x) => String(x || "").trim()).filter(Boolean)
				: focusFieldname
					? [String(focusFieldname).trim()]
					: [],
		);

		$root.find(".frappe-control[data-fieldname]").each(function applyRowVisibility() {
			const fn = window.$(this).attr("data-fieldname");
			if (!fn) {
				return;
			}
			let show = true;
			if (mode === "inline_child" && focusFieldname) {
				show = fn === String(focusFieldname).trim();
			} else if (mode === "details" && hideSet.size) {
				show = !hideSet.has(fn);
			}
			window.$(this).toggle(show);
		});

		$root.find(".form-section").each(function hideEmptySections() {
			const $section = window.$(this);
			const hasVisible =
				$section.find(".frappe-control[data-fieldname]:visible").length > 0;
			$section.toggle(hasVisible);
		});

		if (typeof frm.refresh_fields === "function") {
			frm.refresh_fields();
		}
	}

	async function bootstrap({ doctype, docname }) {
		if (bootstrapped && frm) {
			return frm;
		}
		if (bootPromise) {
			return bootPromise;
		}

		const dt = String(doctype || "").trim();
		const dn = String(docname || "").trim();
		if (!dt || !dn) {
			throw new Error("Native form requires doctype and docname");
		}

		bootPromise = (async () => {
			await ensureFrappeFormReady();

			await frappe.model.with_doc(dt, dn);

			hiddenParent = document.createElement("div");
			hiddenParent.className = "ppv2-native-form-host-hidden";
			hiddenParent.style.cssText =
				"position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;";
			document.body.appendChild(hiddenParent);

			frm = new frappe.ui.form.Form(dt, hiddenParent, false);
			frm.setup();
			await frm.refresh(dn);
			_hideFormChrome();
			_bindDirtyListeners();
			bootstrapped = true;
			return frm;
		})();

		try {
			return await bootPromise;
		} catch (e) {
			bootPromise = null;
			throw e;
		}
	}

	function mountTo(containerEl, viewOpts = {}) {
		if (!frm || !containerEl) {
			return;
		}
		const wrapper = frm.layout?.wrapper || frm.wrapper;
		if (!wrapper) {
			return;
		}

		if (currentContainer && currentContainer !== containerEl) {
			containerEl.innerHTML = "";
		}
		currentContainer = containerEl;
		containerEl.appendChild(wrapper);
		_applyView(viewOpts);
		_hideFormChrome();
	}

	function syncDocToFormData(formData) {
		if (!frm?.doc || !formData) {
			return;
		}
		const doc =
			typeof frappe.model.copy_doc === "function"
				? frappe.model.copy_doc(frm.doc)
				: { ...frm.doc };
		for (const key of Object.keys(doc)) {
			if (key.startsWith("__")) {
				continue;
			}
			formData[key] = doc[key];
		}
	}

	function destroy() {
		dirtyBound = false;
		currentContainer = null;
		if (frm) {
			try {
				if (frm.wrapper && window.$) {
					window.$(frm.wrapper).off();
				}
				if (typeof frappe.ui.form.on_close === "function") {
					frappe.ui.form.on_close(frm);
				}
			} catch {
				/* best-effort teardown */
			}
			frm = null;
		}
		if (hiddenParent?.parentNode) {
			hiddenParent.parentNode.removeChild(hiddenParent);
		}
		hiddenParent = null;
		bootstrapped = false;
		bootPromise = null;
	}

	function isActive() {
		return bootstrapped && !!frm;
	}

	function getFrm() {
		return frm;
	}

	/** Fieldnames of inline child tabs on this definition — hide on Details view. */
	function collectInlineFieldnames(tabs) {
		const out = [];
		for (const tab of tabs || []) {
			const pfn = tab?._inlineChild?.parent_fieldname;
			if (pfn) {
				out.push(String(pfn).trim());
			}
		}
		return out.filter(Boolean);
	}

	return {
		bootstrap,
		mountTo,
		syncDocToFormData,
		destroy,
		isActive,
		getFrm,
		collectInlineFieldnames,
		isLayoutFieldtype,
	};
}
