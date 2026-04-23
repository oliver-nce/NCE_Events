import { unref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

export function extractServerMessage(err) {
	try {
		const msgs = JSON.parse(err?._server_messages || "[]");
		if (msgs.length) {
			return msgs.map((m) => (typeof m === "object" ? m.message : m)).join(" ");
		}
	} catch (_) {}
	return err?.message || "Failed to save";
}

/**
 * Save via save_form_dialog_document; updates formData + originalData on success.
 *
 * @param {object} opts
 * @param {object} opts.formData — reactive
 * @param {import('vue').Ref<object>} opts.originalData
 * @param {import('vue').Ref} opts.definition
 * @param {import('vue').Ref<string>|string} opts.doctype
 * @param {import('vue').Ref<boolean>} opts.saving
 * @param {import('vue').Ref<string|null>} opts.validationError
 * @param {() => Array} opts.runValidate — same contract as validate() in usePanelFormDialog
 */
export async function saveFrozenFormDocument({
	formData,
	originalData,
	definition,
	doctype,
	saving,
	validationError,
	runValidate,
}) {
	validationError.value = null;

	const errors = runValidate();
	if (errors.length) {
		validationError.value = errors.map((e) => e.message).join(", ");
		throw new Error(validationError.value);
	}

	saving.value = true;
	try {
		const wb = Number(definition.value?.writeback_on_submit) === 1;
		const result = await frappeCall("nce_events.api.form_dialog_api.save_form_dialog_document", {
			doc: { doctype: unref(doctype), ...formData },
			writeback_fetches: wb ? 1 : 0,
		});
		Object.assign(formData, result);
		originalData.value = JSON.parse(JSON.stringify(formData));
		return result;
	} catch (err) {
		validationError.value = extractServerMessage(err);
		throw err;
	} finally {
		saving.value = false;
	}
}
