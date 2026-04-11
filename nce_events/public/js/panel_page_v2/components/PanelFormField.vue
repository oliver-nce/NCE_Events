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
  <div
    v-else-if="config?.component"
    v-show="visible"
    class="ppv2-fd-field"
    :class="{
      'ppv2-fd-field-bold': field.bold,
      'ppv2-fd-field-editable': !readOnly,
      'ppv2-fd-field-dirty': fieldDirty && !readOnly,
    }"
  >
    <label class="ppv2-fd-label">
      {{ field.label }}
      <span v-if="mandatory" class="ppv2-fd-reqd">*</span>
    </label>

    <!-- Select + Autocomplete with newline options (same static list format as Desk Select) -->
    <select
      v-if="useNativeSelectUi"
      :value="modelValue ?? ''"
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

    <!-- Link — Frappe ControlLink; Autocomplete with single-line options = target DocType -->
    <PanelFormLinkField
      v-else-if="field.fieldtype === 'Link' || isAutocompleteLink"
      :field="field"
      :model-value="modelValue"
      :read-only="readOnly"
      :mandatory="mandatory"
      @change="onChange"
      @link-change="onLinkChangePayload"
    />

    <!-- Date / Datetime — Frappe datepicker, same as Desk -->
    <PanelFormDateTimeField
      v-else-if="field.fieldtype === 'Date' || field.fieldtype === 'Datetime'"
      :field="field"
      :model-value="modelValue"
      :read-only="readOnly"
      :mandatory="mandatory"
      @change="onChange"
    />

    <!-- Textarea types — virtual / read-only: static text (no focus, resize, or edits) -->
    <div
      v-else-if="isTextarea && readOnly"
      class="ppv2-fd-input ppv2-fd-textarea ppv2-fd-readonly-plain"
    >{{ modelValue || "" }}</div>
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
    <div
      v-else-if="readOnly"
      class="ppv2-fd-input ppv2-fd-readonly-plain"
    >{{ modelValue ?? "" }}</div>
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
import PanelFormLinkField from "./PanelFormLinkField.vue";
import PanelFormDateTimeField from "./PanelFormDateTimeField.vue";

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { default: null },
  visible: { type: Boolean, default: true },
  mandatory: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
  /** True when current value differs from last loaded snapshot (until Submit). */
  fieldDirty: { type: Boolean, default: false },
});

const emit = defineEmits(["change", "link-change"]);

const config = computed(() => getComponentConfig(props.field));

function normFieldtype(field) {
	return String(field?.fieldtype ?? "").trim();
}

/** Select, or Autocomplete whose options are a newline-separated static list (Desk pattern). */
const useNativeSelectUi = computed(() => {
	const ft = normFieldtype(props.field).toLowerCase();
	if (ft === "select") return true;
	if (ft === "autocomplete" && (props.field.options || "").includes("\n")) return true;
	return false;
});

/** Autocomplete with one line (no newlines) — options hold target DocType name, like Link. */
const isAutocompleteLink = computed(() => {
	const ft = normFieldtype(props.field).toLowerCase();
	if (ft !== "autocomplete") return false;
	const o = (props.field.options || "").trim();
	if (!o || o.includes("\n")) return false;
	return true;
});

const isTextarea = computed(() => {
	const t = config.value?.props?.type;
	return t === "textarea";
});

const selectOptions = computed(() => {
	if (!useNativeSelectUi.value || !props.field.options) return [];
	return props.field.options
		.split("\n")
		.map((s) => s.trim())
		.filter(Boolean);
});

function onChange(value) {
  emit("change", { fieldname: props.field.fieldname, value });
}

function onLinkChangePayload(payload) {
  emit("change", payload);
  emit("link-change", payload);
}
</script>

<style scoped>
.ppv2-fd-field {
  margin-bottom: 10px;
  overflow: visible;
  position: relative;
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
.ppv2-fd-readonly-plain {
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 2.5em;
  cursor: default;
  user-select: text;
  background: var(--bg-surface);
  color: var(--text-color);
}
.ppv2-fd-readonly-plain:focus {
  outline: none;
  box-shadow: none;
}
.ppv2-fd-select {
  appearance: auto;
  -webkit-appearance: menulist;
  -moz-appearance: menulist;
  min-height: 2.25em;
  cursor: pointer;
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
/* Bold field style — mirrors Desk's bold:1 treatment */
.ppv2-fd-field-bold .ppv2-fd-label {
  font-weight: 700;
}
.ppv2-fd-field-editable .ppv2-fd-input,
.ppv2-fd-field-editable .ppv2-fd-select {
  font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-field-editable .ppv2-fd-check-row {
  font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-field-dirty .ppv2-fd-input,
.ppv2-fd-field-dirty .ppv2-fd-select,
.ppv2-fd-field-dirty .ppv2-fd-readonly-plain {
  color: #c0392b;
}
.ppv2-fd-field-dirty .ppv2-fd-link-frappe :deep(.form-control),
.ppv2-fd-field-dirty .ppv2-fd-link-frappe :deep(input) {
  color: #c0392b !important;
  font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-field-dirty .ppv2-fd-datetime-frappe :deep(.form-control),
.ppv2-fd-field-dirty .ppv2-fd-datetime-frappe :deep(input) {
  color: #c0392b !important;
  font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-field-dirty .ppv2-fd-check-row input {
  accent-color: #c0392b;
}
.ppv2-fd-field-bold .ppv2-fd-input {
  font-weight: 600;
}
</style>
