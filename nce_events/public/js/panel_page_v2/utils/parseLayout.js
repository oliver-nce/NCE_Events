/**
 * Anchor for frozen layout tabs that appear before the first Tab Break in DocType meta.
 * Keep in sync with ``nce_events.api.form_dialog._fd_capture_meta.FD_LEAD_TAB_ANCHOR``.
 */
export const FORM_DIALOG_LEAD_TAB_ANCHOR = "__lead__";

const DEFAULT_COLUMN_COUNT = 2;

/**
 * @param {object|undefined} breakField Section Break field dict (optional)
 */
function createSection(breakField) {
	const rawCols = breakField != null ? breakField.columns : null;
	const columnCount = Math.max(1, parseInt(rawCols, 10) || DEFAULT_COLUMN_COUNT);
	return {
		label: (breakField && breakField.label) || "",
		collapsible: !!(breakField && breakField.collapsible),
		description: (breakField && breakField.description) || "",
		columnCount,
		columns: Array.from({ length: columnCount }, () => ({ fields: [] })),
	};
}

/** @param {object} section */
export function sectionHasVisibleFields(section) {
	return (section.columns || []).some((c) => (c.fields || []).length > 0);
}

/** @param {object} tab */
function tabHasVisibleFields(tab) {
	return (tab.sections || []).some(sectionHasVisibleFields);
}

/** @param {object} tab @param {object} section */
function pushSectionIfVisible(tab, section) {
	if (sectionHasVisibleFields(section)) {
		tab.sections.push(section);
	}
}

/**
 * Parse a flat Frappe field list into a nested layout tree.
 *
 * Column Break advances within the section's column count (Desk ``columns`` on
 * Section Break, default 2) and wraps to the next row — fields stack vertically
 * within each column stack so row partners align in the UI.
 *
 * @param {Array} fields - Array of DocField objects, sorted by idx
 * @returns {Array} Array of tab objects
 *
 * Each tab:     { anchor: string, label: string, sections: Section[] }
 * Each section: { label, collapsible, description, columnCount, columns: Column[] }
 * Each column:  { fields: DocField[] }
 */
export function parseLayout(fields) {
	const tabs = [];
	let currentTab = {
		anchor: FORM_DIALOG_LEAD_TAB_ANCHOR,
		label: "Details",
		sections: [],
	};
	let currentSection = createSection(undefined);
	let colIdx = 0;

	for (const field of fields) {
		if (field.hidden) continue;

		const ft = field.fieldtype;

		if (ft === "Tab Break") {
			pushSectionIfVisible(currentTab, currentSection);
			if (tabHasVisibleFields(currentTab)) {
				tabs.push(currentTab);
			}
			const breakFn =
				(field.fieldname && String(field.fieldname).trim()) || FORM_DIALOG_LEAD_TAB_ANCHOR;
			currentTab = {
				anchor: breakFn,
				label: field.label || "Details",
				sections: [],
			};
			currentSection = createSection(undefined);
			colIdx = 0;
		} else if (ft === "Section Break") {
			pushSectionIfVisible(currentTab, currentSection);
			currentSection = createSection(field);
			colIdx = 0;
		} else if (ft === "Column Break") {
			const n = currentSection.columnCount || currentSection.columns.length || DEFAULT_COLUMN_COUNT;
			colIdx = (colIdx + 1) % n;
		} else {
			const cols = currentSection.columns;
			if (!cols.length) {
				currentSection.columns = [{ fields: [] }];
				currentSection.columnCount = 1;
			}
			cols[colIdx].fields.push(field);
		}
	}

	pushSectionIfVisible(currentTab, currentSection);
	if (tabHasVisibleFields(currentTab)) {
		tabs.push(currentTab);
	}

	return tabs;
}

/** @deprecated use sectionHasVisibleFields */
function hasVisibleFields(tab) {
	return tabHasVisibleFields(tab);
}

export { hasVisibleFields };
