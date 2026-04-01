/**
 * Parse a flat Frappe field list into a nested layout tree.
 *
 * @param {Array} fields - Array of DocField objects, sorted by idx
 * @returns {Array} Array of tab objects
 *
 * Each tab:     { label: string, sections: Section[] }
 * Each section: { label: string, collapsible: bool, description: string, columns: Column[] }
 * Each column:  { fields: DocField[] }
 */
export function parseLayout(fields) {
  const tabs = [];
  let currentTab = { label: "Details", sections: [] };
  let currentSection = { label: "", collapsible: false, description: "", columns: [] };
  let currentColumn = { fields: [] };

  for (const field of fields) {
    if (field.hidden) continue;

    const ft = field.fieldtype;

    if (ft === "Tab Break") {
      currentSection.columns.push(currentColumn);
      currentTab.sections.push(currentSection);
      if (hasVisibleFields(currentTab)) {
        tabs.push(currentTab);
      }
      currentTab = { label: field.label || "Details", sections: [] };
      currentSection = { label: "", collapsible: false, description: "", columns: [] };
      currentColumn = { fields: [] };
    } else if (ft === "Section Break") {
      currentSection.columns.push(currentColumn);
      currentTab.sections.push(currentSection);
      currentSection = {
        label: field.label || "",
        collapsible: !!field.collapsible,
        description: field.description || "",
        columns: [],
      };
      currentColumn = { fields: [] };
    } else if (ft === "Column Break") {
      currentSection.columns.push(currentColumn);
      currentColumn = { fields: [] };
    } else {
      currentColumn.fields.push(field);
    }
  }

  currentSection.columns.push(currentColumn);
  currentTab.sections.push(currentSection);
  if (hasVisibleFields(currentTab)) {
    tabs.push(currentTab);
  }

  return tabs;
}

function hasVisibleFields(tab) {
  return tab.sections.some((s) => s.columns.some((c) => c.fields.length > 0));
}
