import { ref } from "vue";
import { useFormDialogRecordNav, panelRowArray } from "./useFormDialogRecordNav.js";

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

	// Dual-slot state for dissolve transitions
	const formDialogSlot = ref(0);
	const formDialogPendingDocName = ref(null);
	const formDialogPendingDefinition = ref(null);
	const formDialogPendingDoctype = ref(null);
	const formDialogDissolving = ref(false);
	const formDialogDissolveOpacity = ref(1);

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
		showFormDialog.value = true;
		return true;
	}

	function onFormDialogClose() {
		showFormDialog.value = false;
		formDialogDocName.value = null;
		formDialogSourcePanelId.value = null;
	}

	function onFormDialogSaved() {
		const doctype = formDialogDoctype.value;
		showFormDialog.value = false;
		formDialogDocName.value = null;
		formDialogSourcePanelId.value = null;
		const panel = openPanels.find((x) => x.doctype === doctype);
		if (panel && panel._reload) {
			panel._reload();
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

	return {
		showFormDialog,
		formDialogDocName,
		formDialogDefinition,
		formDialogDoctype,
		formDialogSourcePanelId,
		formDialogNavInfo,
		formDialogNavLabel,
		onFormDialogNavPrev,
		onFormDialogNavNext,
		openFormDialogFromPanelRow,
		onFormDialogClose,
		onFormDialogSaved,
		// Dual-slot
		formDialogSlot,
		formDialogPendingDocName,
		formDialogPendingDefinition,
		formDialogPendingDoctype,
		formDialogDissolving,
		formDialogDissolveOpacity,
	};
}
