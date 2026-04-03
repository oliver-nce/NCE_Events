import { ref } from "vue";
import { useFormDialogRecordNav } from "./useFormDialogRecordNav.js";

/**
 * Panel Page V2: form dialog state, row navigation, open from panel row, close/save + panel refresh.
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

	const {
		formDialogNavInfo,
		formDialogNavLabel,
		onFormDialogNavPrev,
		onFormDialogNavNext,
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
	};
}
