import { ref, reactive, computed, unref } from "vue";
import { snapshotForCompare } from "../utils/formDialogSnapshot.js";
import { createHandleFetchFrom } from "./formDialogFetchFrom.js";
import {
	validateFrozenForm,
	isFieldVisible as isFieldVisibleRule,
	isFieldMandatory as isFieldMandatoryRule,
	isFieldReadOnly as isFieldReadOnlyRule,
} from "./frozenFormValidate.js";
import { saveFrozenFormDocument } from "./frozenFormSave.js";
import { createFrozenFormLoad } from "./useFrozenFormLoad.js";

/**
 * Composable for managing a Panel Form Dialog.
 *
 * @param {import('vue').Ref<string>|string} options.definitionName
 * @param {import('vue').Ref<string>|string} options.doctype
 * @param {import('vue').Ref<string|null>|string|null} options.docName
 */
export function usePanelFormDialog({ definitionName, doctype, docName }) {
	const definition = ref(null);
	const tabs = ref([]);
	const allFields = ref([]);
	const formData = reactive({});
	const originalData = ref({});
	const loading = ref(false);
	const saving = ref(false);
	const error = ref(null);
	const validationError = ref(null);
	const buttons = ref([]);
	/** True while load() is pushing doc defaults / get / fetch_from into formData — mutes Frappe control change() echo. */
	const syncingFromLoad = ref(false);
	/** When localStorage nce_fd_load_debug=1, each load() appends step rows for the debug overlay. */
	const loadDebugLog = ref([]);

	const handleFetchFrom = createHandleFetchFrom(allFields, formData);

	const { load, resetWhenClosed } = createFrozenFormLoad({
		definitionName,
		doctype,
		docName,
		definition,
		tabs,
		allFields,
		formData,
		originalData,
		loading,
		error,
		validationError,
		buttons,
		handleFetchFrom,
		syncingFromLoad,
		loadDebugLog,
	});

	const isNew = computed(() => !unref(docName));
	const dialogTitle = computed(() => {
		const dt = unref(doctype);
		const dn = unref(docName);
		if (!dn) return `New ${dt}`;
		return `Edit ${dt}: ${dn}`;
	});
	const dialogSize = computed(() => definition.value?.dialog_size || "xl");

	const isDirty = computed(() => {
		if (loading.value) return false;
		return snapshotForCompare(formData) !== snapshotForCompare(originalData.value);
	});

	function validate() {
		return validateFrozenForm(allFields.value, formData);
	}

	async function save() {
		return saveFrozenFormDocument({
			formData,
			originalData,
			definition,
			doctype,
			saving,
			validationError,
			runValidate: validate,
		});
	}

	function revert() {
		const orig = originalData.value;
		for (const key of Object.keys(formData)) {
			formData[key] = orig[key] !== undefined ? orig[key] : null;
		}
	}

	function isFieldVisible(field) {
		return isFieldVisibleRule(field, formData);
	}

	function isFieldMandatory(field) {
		return isFieldMandatoryRule(field, formData);
	}

	function isFieldReadOnly(field) {
		return isFieldReadOnlyRule(field, formData);
	}

	return {
		definition,
		tabs,
		allFields,
		formData,
		isDirty,
		syncingFromLoad,
		loading,
		saving,
		error,
		validationError,
		buttons,
		isNew,
		dialogTitle,
		dialogSize,
		resetWhenClosed,
		load,
		validate,
		save,
		revert,
		isFieldVisible,
		isFieldMandatory,
		isFieldReadOnly,
		handleFetchFrom,
		loadDebugLog,
	};
}
