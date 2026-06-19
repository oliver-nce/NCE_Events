/**
 * Anchor for frozen layout tabs that appear before the first Tab Break in DocType meta.
 * Keep in sync with ``nce_events.api.form_dialog._fd_capture_meta.FD_LEAD_TAB_ANCHOR``.
 */
export const FORM_DIALOG_LEAD_TAB_ANCHOR = "__lead__";

/** @param {object} section */
function syncSectionColumnCount(section) {
	section.columnCount = Math.max(1, (section.columns || []).length);
}

/**
 * @param {object|undefined} breakField Section Break field dict (optional)
 */
function createSection(breakField) {
	return {
		label: (breakField && breakField.label) || "",
		collapsible: !!(breakField && breakField.collapsible),
		description: (breakField && breakField.description) || "",
		columnCount: 1,
		columns: [{ fields: [] }],
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
		syncSectionColumnCount(section);
		tab.sections.push(section);
	}
}

/**
 * Parse a flat Frappe field list into a nested layout tree.
 *
 * Matches Frappe v15 Desk layout: each section starts with one column; each
 * Column Break adds another column. (DocField ``columns`` is for list/grid span,
 * not section width — do not use it here.)
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
			colIdx += 1;
			if (!currentSection.columns[colIdx]) {
				currentSection.columns.push({ fields: [] });
			}
			syncSectionColumnCount(currentSection);
		} else {
			const cols = currentSection.columns;
			if (!cols.length) {
				currentSection.columns = [{ fields: [] }];
			}
			while (colIdx >= cols.length) {
				cols.push({ fields: [] });
			}
			cols[colIdx].fields.push(field);
			syncSectionColumnCount(currentSection);
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
