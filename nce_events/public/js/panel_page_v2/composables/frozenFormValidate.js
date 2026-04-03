import { evaluateExpression, isLayoutField } from "../utils/frappeFieldExpr.js";

/**
 * Validate mandatory fields on a frozen form.
 * @param {Array} allFields — DocField-like dicts
 * @param {object} formData — plain/reactive doc dict
 * @returns {Array<{ fieldname: string, label: string, message: string }>}
 */
export function validateFrozenForm(allFields, formData) {
	const errors = [];

	for (const field of allFields) {
		if (isLayoutField(field.fieldtype)) continue;
		if (field.hidden) continue;

		if (field.depends_on && !evaluateExpression(field.depends_on, formData)) continue;

		const isMandatory =
			field.reqd ||
			(field.mandatory_depends_on && evaluateExpression(field.mandatory_depends_on, formData));

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

export function isFieldVisible(field, formData) {
	if (field.hidden) return false;
	if (!field.depends_on) return true;
	return evaluateExpression(field.depends_on, formData);
}

export function isFieldMandatory(field, formData) {
	if (field.mandatory_depends_on) {
		return evaluateExpression(field.mandatory_depends_on, formData);
	}
	return !!field.reqd;
}

export function isFieldReadOnly(field, formData) {
	if (field.read_only_depends_on) {
		return evaluateExpression(field.read_only_depends_on, formData);
	}
	return !!field.read_only;
}
