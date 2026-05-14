import { ref } from "vue";
import { useFormDialogRecordNav, panelRowArray } from "./useFormDialogRecordNav.js";
import { frappeCall } from "../utils/frappeCall.js";

const WP_READBACK_PAUSE_MS = 1500;

function sleepMs(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/** Filtered rows ref array from drilled panel (`usePanel`). */
function mutablePanelRows(panel) {
	const pr = panel._panelRows;
	if (pr?.value !== undefined && Array.isArray(pr.value)) {
		return pr.value;
	}
	if (Array.isArray(panel.rows)) {
		return panel.rows;
	}
	return [];
}

/** Merge fresh Desk doc into the matching panel row (same row keys). */
function mergeFreshDocIntoPanelRow(panel, doc, oldRowName, savedName) {
	if (!panel || !doc) return;
	const list = mutablePanelRows(panel);
	const docNameStr = doc.name != null ? String(doc.name).trim() : "";
	const needles = Array.from(
		new Set(
			[String(oldRowName || "").trim(), String(savedName || "").trim(), docNameStr].filter(
				(s) => s !== "",
			),
		),
	);
	let target = null;
	for (const needle of needles) {
		target = list.find((r) => r && String(r.name) === needle);
		if (target) break;
	}
	if (!target) return;
	Object.assign(target, doc);
}

/**
 * After WP SQL delay: one ``frappe.client.get`` for PK + panel merge + dialog ``form.load()`` seed.
 */
async function fetchDocAfterWpDelay(doctype, savedName, oldRowName) {
	const tries = [];
	if (savedName != null && String(savedName).trim() !== "") {
		tries.push(String(savedName).trim());
	}
	if (
		oldRowName != null &&
		String(oldRowName).trim() !== "" &&
		(!tries.length || String(oldRowName).trim() !== tries[0])
	) {
		tries.push(String(oldRowName).trim());
	}
	for (const nm of tries) {
		try {
			const doc = await frappeCall("frappe.client.get", { doctype, name: nm });
			if (doc?.name != null && String(doc.name).trim() !== "") {
				return doc;
			}
		} catch {
			/* try alternate after WP rename */
		}
	}
	return null;
}

function clearFormDialogRefs(host) {
	host.formDialogRequiredFields.value = [];
	host.formDialogDocName.value = null;
	host.formDialogDefinition.value = null;
	host.formDialogDoctype.value = null;
	host.formDialogSourcePanelId.value = null;
	host.formDialogDefinitionSource.value = "form_dialog";
	host.formDialogPendingDocName.value = null;
	host.formDialogPendingDefinition.value = null;
	host.formDialogPendingDoctype.value = null;
	host.formDialogDissolving.value = false;
	host.formDialogDissolveOpacity.value = 1;
	host.showFormDialog.value = false;
}

function frappeFreezeRefreshing() {
	const msg =
		typeof window.__ === "function"
			? window.__("Refreshing…")
			: "Refreshing…";
	if (typeof frappe !== "undefined" && frappe.dom && typeof frappe.dom.freeze === "function") {
		frappe.dom.freeze(msg);
	}
}

function frappeUnfreeze() {
	if (typeof frappe !== "undefined" && frappe.dom && typeof frappe.dom.unfreeze === "function") {
		frappe.dom.unfreeze();
	}
}

/**
 * Panel Page V2: form dialog state, row navigation, open from panel row, close/save + panel refresh.
 * Uses a dual-slot dissolve transition for flicker-free prev/next navigation.
 * Core dialog UI lives in PanelFormDialog.vue + usePanelFormDialog.
 *
 * @param {import('vue').Reactive<Array>} openPanels — same reactive array as App.vue floats
 */
export function usePanelFormDialogHost(openPanels) {
	const showFormDialog = ref(false);
	const formDialogDocName = ref(null);
	const formDialogDefinition = ref(null);
	const formDialogDoctype = ref(null);
	const formDialogSourcePanelId = ref(null);
	/** Where the captured definition lives: 'form_dialog' (default) or 'panel_action'. */
	const formDialogDefinitionSource = ref("form_dialog");
	/** Root fieldnames from Page Panel `required_fields` (Form Dialog validation). */
	const formDialogRequiredFields = ref([]);

	// Dual-slot state for dissolve transitions
	const formDialogSlot = ref(0);
	const formDialogPendingDocName = ref(null);
	const formDialogPendingDefinition = ref(null);
	const formDialogPendingDoctype = ref(null);
	const formDialogDissolving = ref(false);
	const formDialogDissolveOpacity = ref(1);

	/** After WP delay: bump so dialog runs full ``form.load()`` from Frappe DB (panel row merged same GET). */
	const wpReadbackReloadTick = ref(0);

	const {
		formDialogNavInfo,
		formDialogNavLabel,
	} = useFormDialogRecordNav({
		openPanels,
		showFormDialog,
		sourcePanelId: formDialogSourcePanelId,
		docName: formDialogDocName,
	});

	/** @returns {boolean} true if the form dialog was opened */
	function openFormDialogFromPanelRow(panel, row) {
		if (!panel?.config?.form_dialog || !row?.name) return false;
		formDialogDefinition.value = panel.config.form_dialog;
		formDialogDoctype.value = panel.doctype;
		formDialogDocName.value = row.name;
		formDialogSourcePanelId.value = panel.id;
		formDialogDefinitionSource.value = "form_dialog";
		const rf = panel.config?.required_fields;
		formDialogRequiredFields.value = Array.isArray(rf) ? rf.slice() : [];
		showFormDialog.value = true;
		return true;
	}

	/** New document in the same frozen Form Dialog as row edit — requires Page Panel Form Dialog link. */
	function openFormDialogForNewRecord(panel) {
		if (!panel?.config?.form_dialog) return false;
		formDialogPendingDocName.value = null;
		formDialogPendingDefinition.value = null;
		formDialogPendingDoctype.value = null;
		formDialogDissolving.value = false;
		formDialogDissolveOpacity.value = 1;
		formDialogSlot.value = 0;
		formDialogDefinition.value = panel.config.form_dialog;
		formDialogDoctype.value = panel.doctype;
		formDialogDocName.value = null;
		formDialogSourcePanelId.value = panel.id;
		formDialogDefinitionSource.value = "form_dialog";
		const rf = panel.config?.required_fields;
		formDialogRequiredFields.value = Array.isArray(rf) ? rf.slice() : [];
		showFormDialog.value = true;
		return true;
	}

	/**
	 * Open Form Dialog without a parent panel context (e.g. from Actions panel).
	 * @param {{ formDialog: string; doctype: string; docName?: string|null; requiredFields?: string[]; definitionSource?: 'form_dialog'|'panel_action' }} args
	 */
	function openFormDialogStandalone({
		formDialog,
		doctype,
		docName = null,
		requiredFields = [],
		definitionSource = "form_dialog",
	}) {
		if (!formDialog || !doctype) return false;
		formDialogPendingDocName.value = null;
		formDialogPendingDefinition.value = null;
		formDialogPendingDoctype.value = null;
		formDialogDissolving.value = false;
		formDialogDissolveOpacity.value = 1;
		formDialogSlot.value = 0;
		formDialogDefinition.value = formDialog;
		formDialogDoctype.value = doctype;
		formDialogDocName.value = docName;
		formDialogSourcePanelId.value = null;
		formDialogDefinitionSource.value = definitionSource || "form_dialog";
		formDialogRequiredFields.value = Array.isArray(requiredFields) ? requiredFields.slice() : [];
		showFormDialog.value = true;
		return true;
	}

	function onFormDialogClose() {
		showFormDialog.value = false;
		formDialogRequiredFields.value = [];
		formDialogDocName.value = null;
		formDialogDefinition.value = null;
		formDialogDoctype.value = null;
		formDialogSourcePanelId.value = null;
		formDialogDefinitionSource.value = "form_dialog";
		// Clear any in-flight pending nav
		formDialogPendingDocName.value = null;
		formDialogPendingDefinition.value = null;
		formDialogPendingDoctype.value = null;
		formDialogDissolving.value = false;
		formDialogDissolveOpacity.value = 1;
	}

	async function onFormDialogSaved(savedDoc) {
		const doctype = formDialogDoctype.value;
		const oldRowName = formDialogDocName.value;
		const sourcePanelId = formDialogSourcePanelId.value;
		const savedName =
			savedDoc && savedDoc.name != null && String(savedDoc.name).trim() !== ""
				? String(savedDoc.name).trim()
				: null;

		let closeDialogAfter = true;

		try {
			let wantReadback = 0;
			if (doctype) {
				try {
					wantReadback = await frappeCall(
						"nce_events.api.wp_readback_panel.doctype_has_wp_sql_live_readback",
						{ frappe_doctype: doctype },
					);
				} catch {
					wantReadback = 0;
				}
			}

			const panel =
				sourcePanelId != null && sourcePanelId !== undefined
					? openPanels.find((x) => x.id === sourcePanelId && x.doctype === doctype)
					: openPanels.find((x) => x.doctype === doctype);

			if (Number(wantReadback) === 1) {
				closeDialogAfter = false;
				frappeFreezeRefreshing();
				try {
					await sleepMs(WP_READBACK_PAUSE_MS);
					const fresh = await fetchDocAfterWpDelay(doctype, savedName, oldRowName);
					if (fresh?.name != null && String(fresh.name).trim() !== "") {
						formDialogDocName.value = String(fresh.name).trim();
					} else if (savedName) {
						formDialogDocName.value = savedName;
					}
					if (panel && fresh) {
						mergeFreshDocIntoPanelRow(panel, fresh, oldRowName, savedName);
					}
					wpReadbackReloadTick.value++;
				} finally {
					frappeUnfreeze();
				}
			} else if (panel && panel._reload) {
				panel._reload();
			}
		} finally {
			if (closeDialogAfter) {
				clearFormDialogRefs({
					showFormDialog,
					formDialogRequiredFields,
					formDialogDocName,
					formDialogDefinition,
					formDialogDoctype,
					formDialogSourcePanelId,
					formDialogDefinitionSource,
					formDialogPendingDocName,
					formDialogPendingDefinition,
					formDialogPendingDoctype,
					formDialogDissolving,
					formDialogDissolveOpacity,
				});
			}
		}
	}

	// --- Dual-slot dissolve navigation ---

	function _getPanelForNav() {
		return openPanels.find((x) => x.id === formDialogSourcePanelId.value);
	}

	function _findRowIndex(rowName) {
		const p = _getPanelForNav();
		if (!p) return -1;
		const list = panelRowArray(p);
		return list.findIndex((row) => row && row.name === rowName);
	}

	function _targetRowName(direction) {
		const list = panelRowArray(_getPanelForNav());
		const idx = list.findIndex((row) => row && row.name === formDialogDocName.value);
		if (idx < 0) return null;
		const targetIdx = idx + (direction === "prev" ? -1 : 1);
		if (targetIdx < 0 || targetIdx >= list.length) return null;
		return list[targetIdx].name;
	}

	function preparePendingNav(direction) {
		const targetName = _targetRowName(direction);
		if (!targetName) return;
		formDialogPendingDocName.value = targetName;
		formDialogPendingDefinition.value = formDialogDefinition.value;
		formDialogPendingDoctype.value = formDialogDoctype.value;
	}

	function commitPendingNav() {
		formDialogDissolving.value = true;
		formDialogDissolveOpacity.value = 1;

		const start = performance.now();
		const duration = 300;

		function step(now) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			// ease-out quad
			formDialogDissolveOpacity.value = 1 - progress * progress;
			if (progress < 1) {
				requestAnimationFrame(step);
			} else {
				// Dissolve complete — swap slots
				formDialogSlot.value = 1 - formDialogSlot.value;
				formDialogDocName.value = formDialogPendingDocName.value;
				formDialogDefinition.value = formDialogPendingDefinition.value;
				formDialogDoctype.value = formDialogPendingDoctype.value;
				formDialogPendingDocName.value = null;
				formDialogPendingDefinition.value = null;
				formDialogPendingDoctype.value = null;
				formDialogDissolveOpacity.value = 1;
				formDialogDissolving.value = false;
			}
		}

		requestAnimationFrame(step);
	}

	function onFormDialogNavPrev() {
		if (!formDialogNavInfo.value.canPrev) return;
		preparePendingNav("prev");
		setTimeout(commitPendingNav, 300);
	}

	function onFormDialogNavNext() {
		if (!formDialogNavInfo.value.canNext) return;
		preparePendingNav("next");
		setTimeout(commitPendingNav, 300);
	}

	/** Reload the open panel whose doctype matches the current form dialog (e.g. after WC publish). */
	function reloadPanelForFormDialogDoctype() {
		const doctype = formDialogDoctype.value;
		if (!doctype) return;
		const panel = openPanels.find((x) => x.doctype === doctype);
		if (panel && panel._reload) {
			panel._reload();
		}
	}

	return {
		showFormDialog,
		formDialogDocName,
		formDialogDefinition,
		formDialogDoctype,
		formDialogDefinitionSource,
		formDialogRequiredFields,
		formDialogSourcePanelId,
		formDialogNavInfo,
		formDialogNavLabel,
		onFormDialogNavPrev,
		onFormDialogNavNext,
		openFormDialogFromPanelRow,
		openFormDialogForNewRecord,
		openFormDialogStandalone,
		onFormDialogClose,
		onFormDialogSaved,
		reloadPanelForFormDialogDoctype,
		// Dual-slot
		formDialogSlot,
		formDialogPendingDocName,
		formDialogPendingDefinition,
		formDialogPendingDoctype,
		formDialogDissolving,
		formDialogDissolveOpacity,
		wpReadbackReloadTick,
	};
}
