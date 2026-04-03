import { unref, nextTick } from "vue";
import { frappeCall } from "../utils/frappeCall.js";
import { isLayoutField } from "../utils/frappeFieldExpr.js";
import { parseLayout } from "../utils/parseLayout.js";

/**
 * Load sequence + reset + load for frozen Panel Form Dialog meta/doc.
 *
 * @param {object} ctx — refs/reactive from usePanelFormDialog
 */
export function createFrozenFormLoad(ctx) {
	const {
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
	} = ctx;

	let loadSeq = 0;

	function resetWhenClosed() {
		loadSeq += 1;
		syncingFromLoad.value = false;
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

	async function load() {
		const mySeq = ++loadSeq;
		loading.value = true;
		error.value = null;
		validationError.value = null;
		syncingFromLoad.value = false;

		const defnName = unref(definitionName);
		const dt = unref(doctype);
		const dn = unref(docName);

		try {
			const defn = await frappeCall(
				"nce_events.api.form_dialog_api.get_form_dialog_definition",
				{ name: defnName },
			);
			if (mySeq !== loadSeq) return;

			definition.value = defn;
			buttons.value = defn.buttons || [];

			const fields = defn.frozen_meta?.fields || [];
			allFields.value = fields;
			tabs.value = parseLayout(fields);

			syncingFromLoad.value = true;

			for (const key of Object.keys(formData)) {
				delete formData[key];
			}
			for (const field of fields) {
				if (field.fieldname && !isLayoutField(field.fieldtype)) {
					formData[field.fieldname] = field.default || null;
				}
			}

			if (dn) {
				const doc = await frappeCall("frappe.client.get", {
					doctype: dt,
					name: dn,
				});
				if (mySeq !== loadSeq) return;
				Object.assign(formData, doc);
			}

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
			// After the loading gate hides, Frappe controls mount and watchers call set_value;
			// keep syncing true through a couple ticks so df.change does not echo into Vue.
			await nextTick();
			await nextTick();
			syncingFromLoad.value = false;
		}
	}

	return { load, resetWhenClosed };
}
