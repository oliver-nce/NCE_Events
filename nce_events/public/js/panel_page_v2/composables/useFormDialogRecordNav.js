import { computed, unref } from "vue";

/** Live row array from a panel (`_panelRows` ref may unwrap on reactive panel). */
export function panelRowArray(p) {
	if (!p) return [];
	const r = p._panelRows;
	if (r == null) return Array.isArray(p.rows) ? p.rows : [];
	if (Array.isArray(r)) return r;
	if (typeof r === "object" && Array.isArray(r.value)) return r.value;
	return [];
}

/**
 * Prev/next over the visible row list of the panel that opened the form dialog.
 * Omit or clear sourcePanelId when only a single record is in play — nav chrome stays disabled.
 *
 * @param {object} options
 * @param {import('vue').Reactive<Array>} options.openPanels
 * @param {import('vue').Ref<boolean>} options.showFormDialog
 * @param {import('vue').Ref<number|null>} options.sourcePanelId
 * @param {import('vue').Ref<string|null>} options.docName
 * @param {import('vue').Ref<null|string[]>} [options.findMatchNames]
 */
export function useFormDialogRecordNav({
	openPanels,
	showFormDialog,
	sourcePanelId,
	docName,
	findMatchNames,
}) {
	function effectiveList(fullList) {
		const names = unref(findMatchNames);
		if (!Array.isArray(names)) return fullList;
		const set = new Set(names.map(String));
		return fullList.filter((row) => row && set.has(String(row.name)));
	}

	const formDialogNavInfo = computed(() => {
		if (!unref(showFormDialog) || unref(sourcePanelId) == null || !unref(docName)) {
			return { canPrev: false, canNext: false, index: -1, total: 0 };
		}
		const p = openPanels.find((x) => x.id === unref(sourcePanelId));
		if (!p) return { canPrev: false, canNext: false, index: -1, total: 0 };
		const list = effectiveList(panelRowArray(p));
		const idx = list.findIndex((row) => row && row.name === unref(docName));
		const total = list.length;
		return {
			canPrev: idx > 0,
			canNext: idx >= 0 && idx < total - 1,
			index: idx,
			total,
		};
	});

	const formDialogNavLabel = computed(() => {
		const { index, total } = formDialogNavInfo.value;
		const names = unref(findMatchNames);
		const suffix = Array.isArray(names) ? " found" : "";
		if (total >= 1 && index >= 0) {
			return `${index + 1} / ${total}${suffix}`;
		}
		return "";
	});

	function onFormDialogNavPrev() {
		const p = openPanels.find((x) => x.id === unref(sourcePanelId));
		if (!p) return;
		const list = effectiveList(panelRowArray(p));
		const idx = list.findIndex((row) => row && row.name === unref(docName));
		if (idx <= 0) return;
		docName.value = list[idx - 1].name;
	}

	function onFormDialogNavNext() {
		const p = openPanels.find((x) => x.id === unref(sourcePanelId));
		if (!p) return;
		const list = effectiveList(panelRowArray(p));
		const idx = list.findIndex((row) => row && row.name === unref(docName));
		if (idx < 0 || idx >= list.length - 1) return;
		docName.value = list[idx + 1].name;
	}

	return {
		formDialogNavInfo,
		formDialogNavLabel,
		onFormDialogNavPrev,
		onFormDialogNavNext,
	};
}
