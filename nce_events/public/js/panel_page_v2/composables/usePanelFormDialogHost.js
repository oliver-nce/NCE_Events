import { ref } from "vue";
import { useFormDialogRecordNav, panelRowArray } from "./useFormDialogRecordNav.js";
import { useWpReadbackRefresh } from "./useWpReadbackRefresh.js";

/**
 * Panel Page V2: form dialog state, row navigation, open from panel row, close/save + panel refresh.
 * Uses a dual-slot dissolve transition for flicker-free prev/next navigation.
 * Core dialog UI lives in PanelFormDialog.vue + usePanelFormDialog.
 * WP read-back UX (wait, poll, panel-row merge, dialog reload) lives in useWpReadbackRefresh.
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

	const { formDialogNavInfo, formDialogNavLabel } = useFormDialogRecordNav({
		openPanels,
		showFormDialog,
		sourcePanelId: formDialogSourcePanelId,
		docName: formDialogDocName,
	});

	/** WP read-back: reactive tick watched by PanelFormDialog to run form.load(). */
	const { reloadTick: wpReadbackReloadTick, runIfEnabled: runWpReadback } =
		useWpReadbackRefresh();

	// ── Open helpers ──────────────────────────────────────────────────────────

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
		_resetPendingSlot();
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
		_resetPendingSlot();
		formDialogDefinition.value = formDialog;
		formDialogDoctype.value = doctype;
		formDialogDocName.value = docName;
		formDialogSourcePanelId.value = null;
		formDialogDefinitionSource.value = definitionSource || "form_dialog";
		formDialogRequiredFields.value = Array.isArray(requiredFields) ? requiredFields.slice() : [];
		showFormDialog.value = true;
		return true;
	}

	// ── Close ────────────────────────────────────────────────────────────────

	function onFormDialogClose() {
		showFormDialog.value = false;
		formDialogRequiredFields.value = [];
		formDialogDocName.value = null;
		formDialogDefinition.value = null;
		formDialogDoctype.value = null;
		formDialogSourcePanelId.value = null;
		formDialogDefinitionSource.value = "form_dialog";
		_resetPendingSlot();
	}

	// ── Save ─────────────────────────────────────────────────────────────────

	async function onFormDialogSaved(savedDoc) {
		const doctype = formDialogDoctype.value;
		const oldRowName = formDialogDocName.value;
		const sourcePanelId = formDialogSourcePanelId.value;

		const panel =
			sourcePanelId != null
				? openPanels.find((x) => x.id === sourcePanelId && x.doctype === doctype)
				: openPanels.find((x) => x.doctype === doctype);

		const wpHandled = await runWpReadback({
			doctype,
			savedDoc,
			oldRowName,
			panel,
			setDialogDocName: (name) => {
				if (name != null) formDialogDocName.value = name;
			},
		});

		if (!wpHandled) {
			// Standard save: reload the panel and close the dialog.
			if (panel?._reload) panel._reload();
			_clearDialogRefs();
		}
		// WP path: dialog stays open; reloadTick triggered inside runWpReadback.
	}

	// ── Dual-slot dissolve navigation ─────────────────────────────────────────

	function _resetPendingSlot() {
		formDialogPendingDocName.value = null;
		formDialogPendingDefinition.value = null;
		formDialogPendingDoctype.value = null;
		formDialogDissolving.value = false;
		formDialogDissolveOpacity.value = 1;
		formDialogSlot.value = 0;
	}

	function _clearDialogRefs() {
		formDialogRequiredFields.value = [];
		formDialogDocName.value = null;
		formDialogDefinition.value = null;
		formDialogDoctype.value = null;
		formDialogSourcePanelId.value = null;
		formDialogDefinitionSource.value = "form_dialog";
		formDialogPendingDocName.value = null;
		formDialogPendingDefinition.value = null;
		formDialogPendingDoctype.value = null;
		formDialogDissolving.value = false;
		formDialogDissolveOpacity.value = 1;
		showFormDialog.value = false;
	}

	function _getPanelForNav() {
		return openPanels.find((x) => x.id === formDialogSourcePanelId.value);
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
			formDialogDissolveOpacity.value = 1 - progress * progress; // ease-out quad
			if (progress < 1) {
				requestAnimationFrame(step);
			} else {
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
		if (panel?._reload) panel._reload();
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
		// WP read-back: watched by PanelFormDialog via :reload-tick prop
		wpReadbackReloadTick,
	};
}
