import { ref, computed } from "vue";
import { useFormDialogRecordNav, panelRowArray } from "./useFormDialogRecordNav.js";
import { mergeFreshDocIntoPanel } from "./wpReadbackFlow.js";

/**
 * Panel Page V2: form dialog state, row navigation, open from panel row, close/save + panel refresh.
 * Uses a dual-slot dissolve transition for flicker-free prev/next navigation.
 * Core dialog UI lives in PanelFormDialog.vue + usePanelFormDialog.
 * WP read-back wait/Show changes/Close UX lives in PanelFormDialog; host only merges panel rows on @readback-merged.
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
	/** Find/search: `null` = inactive; array = active match set (may be empty). */
	const formDialogFindMatchNames = ref(null);
	const formDialogFindActive = computed(() => formDialogFindMatchNames.value !== null);

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
		findMatchNames: formDialogFindMatchNames,
	});

	function _effectiveNavList() {
		const p = _getPanelForNav();
		if (!p) return [];
		const full = panelRowArray(p);
		const names = formDialogFindMatchNames.value;
		if (!Array.isArray(names)) return full;
		const set = new Set(names.map(String));
		return full.filter((row) => row && set.has(String(row.name)));
	}

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
		formDialogFindMatchNames.value = null;
		_resetPendingSlot();
	}

	function onFormDialogFind(term) {
		if (!term || !String(term).trim()) {
			formDialogFindMatchNames.value = null;
			return;
		}
		const definition = formDialogDefinition.value;
		if (!definition) return;
		frappe.call({
			method: "nce_events.api.form_dialog.search.get_form_dialog_search_matches",
			args: { definition, term: String(term).trim() },
			callback(r) {
				const names = Array.isArray(r?.message?.names) ? r.message.names : [];
				formDialogFindMatchNames.value = names;
				const cur = formDialogDocName.value;
				if (!names.length || cur == null || String(cur).trim() === "") return;
				const curStr = String(cur);
				if (names.map(String).includes(curStr)) return;
				const p = openPanels.find((x) => x.id === formDialogSourcePanelId.value);
				const panelSet = new Set(
					(p ? panelRowArray(p) : []).map((row) => String(row.name)),
				);
				const pick =
					names.find((n) => panelSet.has(String(n))) ?? names[0];
				formDialogDocName.value = pick;
			},
		});
	}

	function onFormDialogFindClear() {
		formDialogFindMatchNames.value = null;
	}

	// ── Save (standard path only; WP read-back path never emits `saved`) ─────

	function onFormDialogSaved() {
		const doctype = formDialogDoctype.value;
		const sourcePanelId = formDialogSourcePanelId.value;
		const panel =
			sourcePanelId != null
				? openPanels.find((x) => x.id === sourcePanelId && x.doctype === doctype)
				: openPanels.find((x) => x.doctype === doctype);
		if (panel?._reload) panel._reload();
		_clearDialogRefs();
	}

	/**
	 * After WP read-back wait in the dialog: patch the floated panel row + PK if renamed.
	 * @param {{ fresh: object|null, oldRowName: string|null, savedName: string|null }} payload
	 */
	function onReadbackMerged({ fresh, oldRowName, savedName }) {
		const doctype = formDialogDoctype.value;
		const sourcePanelId = formDialogSourcePanelId.value;
		const panel =
			sourcePanelId != null
				? openPanels.find((x) => x.id === sourcePanelId && x.doctype === doctype)
				: openPanels.find((x) => x.doctype === doctype);
		if (panel && fresh) {
			mergeFreshDocIntoPanel(panel, fresh, oldRowName, savedName);
		}
		if (fresh?.name != null && String(fresh.name).trim() !== "") {
			formDialogDocName.value = String(fresh.name).trim();
		}
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
		formDialogFindMatchNames.value = null;
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
		const list = _effectiveNavList();
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
			formDialogDissolveOpacity.value = 1 - progress * progress;
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
		formDialogFindMatchNames,
		formDialogFindActive,
		onFormDialogFind,
		onFormDialogFindClear,
		onFormDialogNavPrev,
		onFormDialogNavNext,
		openFormDialogFromPanelRow,
		openFormDialogForNewRecord,
		openFormDialogStandalone,
		onFormDialogClose,
		onFormDialogSaved,
		onReadbackMerged,
		reloadPanelForFormDialogDoctype,
		// Dual-slot
		formDialogSlot,
		formDialogPendingDocName,
		formDialogPendingDefinition,
		formDialogPendingDoctype,
		formDialogDissolving,
		formDialogDissolveOpacity,
	};
}
