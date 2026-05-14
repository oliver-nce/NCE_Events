import { unref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

export function extractServerMessage(err) {
	try {
		const msgs = JSON.parse(err?._server_messages || "[]");
		if (msgs.length) {
			return msgs.map((m) => (typeof m === "object" ? m.message : m)).join(" ");
		}
	} catch {
		/* fall through to err.message */
	}
	return err?.message || "Failed to save";
}

/**
 * Frappe rejects save when ``modified`` no longer matches the DB (another write
 * landed — e.g. NCE_Sync read-back upsert after the panel loaded the doc).
 */
export function isDocModifiedConcurrencyError(err) {
	const m = String(extractServerMessage(err)).toLowerCase();
	return m.includes("document has been modified after you have opened it");
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
 * @param {() => Promise<void>} [opts.onStaleDocRetry] — e.g. form.load(); one retry after concurrency error
 */
export async function saveFrozenFormDocument({
	formData,
	originalData,
	definition,
	doctype,
	saving,
	validationError,
	runValidate,
	onStaleDocRetry = null,
}) {
	validationError.value = null;

	function runValidateAndThrow() {
		const errors = runValidate();
		if (errors.length) {
			validationError.value = errors.map((e) => e.message).join(", ");
			throw new Error(validationError.value);
		}
	}

	runValidateAndThrow();

	saving.value = true;
	try {
		const wb = Number(definition.value?.writeback_on_submit) === 1;
		const callSave = () =>
			frappeCall("nce_events.api.form_dialog.save.save_form_dialog_document", {
				doc: { doctype: unref(doctype), ...formData },
				writeback_fetches: wb ? 1 : 0,
			});

		let result;
		try {
			result = await callSave();
		} catch (firstErr) {
			if (
				onStaleDocRetry &&
				isDocModifiedConcurrencyError(firstErr)
			) {
				try {
					await onStaleDocRetry();
				} catch (reloadErr) {
					validationError.value = extractServerMessage(reloadErr);
					throw reloadErr;
				}
				runValidateAndThrow();
				validationError.value = null;
				result = await callSave();
			} else {
				throw firstErr;
			}
		}

		Object.assign(formData, result);
		originalData.value = JSON.parse(JSON.stringify(formData));
		return result;
	} catch (err) {
		if (!validationError.value) {
			validationError.value = extractServerMessage(err);
		}
		throw err;
	} finally {
		saving.value = false;
	}
}
