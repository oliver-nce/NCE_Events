import { ref, reactive, computed } from "vue";
import { parseLayout } from "../utils/parseLayout.js";

/**
 * Helper: wrap frappe.call in a Promise.
 * This matches the pattern in usePanel.js.
 */
function frappeCall(method, args) {
  return new Promise((resolve, reject) => {
    frappe.call({
      method,
      args,
      callback: (r) => (r.message != null ? resolve(r.message) : reject("Empty response")),
      error: reject,
    });
  });
}

/**
 * Evaluate a Frappe depends_on expression.
 *
 * Formats:
 *   "eval:doc.status=='Open'"  — JS expression with doc in scope
 *   "fieldname"                 — truthy check on field value
 *   ""                          — always true
 */
function evaluateExpression(expr, doc) {
  if (!expr) return true;
  if (expr.startsWith("eval:")) {
    try {
      const code = expr.slice(5);
      return new Function("doc", `return (${code})`)(doc);
    } catch {
      return true;
    }
  }
  return !!doc[expr];
}

const LAYOUT_FIELDTYPES = [
  "Tab Break", "Section Break", "Column Break",
  "Heading", "HTML", "Image", "Fold",
];

function isLayoutField(fieldtype) {
  return LAYOUT_FIELDTYPES.includes(fieldtype);
}

/**
 * Composable for managing a Panel Form Dialog.
 *
 * @param {Object} options
 * @param {string} options.definitionName - Name of the Form Dialog document
 * @param {string} options.doctype - Target DocType
 * @param {string|null} options.docName - Document name to edit (null = create new)
 */
export function usePanelFormDialog({ definitionName, doctype, docName }) {
  const definition = ref(null);
  const tabs = ref([]);
  const allFields = ref([]);
  const formData = reactive({});
  const originalData = ref({});
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const validationError = ref(null);
  const buttons = ref([]);

  const isNew = computed(() => !docName);
  const dialogTitle = computed(() => {
    if (!definition.value) return "";
    if (isNew.value) return `New ${doctype}`;
    return `Edit ${doctype}: ${docName}`;
  });
  const dialogSize = computed(() => definition.value?.dialog_size || "xl");

  /**
   * Load the frozen definition + document data.
   * Call this when the dialog opens.
   */
  async function load() {
    loading.value = true;
    error.value = null;
    validationError.value = null;

    try {
      // 1. Load frozen definition
      const defn = await frappeCall(
        "nce_events.api.form_dialog_api.get_form_dialog_definition",
        { name: definitionName }
      );
      definition.value = defn;
      buttons.value = defn.buttons || [];

      // 2. Parse the frozen fields into layout tree
      const fields = defn.frozen_meta?.fields || [];
      allFields.value = fields;
      tabs.value = parseLayout(fields);

      // 3. Initialize formData with defaults from frozen schema
      for (const field of fields) {
        if (field.fieldname && !isLayoutField(field.fieldtype)) {
          formData[field.fieldname] = field.default || null;
        }
      }

      // 4. If editing, load the live document data
      if (docName) {
        const doc = await frappeCall("frappe.client.get", {
          doctype: doctype,
          name: docName,
        });
        Object.assign(formData, doc);
      }

      // 5. Auto-resolve fetch_from fields — fetch live values from linked records
      //    so that "display related value" fields always show the current linked
      //    value, not a stale (or empty) stored copy.
      const linkFields = fields.filter(
        (f) => f.fieldtype === "Link" && f.options && formData[f.fieldname]
      );
      await Promise.all(
        linkFields.map((lf) => handleFetchFrom(lf.fieldname, formData[lf.fieldname]))
      );

      // Store original data for cancel/revert
      originalData.value = JSON.parse(JSON.stringify(formData));
    } catch (err) {
      error.value = err?.message || err?.toString() || "Failed to load form";
    } finally {
      loading.value = false;
    }
  }

  /**
   * Validate mandatory fields.
   * Returns array of error objects. Empty array = valid.
   */
  function validate() {
    const errors = [];

    for (const field of allFields.value) {
      if (isLayoutField(field.fieldtype)) continue;
      if (field.hidden) continue;

      // Skip fields hidden by depends_on
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

  /**
   * Save or insert the document, then return the saved doc.
   * Throws on validation or server error.
   */
  async function save() {
    validationError.value = null;

    const errors = validate();
    if (errors.length) {
      validationError.value = errors.map((e) => e.message).join(", ");
      throw new Error(validationError.value);
    }

    saving.value = true;
    try {
      const method = isNew.value ? "frappe.client.insert" : "frappe.client.save";
      const result = await frappeCall(method, {
        doc: { doctype: doctype, ...formData },
      });
      Object.assign(formData, result);
      return result;
    } catch (err) {
      const msg = err?.message || err?._server_messages || "Failed to save";
      validationError.value = msg;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Revert formData to original loaded values.
   */
  function revert() {
    const orig = originalData.value;
    for (const key of Object.keys(formData)) {
      formData[key] = orig[key] !== undefined ? orig[key] : null;
    }
  }

  /**
   * Check if a field is visible based on depends_on.
   */
  function isFieldVisible(field) {
    if (field.hidden) return false;
    if (!field.depends_on) return true;
    return evaluateExpression(field.depends_on, formData);
  }

  /**
   * Check if a field is mandatory (static or conditional).
   */
  function isFieldMandatory(field) {
    if (field.mandatory_depends_on) {
      return evaluateExpression(field.mandatory_depends_on, formData);
    }
    return !!field.reqd;
  }

  /**
   * Check if a field is read-only (static or conditional).
   */
  function isFieldReadOnly(field) {
    if (field.read_only_depends_on) {
      return evaluateExpression(field.read_only_depends_on, formData);
    }
    return !!field.read_only;
  }

  /**
   * Pre-save writeback: push user-edited fetch_from field values back to
   * the SOURCE documents BEFORE calling frappe.client.save.
   *
   * Why before save? Because Frappe's server-side Document.save() re-runs
   * set_fetch_from_values(), which re-fetches from the source and would
   * overwrite the user's edit. By writing back first, the re-fetch picks
   * up the updated value and the edit sticks.
   *
   * Only writes back fields the user actually changed (compares to originalData).
   */
  async function writebackBeforeSave() {
    const promises = [];

    for (const field of allFields.value) {
      if (!field.fetch_from) continue;
      const parts = field.fetch_from.split(".");
      if (parts.length !== 2) continue;

      const [linkFieldname, sourceFieldname] = parts;
      const currentValue = formData[field.fieldname];
      const originalValue = originalData.value[field.fieldname];

      // Only writeback if the user actually changed this field
      if (String(currentValue ?? "") === String(originalValue ?? "")) continue;

      // Find the Link field to get the target DocType
      const linkField = allFields.value.find((f) => f.fieldname === linkFieldname);
      if (!linkField || !linkField.options) continue;

      const targetDocname = formData[linkFieldname];
      if (!targetDocname) continue;

      promises.push(
        frappeCall("frappe.client.set_value", {
          doctype: linkField.options,
          name: targetDocname,
          fieldname: sourceFieldname,
          value: currentValue,
        })
      );
    }

    if (promises.length) {
      await Promise.all(promises);
    }

    return promises.length;
  }

  /**
   * Handle fetch_from when a Link field value changes.
   * Looks at all fields with fetch_from referencing this Link field,
   * then fetches values from the linked document.
   *
   * @param {string} linkFieldname - The fieldname of the Link that changed
   * @param {string} linkValue - The new value (document name) of the Link field
   */
  async function handleFetchFrom(linkFieldname, linkValue) {
    if (!linkValue) return;

    // Find all fields that have fetch_from pointing to this link field
    const fetchTargets = [];
    for (const field of allFields.value) {
      if (!field.fetch_from) continue;
      const parts = field.fetch_from.split(".");
      if (parts.length !== 2) continue;
      if (parts[0] !== linkFieldname) continue;

      // Check fetch_if_empty: skip if field already has a value
      if (field.fetch_if_empty && formData[field.fieldname]) continue;

      fetchTargets.push({
        fieldname: field.fieldname,
        remoteField: parts[1],
        fetchIfEmpty: !!field.fetch_if_empty,
      });
    }

    if (!fetchTargets.length) return;

    // Find the Link field's target DocType
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

  return {
    definition,
    tabs,
    allFields,
    formData,
    loading,
    saving,
    error,
    validationError,
    buttons,
    isNew,
    dialogTitle,
    dialogSize,
    load,
    validate,
    save,
    revert,
    isFieldVisible,
    isFieldMandatory,
    isFieldReadOnly,
    handleFetchFrom,
    writebackBeforeSave,
  };
}
