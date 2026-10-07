// Factory for Link field fetch_from handlers pulling remote DocField values into form dialog data.
//
// code-index:begin
// {
//  "purpose": "Factory for Link field fetch_from handlers pulling remote DocField values into form dialog data.",
//  "read_when": "When changing fetch_from link pull behavior or fetch_if_empty skipping in form dialogs.",
//  "gotchas": [
//   "fetch_from failures are silently ignored because fetch is a convenience not critical."
//  ],
//  "keywords": ["fetch_from", "createHandleFetchFrom", "link field", "frappeCall", "get_value", "fetch_if_empty", "formData"],
//  "format": 1
// }
// code-index:end

import { frappeCall } from "../utils/frappeCall.js";

/**
 * @param {import('vue').Ref<Array>} allFields
 * @param {object} formData — reactive doc dict
 */
export function createHandleFetchFrom(allFields, formData) {
	/**
	 * When a Link field changes, pull fetch_from targets from the linked document.
	 *
	 * @param {string} linkFieldname
	 * @param {string} linkValue
	 */
	async function handleFetchFrom(linkFieldname, linkValue) {
		if (!linkValue) return;

		const fetchTargets = [];
		for (const field of allFields.value) {
			if (!field.fetch_from) continue;
			const parts = field.fetch_from.split(".");
			if (parts.length !== 2) continue;
			if (parts[0] !== linkFieldname) continue;

			if (field.fetch_if_empty && formData[field.fieldname]) continue;

			fetchTargets.push({
				fieldname: field.fieldname,
				remoteField: parts[1],
				fetchIfEmpty: !!field.fetch_if_empty,
			});
		}

		if (!fetchTargets.length) return;

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

	return handleFetchFrom;
}
