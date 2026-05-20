import { ref, computed } from "vue";
import { useFormDialogRecordNav, panelRowArray } from "./useFormDialogRecordNav.js";
import { mergeFreshDocIntoPanel } from "./wpReadbackFlow.js";
import { matchFindCriterion } from "../utils/findCriterion.js";

/* -----------------------------------------------------------------------
 * ARCHIVED (next phase: delete).
 * The functions in this section drove the Form Dialog "find-shell" Find UX.
 * As of 2026-05-20 the Find action is handled by a separate Find Panel
 * (see components/FindPanel.vue, composables/useFindPanel.js).
 * Nothing in App.vue calls into these symbols anymore; they remain here
 * only for reference and should be removed once the Find Panel is proven.
 *
 * Affected symbols: _matchFindCriterion, openFormDialogForFind,
 * onFormDialogFindCriteria, onFormDialogFindCriteriaConstrain,
 * onFormDialogFindCancelCriteria, onFormDialogFindShowAll,
 * onFormDialogFindModify, onFormDialogFindConstrain,
 * formDialogFindMatchNames, formDialogFindChromePhase,
 * formDialogFindSeedCriteria, formDialogFindConstrainNames,
 * formDialogLastFindCriteria, formDialogFindSearchOnlyColumns.
 * -----------------------------------------------------------------------*/

/**
 * FileMaker-style criterion match against a single cell value.
 * @deprecated Use matchFindCriterion from utils/findCriterion.js
 */
function _matchFindCriterion(cellValue, term) {
	return matchFindCriterion(cellValue, term);
}

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
	/** `full` — normal doc load; `find-shell` — definition only, empty fields for criteria entry. */
	const formDialogDialogLoadMode = ref("full");
	/** Find UX: `none` | `criteria` | `post-find` */
	const formDialogFindChromePhase = ref("none");
	/** When entering criteria phase from Modify Find — field→value strings (may be empty object). */
	const formDialogFindSeedCriteria = ref(null);
	const formDialogLastFindCriteria = ref(null);
	/** Next Perform Find intersects with this name list (Constrain Found Set). */
	const formDialogFindConstrainNames = ref(null);
	/** Find/search: `null` = inactive; array = active match set (may be empty). */
	const formDialogFindMatchNames = ref(null);
	/** Search-only columns (fieldname + label + fieldtype) for the active Find panel. */
	const formDialogFindSearchOnlyColumns = ref([]);
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
		formDialogDialogLoadMode.value = "full";
		formDialogFindSeedCriteria.value = null;
		formDialogFindChromePhase.value =
			formDialogFindMatchNames.value != null ? "post-find" : "none";
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
		formDialogDialogLoadMode.value = "full";
		formDialogFindSeedCriteria.value = null;
		formDialogFindChromePhase.value =
			formDialogFindMatchNames.value != null ? "post-find" : "none";
		showFormDialog.value = true;
		return true;
	}

	/** Toolbar Find — empty criteria layout, same Form Dialog definition as the panel. */
	function openFormDialogForFind(panel) {
		if (!panel?.config?.form_dialog) return false;
		_resetPendingSlot();
		formDialogDefinition.value = panel.config.form_dialog;
		formDialogDoctype.value = panel.doctype;
		formDialogDocName.value = null;
		formDialogSourcePanelId.value = panel.id;
		formDialogDefinitionSource.value = "form_dialog";
		const rf = panel.config?.required_fields;
		formDialogRequiredFields.value = Array.isArray(rf) ? rf.slice() : [];
		formDialogFindMatchNames.value = null;
		formDialogLastFindCriteria.value = null;
		formDialogFindConstrainNames.value = null;
		formDialogFindSeedCriteria.value = null;
		// Capture all panel-known columns (visible + search-only) so the Find dialog
		// can render extra criteria inputs for fields not in the frozen Form Dialog layout.
		// Visible columns come from panel.columns; search-only from panel.config.search_only_columns.
		// Filter out _related_* and computed (_count_*) sentinel columns.
		const visibleCols = (Array.isArray(panel.columns) ? panel.columns : []).filter(
			(c) => c.fieldname && !c.fieldname.startsWith("_") && !c.is_related_link
		);
		const soColumns = Array.isArray(panel.config?.search_only_columns)
			? panel.config.search_only_columns
			: [];
		const visibleFns = new Set(visibleCols.map((c) => c.fieldname));
		formDialogFindSearchOnlyColumns.value = [
			...visibleCols,
			...soColumns.filter((c) => !visibleFns.has(c.fieldname)),
		];
		formDialogFindChromePhase.value = "criteria";
		formDialogDialogLoadMode.value = "find-shell";
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
		formDialogDialogLoadMode.value = "full";
		formDialogFindSeedCriteria.value = null;
		formDialogFindChromePhase.value =
			formDialogFindMatchNames.value != null ? "post-find" : "none";
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
		formDialogDialogLoadMode.value = "full";
		formDialogFindChromePhase.value = "none";
		formDialogFindSeedCriteria.value = null;
		formDialogLastFindCriteria.value = null;
		formDialogFindConstrainNames.value = null;
		_resetPendingSlot();
	}

	function onFormDialogFindCriteria(criteria) {
		const cmap =
			criteria && typeof criteria === "object" && !Array.isArray(criteria) ? criteria : {};
		const keys = Object.keys(cmap).filter((k) => String(cmap[k] ?? "").trim() !== "");
		if (!keys.length) {
			const msg =
				typeof window.__ === "function"
					? window.__("Enter at least one search criterion.")
					: "Enter at least one search criterion.";
			if (typeof frappe !== "undefined" && frappe.msgprint) frappe.msgprint(msg);
			return;
		}

		// Client-side search against the cached panel rows (_allRows).
		// openPanels is reactive([]), so Vue 3 auto-unwraps refs stored on it —
		// _allRows is already the plain array when accessed, NOT a ref.
		const sourcePanel = openPanels.find((x) => x.id === formDialogSourcePanelId.value);
		const allRows = sourcePanel?._allRows ?? [];

		let names = allRows
			.filter((row) => {
				for (const key of keys) {
					if (!_matchFindCriterion(row[key], cmap[key])) return false;
				}
				return true;
			})
			.map((row) => String(row.name));

		// Apply Constrain Found Set if active
		const constrain = formDialogFindConstrainNames.value;
		formDialogFindConstrainNames.value = null;
		if (Array.isArray(constrain) && constrain.length) {
			const constrainSet = new Set(constrain.map(String));
			names = names.filter((n) => constrainSet.has(n));
		}

		formDialogFindSeedCriteria.value = null;
		formDialogLastFindCriteria.value = { ...cmap };

		if (!names.length) {
			const msg =
				typeof window.__ === "function"
					? window.__("No records match your request.")
					: "No records match your request.";
			if (typeof frappe !== "undefined" && frappe.msgprint) frappe.msgprint(msg);
			return;
		}

		formDialogFindMatchNames.value = names;
		formDialogFindChromePhase.value = "post-find";
		formDialogDialogLoadMode.value = "full";

		// Navigate to the first match that is in the current panel view
		const p = openPanels.find((x) => x.id === formDialogSourcePanelId.value);
		const panelSet = new Set((p ? panelRowArray(p) : []).map((row) => String(row.name)));
		const cur = String(formDialogDocName.value ?? "").trim();
		if (!cur || !names.includes(cur)) {
			formDialogDocName.value = names.find((n) => panelSet.has(n)) ?? names[0];
		}
	}

	function onFormDialogFindClear() {
		formDialogFindMatchNames.value = null;
		formDialogFindChromePhase.value = "none";
		formDialogLastFindCriteria.value = null;
		formDialogFindSeedCriteria.value = null;
	}

	function onFormDialogFindShowAll() {
		onFormDialogFindClear();
	}

	function onFormDialogFindModify() {
		const last = formDialogLastFindCriteria.value;
		formDialogFindSeedCriteria.value =
			last && typeof last === "object" ? { ...last } : {};
		formDialogFindChromePhase.value = "criteria";
	}

	function onFormDialogFindConstrain() {
		const cur = formDialogFindMatchNames.value;
		formDialogFindConstrainNames.value = Array.isArray(cur) ? [...cur] : [];
		formDialogFindSeedCriteria.value = null;
		formDialogFindChromePhase.value = "criteria";
	}

	/**
	 * "Constrain Found Set" clicked while in criteria phase.
	 * Narrows the current found set by the entered criteria — equivalent to
	 * setting constrainNames then immediately performing the find.
	 */
	function onFormDialogFindCriteriaConstrain(criteria) {
		const cur = formDialogFindMatchNames.value;
		formDialogFindConstrainNames.value = Array.isArray(cur) ? [...cur] : [];
		onFormDialogFindCriteria(criteria);
	}

	function onFormDialogFindCancelCriteria() {
		onFormDialogClose();
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
		formDialogFindSearchOnlyColumns.value = [];
		formDialogDialogLoadMode.value = "full";
		formDialogFindChromePhase.value = "none";
		formDialogFindSeedCriteria.value = null;
		formDialogLastFindCriteria.value = null;
		formDialogFindConstrainNames.value = null;
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
		formDialogDialogLoadMode,
		formDialogFindChromePhase,
		formDialogFindSeedCriteria,
		formDialogFindSearchOnlyColumns,
		onFormDialogFindCriteria,
		onFormDialogFindCriteriaConstrain,
		onFormDialogFindClear,
		onFormDialogFindShowAll,
		onFormDialogFindModify,
		onFormDialogFindConstrain,
		onFormDialogFindCancelCriteria,
		onFormDialogNavPrev,
		onFormDialogNavNext,
		openFormDialogFromPanelRow,
		openFormDialogForNewRecord,
		openFormDialogForFind,
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
