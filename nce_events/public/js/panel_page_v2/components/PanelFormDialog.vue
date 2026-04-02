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

          <!-- Tab content — all tabs stay rendered to maintain stable height -->
          <div class="ppv2-fd-tab-panels">
          <div
            v-for="(tab, ti) in form.tabs.value"
            :key="ti"
            class="ppv2-fd-tab-panel"
            :class="{ 'ppv2-fd-tab-panel-active': form.tabs.value.length === 1 || activeTab === ti }"
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
    // Writeback BEFORE save: push user-edited fetch_from values to source
    // documents first, so Frappe's server-side re-fetch picks them up.
    const defn = form.definition.value;
    let writtenBack = 0;
    if (defn && defn.writeback_on_submit) {
      writtenBack = await form.writebackBeforeSave();
    }

    const result = await form.save();
    emit("saved", result);
    emit("close");

    if (writtenBack > 0) {
      frappe.show_alert({
        message: writtenBack + " field(s) written back",
        indicator: "green",
      });
    }
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
.ppv2-fd-tab-panels {
  display: grid;
}
.ppv2-fd-tab-panel {
  grid-area: 1 / 1;
  visibility: hidden;
  pointer-events: none;
}
.ppv2-fd-tab-panel-active {
  visibility: visible;
  pointer-events: auto;
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
