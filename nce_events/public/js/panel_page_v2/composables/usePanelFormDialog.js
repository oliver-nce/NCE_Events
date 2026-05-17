import { ref, reactive, computed, unref, watch } from "vue";
import { snapshotForCompare } from "../utils/formDialogSnapshot.js";
import { createHandleFetchFrom } from "./formDialogFetchFrom.js";
import {
	validateFrozenForm,
	validatePanelRequiredFields,
	isFieldVisible as isFieldVisibleRule,
	isFieldMandatory as isFieldMandatoryRule,
	isFieldReadOnly as isFieldReadOnlyRule,
} from "./frozenFormValidate.js";
import { saveFrozenFormDocument } from "./frozenFormSave.js";
import { createFrozenFormLoad } from "./useFrozenFormLoad.js";
import { useFormClientScript } from "./useFormClientScript.js";

/**
 * Composable for managing a Panel Form Dialog.
 *
 * @param {import('vue').Ref<string>|string} options.definitionName
 * @param {import('vue').Ref<string>|string} options.doctype
 * @param {import('vue').Ref<string|null>|string|null} options.docName
 * @param {import('vue').Ref<string[]>|import('vue').ComputedRef<string[]>|undefined} options.requiredFields — Page Panel root fieldnames
 * @param {import('vue').Ref<string>|string|undefined} options.loadMode — `'full'` | `'find-shell'`
 */
export function usePanelFormDialog({
	definitionName,
	doctype,
	docName,
	requiredFields,
	definitionSource,
	loadMode,
}) {
	const panelRequiredFields = requiredFields;
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

	/** Field display overrides written by captured client scripts via set_df_property. */
	const scriptFieldOverrides = reactive({});

	const handleFetchFrom = createHandleFetchFrom(allFields, formData);

	const { load, resetWhenClosed } = createFrozenFormLoad({
		loadMode,
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
		definitionSource,
	});

	const { runOnLoad, runOnChange } = useFormClientScript({
		definition,
		allFields,
		formData,
		scriptFieldOverrides,
	});

	// Run captured client scripts once after each load completes.
	watch(loading, (isLoading) => {
		if (!isLoading && definition.value) {
			runOnLoad();
		}
	});

	const isNew = computed(() => !unref(docName));
	const dialogTitle = computed(() => {
		const dt = unref(doctype);
		const dn = unref(docName);
		const lm = loadMode ? unref(loadMode) : "full";
		if (lm === "find-shell" && !dn) {
			return `Find ${dt}`;
		}
		if (!dn) return `New ${dt}`;
		return `Edit ${dt}: ${dn}`;
	});
	const dialogSize = computed(() => definition.value?.dialog_size || "xl");

	const isDirty = computed(() => {
		if (loading.value) return false;
		return snapshotForCompare(formData) !== snapshotForCompare(originalData.value);
	});

	function validateForWooPublish() {
		return validatePanelRequiredFields(
			allFields.value,
			formData,
			panelRequiredFields ? unref(panelRequiredFields) : [],
		);
	}

	function validate() {
		const base = validateFrozenForm(allFields.value, formData);
		const extra = validatePanelRequiredFields(
			allFields.value,
			formData,
			panelRequiredFields ? unref(panelRequiredFields) : [],
		);
		const seen = new Set(base.map((e) => e.fieldname));
		const out = base.slice();
		for (const e of extra) {
			if (!seen.has(e.fieldname)) {
				seen.add(e.fieldname);
				out.push(e);
			}
		}
		return out;
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
		const ov = scriptFieldOverrides[field.fieldname];
		if (ov && ov.hidden !== undefined) return !ov.hidden;
		return isFieldVisibleRule(field, formData);
	}

	function isFieldMandatory(field) {
		const ov = scriptFieldOverrides[field.fieldname];
		if (ov && ov.reqd !== undefined) return !!ov.reqd;
		if (isFieldMandatoryRule(field, formData)) {
			return true;
		}
		const keys = panelRequiredFields ? unref(panelRequiredFields) : [];
		if (!Array.isArray(keys) || !keys.length) {
			return false;
		}
		const fn = field.fieldname;
		return keys.some((k) => String(k || "").trim() === fn && !String(k).includes("."));
	}

	function isFieldReadOnly(field) {
		const ov = scriptFieldOverrides[field.fieldname];
		if (ov && ov.read_only !== undefined) return !!ov.read_only;
		return isFieldReadOnlyRule(field, formData);
	}

	/** Call after any field value changes to run captured client scripts for that field. */
	function onFieldChange(fieldname) {
		runOnChange(fieldname);
	}

	return {
		definition,
		tabs,
		allFields,
		formData,
		originalData,
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
		validateForWooPublish,
		save,
		revert,
		isFieldVisible,
		isFieldMandatory,
		isFieldReadOnly,
		onFieldChange,
		handleFetchFrom,
		loadDebugLog,
	};
}
