import { ref, reactive, computed, toRaw, unref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";
import { evaluateExpression, isLayoutField } from "../utils/frappeFieldExpr.js";
import { parseLayout } from "../utils/parseLayout.js";

/** Stable JSON for dirty-checking reactive form state vs loaded snapshot. */
function snapshotForCompare(data) {
	const raw = toRaw(data) || {};
	const sorted = {};
	for (const k of Object.keys(raw).sort()) {
		let v = raw[k];
		if (v === undefined) v = null;
		sorted[k] = v;
	}
	return JSON.stringify(sorted);
}

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
	let loadSeq = 0;

	/**
	 * When the dialog closes: invalidate in-flight loads (so their `finally` does not own `loading`)
	 * and clear tabs/form state so the next open is never “ghost form + stuck overlay”.
	 */
	function resetWhenClosed() {
		loadSeq += 1;
		loading.value = false;
		error.value = null;
		validationError.value = null;
		tabs.value = [];
		allFields.value = [];
		definition.value = null;
		buttons.value = [];
		for (const key of Object.keys(formData)) {
			delete formData[key];
		}
		originalData.value = {};
	}

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

	/**
	 * Load the frozen definition + document data.
	 * Call this when the dialog opens.
	 */
	async function load() {
		const mySeq = ++loadSeq;
		loading.value = true;
		error.value = null;
		validationError.value = null;

		const defnName = unref(definitionName);
		const dt = unref(doctype);
		const dn = unref(docName);

		try {
			// 1. Load frozen definition
			const defn = await frappeCall(
				"nce_events.api.form_dialog_api.get_form_dialog_definition",
				{ name: defnName },
			);
			if (mySeq !== loadSeq) return;

			definition.value = defn;
			buttons.value = defn.buttons || [];

			// 2. Parse the frozen fields into layout tree
			const fields = defn.frozen_meta?.fields || [];
			allFields.value = fields;
			tabs.value = parseLayout(fields);

			// 3. Initialize formData with defaults from frozen schema
			for (const key of Object.keys(formData)) {
				delete formData[key];
			}
			for (const field of fields) {
				if (field.fieldname && !isLayoutField(field.fieldtype)) {
					formData[field.fieldname] = field.default || null;
				}
			}

			// 4. If editing, load the live document data
			if (dn) {
				const doc = await frappeCall("frappe.client.get", {
					doctype: dt,
					name: dn,
				});
				if (mySeq !== loadSeq) return;
				Object.assign(formData, doc);
			}

			// 5. Auto-resolve fetch_from fields — fetch live values from linked records
			const linkFields = fields.filter(
				(f) => f.fieldtype === "Link" && f.options && formData[f.fieldname],
			);
			await Promise.all(
				linkFields.map((lf) => handleFetchFrom(lf.fieldname, formData[lf.fieldname])),
			);
			if (mySeq !== loadSeq) return;

			originalData.value = JSON.parse(JSON.stringify(formData));
		} catch (err) {
			if (mySeq !== loadSeq) return;
			error.value = err?.message || err?.toString() || "Failed to load form";
		} finally {
			if (mySeq === loadSeq) {
				loading.value = false;
			}
		}
	}

	/**
	 * Validate mandatory fields.
	 * Returns array of error objects. Empty array = valid.
	 */
	function validate() {
		const errors = [];

		for (const field of allFields.value) {
			if (isLayoutField(field.fieldtype)) continue;
			if (field.hidden) continue;

			// Skip fields hidden by depends_on
			if (field.depends_on && !evaluateExpression(field.depends_on, formData)) continue;

			const isMandatory =
				field.reqd ||
				(field.mandatory_depends_on &&
					evaluateExpression(field.mandatory_depends_on, formData));

			if (isMandatory) {
				const value = formData[field.fieldname];
				if (value === null || value === undefined || value === "" || value === 0) {
					errors.push({
						fieldname: field.fieldname,
						label: field.label,
						message: `${field.label} is required`,
					});
				}
			}
		}

		return errors;
	}

	/**
	 * Save or insert the document, then return the saved doc.
	 * Throws on validation or server error.
	 */
	async function save() {
		validationError.value = null;

		const errors = validate();
		if (errors.length) {
			validationError.value = errors.map((e) => e.message).join(", ");
			throw new Error(validationError.value);
		}

		saving.value = true;
		try {
			// Always use server save_form_dialog_document for the panel dialog (WP Tables,
			// one code path). writeback_fetches only when Form Dialog has the checkbox set;
			// otherwise frappe.client.save never pushed fetch_from values to linked docs.
			const wb = Number(definition.value?.writeback_on_submit) === 1;
			const result = await frappeCall("nce_events.api.form_dialog_api.save_form_dialog_document", {
				doc: { doctype: unref(doctype), ...formData },
				writeback_fetches: wb ? 1 : 0,
			});
			Object.assign(formData, result);
			originalData.value = JSON.parse(JSON.stringify(formData));
			return result;
		} catch (err) {
			const msg = err?.message || err?._server_messages || "Failed to save";
			validationError.value = msg;
			throw err;
		} finally {
			saving.value = false;
		}
	}

	/**
	 * Revert formData to original loaded values.
	 */
	function revert() {
		const orig = originalData.value;
		for (const key of Object.keys(formData)) {
			formData[key] = orig[key] !== undefined ? orig[key] : null;
		}
	}

	/**
	 * Check if a field is visible based on depends_on.
	 */
	function isFieldVisible(field) {
		if (field.hidden) return false;
		if (!field.depends_on) return true;
		return evaluateExpression(field.depends_on, formData);
	}

	/**
	 * Check if a field is mandatory (static or conditional).
	 */
	function isFieldMandatory(field) {
		if (field.mandatory_depends_on) {
			return evaluateExpression(field.mandatory_depends_on, formData);
		}
		return !!field.reqd;
	}

	/**
	 * Check if a field is read-only (static or conditional).
	 */
	function isFieldReadOnly(field) {
		if (field.read_only_depends_on) {
			return evaluateExpression(field.read_only_depends_on, formData);
		}
		return !!field.read_only;
	}

	/**
	 * Handle fetch_from when a Link field value changes.
	 * Looks at all fields with fetch_from referencing this Link field,
	 * then fetches values from the linked document.
	 *
	 * @param {string} linkFieldname - The fieldname of the Link that changed
	 * @param {string} linkValue - The new value (document name) of the Link field
	 */
	async function handleFetchFrom(linkFieldname, linkValue) {
		if (!linkValue) return;

		// Find all fields that have fetch_from pointing to this link field
		const fetchTargets = [];
		for (const field of allFields.value) {
			if (!field.fetch_from) continue;
			const parts = field.fetch_from.split(".");
			if (parts.length !== 2) continue;
			if (parts[0] !== linkFieldname) continue;

			// Check fetch_if_empty: skip if field already has a value
			if (field.fetch_if_empty && formData[field.fieldname]) continue;

			fetchTargets.push({
				fieldname: field.fieldname,
				remoteField: parts[1],
				fetchIfEmpty: !!field.fetch_if_empty,
			});
		}

		if (!fetchTargets.length) return;

		// Find the Link field's target DocType
		const linkField = allFields.value.find((f) => f.fieldname === linkFieldname);
		if (!linkField || !linkField.options) return;

		const remoteDoctype = linkField.options;
		const remoteFields = fetchTargets.map((t) => t.remoteField);

		try {
			const values = await frappeCall("frappe.client.get_value", {
				doctype: remoteDoctype,
				fieldname: remoteFields,
				filters: { name: linkValue },
			});

			if (values) {
				for (const target of fetchTargets) {
					if (values[target.remoteField] !== undefined) {
						if (target.fetchIfEmpty && formData[target.fieldname]) continue;
						formData[target.fieldname] = values[target.remoteField];
					}
				}
			}
		} catch {
			// Silently fail — fetch_from is a convenience, not critical
		}
	}

	return {
		definition,
		tabs,
		allFields,
		formData,
		isDirty,
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
	};
}
