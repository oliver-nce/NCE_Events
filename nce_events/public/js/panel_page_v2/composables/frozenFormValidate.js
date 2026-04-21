import { evaluateExpression, isLayoutField } from "../utils/frappeFieldExpr.js";

/** Same emptiness rule as mandatory DocField validation in validateFrozenForm. */
export function isMandatoryValueEmpty(value) {
	return value === null || value === undefined || value === "" || value === 0;
}

/** Frappe Virtual DocField — computed, not stored; always read-only on Desk. */
export function isVirtualDocField(field) {
	if (!field) return false;
	return Number(field.is_virtual) === 1 || field.is_virtual === true;
}

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
		if (isVirtualDocField(field)) continue;

		if (field.depends_on && !evaluateExpression(field.depends_on, formData)) continue;

		const isMandatory =
			field.reqd ||
			(field.mandatory_depends_on && evaluateExpression(field.mandatory_depends_on, formData));

		if (isMandatory) {
			const value = formData[field.fieldname];
			if (isMandatoryValueEmpty(value)) {
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
 * Page Panel Display "Required" keys (root fieldnames only; dotted link keys skipped).
 * @param {Array} allFields — DocField-like dicts
 * @param {object} formData
 * @param {string[]|null|undefined} requiredFieldnames
 */
export function validatePanelRequiredFields(allFields, formData, requiredFieldnames) {
	const errors = [];
	if (!Array.isArray(requiredFieldnames) || !requiredFieldnames.length) {
		return errors;
	}
	const fieldMap = new Map((allFields || []).map((f) => [f.fieldname, f]));
	for (const raw of requiredFieldnames) {
		const key = String(raw || "").trim();
		if (!key || key.includes(".")) {
			continue;
		}
		const field = fieldMap.get(key);
		if (!field) {
			continue;
		}
		if (isLayoutField(field.fieldtype)) {
			continue;
		}
		if (field.hidden) {
			continue;
		}
		if (isVirtualDocField(field)) {
			continue;
		}
		if (field.depends_on && !evaluateExpression(field.depends_on, formData)) {
			continue;
		}
		const value = formData[field.fieldname];
		if (isMandatoryValueEmpty(value)) {
			errors.push({
				fieldname: field.fieldname,
				label: field.label,
				message: `${field.label} is required`,
			});
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
	if (isVirtualDocField(field)) {
		return true;
	}
	if (field.read_only_depends_on) {
		return evaluateExpression(field.read_only_depends_on, formData);
	}
	return !!field.read_only;
}
