# Phase C–D — Coding Instructions

You are implementing the Vue frontend for the Form Dialog feature. This phase creates Vue components that render a dynamic form dialog inside Panel Page V2, using a frozen DocType schema.

**Prerequisite:** Phases A and B are complete.

Read these instructions completely before writing any code.

---

## Context

- **Vue app directory:** `nce_events/public/js/panel_page_v2/`
- **Build:** Vite + Vue 3 (no Tailwind — see Theming section)
- **Frappe UI version:** `frappe-ui@^0.0.31` (already in package.json)
- **Server calls pattern:** Use `frappe.call({ method, args, callback })` wrapped in Promises, matching the existing `frappeCall` helper in `composables/usePanel.js`

**Directory structure after this phase:**
```
panel_page_v2/
├── App.vue               (modified)
├── main.js
├── components/
│   ├── PanelFormDialog.vue   (NEW)
│   ├── PanelFormField.vue    (NEW)
│   └── ... (existing files unchanged)
├── composables/
│   ├── usePanelFormDialog.js (NEW)
│   └── ... (existing files unchanged)
└── utils/
    ├── parseLayout.js        (NEW)
    └── fieldTypeMap.js       (NEW)
```

---

## Task 1: Create `utils/parseLayout.js`

Create directory `nce_events/public/js/panel_page_v2/utils/` if it does not exist.

### File: `panel_page_v2/utils/parseLayout.js`

Copy this **exactly** — this is from the reference document and must not be modified:

```javascript
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
```

---

## Task 2: Create `utils/fieldTypeMap.js`

### File: `panel_page_v2/utils/fieldTypeMap.js`

Copy this **exactly**:

```javascript
/**
 * Maps Frappe fieldtypes to component configurations.
 *
 * Returns: { component: string, props: object } for data fields
 * Returns: { layout: string } for layout-only fields
 * Returns: null for unknown fields (fallback to text input)
 */
export function getComponentConfig(field) {
  const map = {
    // Text inputs
    Data:            { component: "FormControl", props: { type: "text" } },
    "Small Text":    { component: "FormControl", props: { type: "textarea", rows: 3 } },
    Text:            { component: "FormControl", props: { type: "textarea", rows: 5 } },
    "Text Editor":   { component: "TextEditor", props: {} },
    Code:            { component: "FormControl", props: { type: "textarea", rows: 8 } },
    "HTML Editor":   { component: "FormControl", props: { type: "textarea", rows: 8 } },
    "Markdown Editor": { component: "FormControl", props: { type: "textarea", rows: 8 } },
    JSON:            { component: "FormControl", props: { type: "textarea", rows: 8 } },

    // Numeric
    Int:       { component: "FormControl", props: { type: "number", step: 1 } },
    Float:     { component: "FormControl", props: { type: "number", step: "any" } },
    Currency:  { component: "FormControl", props: { type: "number", step: "any" } },
    Percent:   { component: "FormControl", props: { type: "number", min: 0, max: 100 } },

    // Date/Time
    Date:      { component: "DatePicker", props: {} },
    Datetime:  { component: "DateTimePicker", props: {} },
    Time:      { component: "FormControl", props: { type: "time" } },
    Duration:  { component: "FormControl", props: { type: "text", placeholder: "e.g. 1h 30m" } },

    // Boolean
    Check: { component: "Checkbox", props: {} },

    // Selection
    Select: { component: "FormControl", props: { type: "select" } },

    // Relationships
    Link:         { component: "Link", props: {} },
    "Dynamic Link": { component: "Link", props: {} },
    Table:        { layout: "table" },
    "Table MultiSelect": { layout: "table_multiselect" },

    // File
    Attach:       { component: "FileUploader", props: {} },
    "Attach Image": { component: "FileUploader", props: { accept: "image/*" } },

    // Specialized
    Password:     { component: "FormControl", props: { type: "password" } },
    Phone:        { component: "FormControl", props: { type: "tel" } },
    Rating:       { component: "Rating", props: {} },
    Color:        { component: "FormControl", props: { type: "color" } },
    Autocomplete: { component: "Autocomplete", props: {} },
    Barcode:      { component: "FormControl", props: { type: "text" } },
    "Read Only":  { component: "ReadOnly", props: {} },
    Signature:    { component: "Signature", props: {} },
    Geolocation:  { component: "Geolocation", props: {} },
    Icon:         { component: "FormControl", props: { type: "text" } },

    // Display-only
    Heading:      { layout: "heading" },
    HTML:         { layout: "html" },
    Image:        { layout: "image" },
    Button:       { layout: "button" },
    Fold:         { layout: "fold" },

    // Layout (handled by parser, should not appear as fields)
    "Tab Break":     { layout: "tab" },
    "Section Break": { layout: "section" },
    "Column Break":  { layout: "column" },
  };

  return map[field.fieldtype] || { component: "FormControl", props: { type: "text" } };
}
```

---

## Task 3: Create `composables/usePanelFormDialog.js`

### File: `panel_page_v2/composables/usePanelFormDialog.js`

```javascript
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
  };
}
```

---

## Task 4: Create `components/PanelFormField.vue`

### File: `panel_page_v2/components/PanelFormField.vue`

```vue
<template>
  <!-- Table fields: placeholder -->
  <div v-if="config?.layout === 'table'" class="ppv2-fd-table-placeholder">
    <span>Child table: {{ field.label }} ({{ field.options }})</span>
    <span class="ppv2-fd-muted">— not yet supported in dialog view</span>
  </div>

  <!-- Heading -->
  <h4 v-else-if="config?.layout === 'heading'" class="ppv2-fd-heading">
    {{ field.label }}
  </h4>

  <!-- Static HTML -->
  <div v-else-if="config?.layout === 'html'" v-html="field.options" />

  <!-- Button placeholder -->
  <span v-else-if="config?.layout === 'button'" />

  <!-- Data entry fields -->
  <div v-else-if="config?.component" v-show="visible" class="ppv2-fd-field">
    <label class="ppv2-fd-label">
      {{ field.label }}
      <span v-if="mandatory" class="ppv2-fd-reqd">*</span>
    </label>

    <!-- Select -->
    <select
      v-if="field.fieldtype === 'Select'"
      :value="modelValue"
      :required="mandatory"
      :disabled="readOnly"
      class="ppv2-fd-input ppv2-fd-select"
      @change="onChange($event.target.value)"
    >
      <option value="">— Select —</option>
      <option
        v-for="opt in selectOptions"
        :key="opt"
        :value="opt"
      >{{ opt }}</option>
    </select>

    <!-- Check -->
    <div v-else-if="field.fieldtype === 'Check'" class="ppv2-fd-check-row">
      <input
        type="checkbox"
        :checked="!!modelValue"
        :disabled="readOnly"
        @change="onChange($event.target.checked ? 1 : 0)"
      />
    </div>

    <!-- Link -->
    <div v-else-if="field.fieldtype === 'Link'" class="ppv2-fd-link-wrap">
      <input
        type="text"
        :value="modelValue || ''"
        :required="mandatory"
        :disabled="readOnly"
        :placeholder="field.options ? 'Link to ' + field.options : ''"
        class="ppv2-fd-input"
        @change="onLinkChange($event.target.value)"
      />
    </div>

    <!-- Textarea types -->
    <textarea
      v-else-if="isTextarea"
      :value="modelValue || ''"
      :required="mandatory"
      :disabled="readOnly"
      :rows="config.props?.rows || 3"
      :placeholder="field.placeholder || ''"
      class="ppv2-fd-input ppv2-fd-textarea"
      @input="onChange($event.target.value)"
    />

    <!-- All other fields: text/number/date/time/etc -->
    <input
      v-else
      :type="config.props?.type || 'text'"
      :value="modelValue ?? ''"
      :required="mandatory"
      :disabled="readOnly"
      :placeholder="field.placeholder || ''"
      :step="config.props?.step"
      :min="config.props?.min"
      :max="config.props?.max"
      class="ppv2-fd-input"
      @change="onChange($event.target.value)"
    />

    <!-- Description -->
    <p v-if="field.description" class="ppv2-fd-desc">{{ field.description }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { getComponentConfig } from "../utils/fieldTypeMap.js";

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { default: null },
  visible: { type: Boolean, default: true },
  mandatory: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
});

const emit = defineEmits(["change", "link-change"]);

const config = computed(() => getComponentConfig(props.field));

const isTextarea = computed(() => {
  const t = config.value?.props?.type;
  return t === "textarea";
});

const selectOptions = computed(() => {
  if (props.field.fieldtype === "Select" && props.field.options) {
    return props.field.options.split("\n").filter(Boolean);
  }
  return [];
});

function onChange(value) {
  emit("change", { fieldname: props.field.fieldname, value });
}

function onLinkChange(value) {
  emit("change", { fieldname: props.field.fieldname, value });
  emit("link-change", { fieldname: props.field.fieldname, value });
}
</script>

<style scoped>
.ppv2-fd-field {
  margin-bottom: 10px;
}
.ppv2-fd-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-color);
  margin-bottom: 3px;
}
.ppv2-fd-reqd {
  color: #e74c3c;
}
.ppv2-fd-input {
  width: 100%;
  padding: 5px 8px;
  font-size: var(--font-size-base);
  font-family: var(--font-family);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm, 4px);
  background: var(--bg-card);
  color: var(--text-color);
  box-sizing: border-box;
}
.ppv2-fd-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary-light);
}
.ppv2-fd-input:disabled {
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: not-allowed;
}
.ppv2-fd-textarea {
  resize: vertical;
}
.ppv2-fd-select {
  appearance: auto;
}
.ppv2-fd-check-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ppv2-fd-desc {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin: 2px 0 0;
}
.ppv2-fd-heading {
  font-size: var(--font-size-lg, 16px);
  font-weight: var(--font-weight-bold);
  color: var(--text-color);
  margin: 8px 0 4px;
}
.ppv2-fd-table-placeholder {
  padding: 8px 12px;
  background: var(--bg-surface);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius-sm, 4px);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: 10px;
}
.ppv2-fd-muted {
  color: var(--text-muted);
  font-style: italic;
}
.ppv2-fd-link-wrap {
  position: relative;
}
</style>
```

---

## Task 5: Create `components/PanelFormDialog.vue`

### File: `panel_page_v2/components/PanelFormDialog.vue`

```vue
<template>
  <div v-if="open" class="ppv2-form-dialog-backdrop" @click.self="onCancel">
    <div class="ppv2-form-dialog" :class="'ppv2-fd-size-' + form.dialogSize.value">
      <!-- Header -->
      <div class="ppv2-fd-header">
        <span class="ppv2-fd-title">{{ form.dialogTitle.value }}</span>
        <button class="ppv2-fd-close" @click="onCancel">&times;</button>
      </div>

      <!-- Body -->
      <div class="ppv2-fd-body">
        <!-- Loading -->
        <div v-if="form.loading.value" class="ppv2-fd-loading">Loading…</div>

        <!-- Error -->
        <div v-else-if="form.error.value" class="ppv2-fd-error">{{ form.error.value }}</div>

        <!-- Form content -->
        <template v-else-if="form.tabs.value.length">
          <!-- Tab bar (only if multiple tabs) -->
          <div v-if="form.tabs.value.length > 1" class="ppv2-fd-tab-bar">
            <button
              v-for="(tab, ti) in form.tabs.value"
              :key="ti"
              class="ppv2-fd-tab-btn"
              :class="{ 'ppv2-fd-tab-active': activeTab === ti }"
              @click="activeTab = ti"
            >{{ tab.label }}</button>
          </div>

          <!-- Tab content -->
          <div
            v-for="(tab, ti) in form.tabs.value"
            :key="ti"
            v-show="form.tabs.value.length === 1 || activeTab === ti"
          >
            <!-- Sections -->
            <div
              v-for="(section, si) in tab.sections"
              :key="si"
              class="ppv2-fd-section"
            >
              <h3 v-if="section.label" class="ppv2-fd-section-label">
                {{ section.label }}
              </h3>
              <p v-if="section.description" class="ppv2-fd-section-desc">
                {{ section.description }}
              </p>

              <!-- Columns as CSS grid -->
              <div
                class="ppv2-fd-columns"
                :style="{ gridTemplateColumns: 'repeat(' + section.columns.length + ', 1fr)' }"
              >
                <div v-for="(col, ci) in section.columns" :key="ci">
                  <PanelFormField
                    v-for="field in col.fields"
                    :key="field.fieldname"
                    :field="field"
                    :model-value="form.formData[field.fieldname]"
                    :visible="form.isFieldVisible(field)"
                    :mandatory="form.isFieldMandatory(field)"
                    :read-only="form.isFieldReadOnly(field)"
                    @change="onFieldChange"
                    @link-change="onLinkChange"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Validation error -->
          <div v-if="form.validationError.value" class="ppv2-fd-validation-error">
            {{ form.validationError.value }}
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="ppv2-fd-footer">
        <!-- Placeholder buttons from child table -->
        <div class="ppv2-fd-custom-buttons">
          <button
            v-for="btn in form.buttons.value"
            :key="btn.label"
            class="ppv2-fd-btn ppv2-fd-btn-default"
            @click="onPlaceholderButton(btn)"
          >{{ btn.label }}</button>
        </div>

        <div class="ppv2-fd-action-buttons">
          <button class="ppv2-fd-btn ppv2-fd-btn-default" @click="onCancel">Cancel</button>
          <button
            class="ppv2-fd-btn ppv2-fd-btn-primary"
            :disabled="form.saving.value"
            @click="onSubmit"
          >{{ form.saving.value ? 'Saving…' : 'Submit' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import PanelFormField from "./PanelFormField.vue";
import { usePanelFormDialog } from "../composables/usePanelFormDialog.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  definitionName: { type: String, required: true },
  doctype: { type: String, required: true },
  docName: { type: String, default: null },
});

const emit = defineEmits(["close", "saved"]);

const activeTab = ref(0);

const form = usePanelFormDialog({
  definitionName: props.definitionName,
  doctype: props.doctype,
  docName: props.docName,
});

// Load when dialog opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = 0;
      form.load();
    }
  },
  { immediate: true }
);

function onFieldChange({ fieldname, value }) {
  form.formData[fieldname] = value;
}

async function onLinkChange({ fieldname, value }) {
  form.formData[fieldname] = value;
  await form.handleFetchFrom(fieldname, value);
}

function onCancel() {
  form.revert();
  emit("close");
}

async function onSubmit() {
  try {
    const result = await form.save();
    emit("saved", result);
    emit("close");
  } catch {
    // validationError is set by the composable — stay open
  }
}

function onPlaceholderButton(btn) {
  if (typeof frappe !== "undefined" && frappe.show_alert) {
    frappe.show_alert({ message: `Button "${btn.label}" — scripts coming soon`, indicator: "blue" });
  }
}
</script>

<style scoped>
.ppv2-form-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.ppv2-form-dialog {
  background: var(--bg-card);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}
/* Size variants */
.ppv2-fd-size-sm  { width: 400px; }
.ppv2-fd-size-md  { width: 540px; }
.ppv2-fd-size-lg  { width: 680px; }
.ppv2-fd-size-xl  { width: 820px; }
.ppv2-fd-size-2xl { width: 960px; }
.ppv2-fd-size-3xl { width: 1100px; }

.ppv2-fd-header {
  padding: 10px 16px;
  background: var(--bg-header);
  color: var(--text-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.ppv2-fd-title {
  font-weight: var(--font-weight-bold);
  font-size: 14px;
}
.ppv2-fd-close {
  background: none;
  border: none;
  color: var(--text-header);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  opacity: 0.8;
}
.ppv2-fd-close:hover {
  opacity: 1;
}
.ppv2-fd-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
}
.ppv2-fd-loading {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
  font-size: var(--font-size-base);
}
.ppv2-fd-error {
  text-align: center;
  padding: 32px;
  color: #c0392b;
  font-size: var(--font-size-base);
}
.ppv2-fd-tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}
.ppv2-fd-tab-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm, 4px);
  background: var(--bg-card);
  color: var(--text-color);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.ppv2-fd-tab-active {
  background: var(--bg-header);
  color: var(--text-header);
  border-color: var(--bg-header);
  font-weight: var(--font-weight-bold);
}
.ppv2-fd-section {
  margin-bottom: 16px;
}
.ppv2-fd-section-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--text-color);
  margin: 0 0 8px;
}
.ppv2-fd-section-desc {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin: 0 0 8px;
}
.ppv2-fd-columns {
  display: grid;
  gap: 12px;
}
.ppv2-fd-validation-error {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border: 1px solid #e74c3c;
  border-radius: var(--border-radius-sm, 4px);
  color: #c0392b;
  font-size: var(--font-size-sm);
}
.ppv2-fd-footer {
  flex-shrink: 0;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ppv2-fd-custom-buttons {
  display: flex;
  gap: 4px;
}
.ppv2-fd-action-buttons {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.ppv2-fd-btn {
  padding: 5px 14px;
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  border-radius: var(--border-radius-sm, 4px);
  cursor: pointer;
  border: 1px solid var(--border-color);
}
.ppv2-fd-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ppv2-fd-btn-default {
  background: var(--bg-card);
  color: var(--text-color);
}
.ppv2-fd-btn-primary {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}
.ppv2-fd-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
</style>
```

---

## Task 6: Modify `panel_api.py` — add `form_dialog` to config

Edit `nce_events/api/panel_api.py`. In the `get_panel_config` function, add `form_dialog` to **both** return statements.

### In the early return (when Page Panel doc doesn't exist, around line 55):

Add this line to the return dict:

```python
"form_dialog": None,
```

### In the main return (the dict returned when the doc exists, around line 145):

Add this line:

```python
"form_dialog": (doc.form_dialog or "").strip() or None,
```

Do NOT change anything else in this file.

---

## Task 7: Modify `App.vue` — wire up form dialog

Edit `nce_events/public/js/panel_page_v2/App.vue`.

### 7a. Add import at the top of `<script setup>`

After the existing imports, add:

```javascript
import PanelFormDialog from "./components/PanelFormDialog.vue";
```

### 7b. Add reactive state

After the existing reactive declarations (near `const openPanels = reactive([])` etc.), add:

```javascript
// Form dialog state
const showFormDialog = ref(false);
const formDialogDocName = ref(null);
const formDialogDefinition = ref(null);
const formDialogDoctype = ref(null);
```

### 7c. Modify `onDrilledRowClick`

Find the existing `onDrilledRowClick` function:

```javascript
function onDrilledRowClick(p, row) {
	if (!p.config?.open_card_on_click || !row?.name) return;
	const slug = p.doctype.toLowerCase().replace(/ /g, "-");
	const url = `${window.location.origin}/app/${slug}/${encodeURIComponent(row.name)}`;
	window.open(url, "_blank");
}
```

Replace it with:

```javascript
function onDrilledRowClick(p, row) {
	if (!row?.name) return;

	// If panel has a form_dialog configured, open the dialog instead of a new tab
	if (p.config?.form_dialog) {
		formDialogDefinition.value = p.config.form_dialog;
		formDialogDoctype.value = p.doctype;
		formDialogDocName.value = row.name;
		showFormDialog.value = true;
		return;
	}

	if (!p.config?.open_card_on_click) return;
	const slug = p.doctype.toLowerCase().replace(/ /g, "-");
	const url = `${window.location.origin}/app/${slug}/${encodeURIComponent(row.name)}`;
	window.open(url, "_blank");
}
```

### 7d. Add dialog close/save handlers

After `onDrilledRowClick`, add:

```javascript
function onFormDialogClose() {
	showFormDialog.value = false;
	formDialogDocName.value = null;
}

function onFormDialogSaved(doc) {
	showFormDialog.value = false;
	formDialogDocName.value = null;
	// Refresh the panel that opened the dialog
	// Find the panel whose doctype matches and reload it
	const panel = openPanels.find((p) => p.doctype === formDialogDoctype.value);
	if (panel && panel._reload) {
		panel._reload();
	}
}
```

### 7e. Add the dialog component to the template

At the end of the `<template>`, just before the closing `</div>` of `.ppv2-root`, add:

```vue
    <!-- Form Dialog -->
    <PanelFormDialog
      v-if="formDialogDefinition"
      :open="showFormDialog"
      :definition-name="formDialogDefinition"
      :doctype="formDialogDoctype"
      :doc-name="formDialogDocName"
      @close="onFormDialogClose"
      @saved="onFormDialogSaved"
    />
```

---

## Task 8: Add `.ppv2-form-dialog` to `theme_defaults.css`

Edit `nce_events/public/css/theme_defaults.css`.

Find the selector list (around lines 19-30):

```css
.ppv2-root,
.ppv2-float,
.panel-float,
.send-panel,
.send-panel-preview,
.send-template-list,
.send-recipients-popup,
.send-review-panel,
.se-tag-panel,
.card-modal-backdrop,
.tf-float,
.tf-tag-panel {
```

Add `.ppv2-form-dialog,` and `.ppv2-form-dialog-backdrop,` to this list. Place them after `.ppv2-float,`:

```css
.ppv2-root,
.ppv2-float,
.ppv2-form-dialog,
.ppv2-form-dialog-backdrop,
.panel-float,
.send-panel,
.send-panel-preview,
.send-template-list,
.send-recipients-popup,
.send-review-panel,
.se-tag-panel,
.card-modal-backdrop,
.tf-float,
.tf-tag-panel {
```

Do NOT change anything else in this file.

---

## Verification

After all changes:

1. `panel_page_v2/utils/` directory exists with `parseLayout.js` and `fieldTypeMap.js`.
2. `panel_page_v2/composables/usePanelFormDialog.js` exists.
3. `panel_page_v2/components/PanelFormDialog.vue` and `PanelFormField.vue` exist.
4. `App.vue` imports `PanelFormDialog` and includes it in the template.
5. `panel_api.py` returns `form_dialog` in both branches of `get_panel_config`.
6. `theme_defaults.css` has `.ppv2-form-dialog` and `.ppv2-form-dialog-backdrop` in the selector list.
7. No Tailwind utility classes appear anywhere in the new code.
8. All CSS uses `var(--...)` variables, never hardcoded colours (except `#ffffff` for button text on primary background and `#e74c3c` / `#c0392b` for error states).

---

## What NOT to do

- Do NOT install new npm packages.
- Do NOT use Tailwind utility classes.
- Do NOT set CSS variables at `:root`.
- Do NOT modify `main.js`, `vite.config.js`, `package.json`, or any existing component files other than `App.vue`.
- Do NOT modify `page_panel.js` (that was Phase B).
- Do NOT implement button script execution — buttons are visual placeholders only.
- Do NOT attempt to render child table (Table fieldtype) content — show the placeholder.
