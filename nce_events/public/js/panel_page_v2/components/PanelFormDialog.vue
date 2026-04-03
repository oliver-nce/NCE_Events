<template>
  <div v-if="open" class="ppv2-form-dialog-backdrop" @click.self="onCancel">
    <div class="ppv2-form-dialog" :class="'ppv2-fd-size-' + form.dialogSize.value">
      <!-- Header -->
      <div class="ppv2-fd-header">
        <div class="ppv2-fd-header-main">
          <div v-if="rowNavEnabled" class="ppv2-fd-nav" @mousedown.stop>
            <button
              type="button"
              class="ppv2-fd-nav-btn"
              :disabled="!canNavigatePrev"
              title="Previous record (panel list) — Alt+←"
              aria-label="Previous record"
              @click="onNavPrevClick"
            >
              <i class="fa fa-chevron-left"></i>
            </button>
            <span v-if="rowNavLabel" class="ppv2-fd-nav-pos">{{ rowNavLabel }}</span>
            <button
              type="button"
              class="ppv2-fd-nav-btn"
              :disabled="!canNavigateNext"
              title="Next record (panel list) — Alt+→"
              aria-label="Next record"
              @click="onNavNextClick"
            >
              <i class="fa fa-chevron-right"></i>
            </button>
          </div>
          <span class="ppv2-fd-title">{{ form.dialogTitle.value }}</span>
        </div>
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
            type="button"
            class="ppv2-fd-tab-btn"
            @click="onPlaceholderButton(btn)"
          >{{ btn.label }}</button>
        </div>

        <div class="ppv2-fd-action-buttons">
          <button type="button" class="ppv2-fd-tab-btn" @click="onCancel">Cancel</button>
          <button
            type="button"
            class="ppv2-fd-tab-btn ppv2-fd-tab-active"
            :disabled="form.saving.value"
            @click="onSubmit"
          >{{ form.saving.value ? 'Saving…' : 'Submit' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, toRef } from "vue";
import PanelFormField from "./PanelFormField.vue";
import { usePanelFormDialog } from "../composables/usePanelFormDialog.js";

function __(t) {
	return typeof window.__ === "function" ? window.__(t) : t;
}

const props = defineProps({
  open: { type: Boolean, default: false },
  definitionName: { type: String, required: true },
  doctype: { type: String, required: true },
  docName: { type: String, default: null },
  /** Prev/next within the panel table row list (not child tables). */
  rowNavEnabled: { type: Boolean, default: false },
  canNavigatePrev: { type: Boolean, default: false },
  canNavigateNext: { type: Boolean, default: false },
  rowNavLabel: { type: String, default: "" },
});

const emit = defineEmits(["close", "saved", "nav-prev", "nav-next"]);

const activeTab = ref(0);

const form = usePanelFormDialog({
	definitionName: toRef(props, "definitionName"),
	doctype: toRef(props, "doctype"),
	docName: toRef(props, "docName"),
});

function confirmDiscardIfDirty(proceed) {
	if (!form.isDirty.value) {
		proceed();
		return;
	}
	const msg = __(
		"You have unsaved changes. Discard them and continue?",
	);
	if (typeof frappe !== "undefined" && frappe.confirm) {
		frappe.confirm(msg, () => proceed(), () => {});
	} else if (window.confirm(msg)) {
		proceed();
	}
}

// Open/close, doc row, or definition change → load (no full remount on row nav)
watch(
	() => ({
		open: props.open,
		docName: props.docName,
		definitionName: props.definitionName,
		doctype: props.doctype,
	}),
	(cur, prev) => {
		if (!cur.open) {
			window.removeEventListener("keydown", onFormDialogKeydown, true);
			form.resetWhenClosed();
			return;
		}
		window.removeEventListener("keydown", onFormDialogKeydown, true);
		window.addEventListener("keydown", onFormDialogKeydown, true);

		const wasOpen = prev?.open;
		const opening = !wasOpen;
		const contextChanged =
			opening ||
			cur.docName !== prev?.docName ||
			cur.definitionName !== prev?.definitionName ||
			cur.doctype !== prev?.doctype;
		if (contextChanged) {
			if (opening || cur.docName !== prev?.docName) {
				activeTab.value = 0;
			}
			form.load();
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	window.removeEventListener("keydown", onFormDialogKeydown, true);
	form.resetWhenClosed();
});

function onFieldChange({ fieldname, value }) {
  form.formData[fieldname] = value;
}

async function onLinkChange({ fieldname, value }) {
  form.formData[fieldname] = value;
  await form.handleFetchFrom(fieldname, value);
}

function onCancel() {
	confirmDiscardIfDirty(() => {
		form.revert();
		emit("close");
	});
}

function onNavPrevClick() {
	if (!props.canNavigatePrev) return;
	confirmDiscardIfDirty(() => emit("nav-prev"));
}

function onNavNextClick() {
	if (!props.canNavigateNext) return;
	confirmDiscardIfDirty(() => emit("nav-next"));
}

function onFormDialogKeydown(e) {
	if (!props.open) return;
	if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
	if (e.key === "ArrowLeft" && props.canNavigatePrev) {
		e.preventDefault();
		onNavPrevClick();
	} else if (e.key === "ArrowRight" && props.canNavigateNext) {
		e.preventDefault();
		onNavNextClick();
	}
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
  gap: 12px;
  flex-shrink: 0;
}
.ppv2-fd-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.ppv2-fd-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.ppv2-fd-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--text-header) 28%, transparent);
  border-radius: var(--border-radius-sm, 4px);
  background: color-mix(in srgb, var(--text-header) 10%, transparent);
  color: var(--text-header);
  cursor: pointer;
  font-size: 12px;
}
.ppv2-fd-nav-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-header) 18%, transparent);
}
.ppv2-fd-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ppv2-fd-nav-pos {
  font-size: 12px;
  font-weight: var(--font-weight-bold, 600);
  opacity: 0.95;
  min-width: 3.2em;
  text-align: center;
  user-select: none;
}
.ppv2-fd-title {
  font-weight: var(--font-weight-bold);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  overflow-x: hidden;
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
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm, 4px);
  background: var(--bg-card);
  color: var(--text-color);
  font-size: var(--font-size-base, 14px);
  font-weight: var(--font-weight-bold, 600);
  cursor: pointer;
}
.ppv2-fd-tab-active {
  background: var(--bg-header);
  color: var(--text-header);
  border-color: var(--bg-header);
}
.ppv2-fd-tab-panels {
  display: grid;
  overflow: visible;
}
.ppv2-fd-tab-panel {
  grid-area: 1 / 1;
  visibility: hidden;
  pointer-events: none;
  overflow: visible;
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
  overflow: visible;
}
.ppv2-fd-columns > div {
  min-width: 0;
  overflow: visible;
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
.ppv2-fd-action-buttons .ppv2-fd-tab-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
