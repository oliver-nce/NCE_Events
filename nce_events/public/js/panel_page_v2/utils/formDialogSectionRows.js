import { sectionHasVisibleFields } from "./parseLayout.js";

/**
 * Row-major grid for a parsed section — row i holds column stacks' i-th field (or null).
 *
 * @param {object} section
 * @returns {Array<Array<object|null>>}
 */
export function sectionGridRows(section) {
	const cols = section?.columns || [];
	if (!cols.length) {
		return [];
	}
	const maxLen = Math.max(0, ...cols.map((c) => (c.fields || []).length));
	const rows = [];
	for (let r = 0; r < maxLen; r++) {
		rows.push(cols.map((c) => (c.fields || [])[r] ?? null));
	}
	return rows;
}

/** @param {object} section */
export function sectionColumnCount(section) {
	const n = section?.columnCount || section?.columns?.length;
	return Math.max(1, parseInt(n, 10) || 1);
}

/** @param {Array<object>} sections */
export function visibleFormDialogSections(sections) {
	return (sections || []).filter(sectionHasVisibleFields);
}
