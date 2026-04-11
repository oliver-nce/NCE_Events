<template>
	<div class="ppv2-fd-body">
		<div v-if="loading" class="ppv2-fd-loading">Loading…</div>
		<div v-else-if="error" class="ppv2-fd-error">{{ error }}</div>
		<template v-else-if="tabs.length">
			<div v-if="tabs.length > 1" class="ppv2-fd-tab-bar">
				<button
					v-for="(tab, ti) in tabs"
					:key="ti"
					type="button"
					class="ppv2-fd-tab-btn"
					:class="{ 'ppv2-fd-tab-active': activeTab === ti }"
					@click="activeTab = ti"
				>
					{{ tab.label }}
				</button>
			</div>

			<div class="ppv2-fd-tab-panels">
				<div
					v-for="(tab, ti) in tabs"
					:key="ti"
					class="ppv2-fd-tab-panel"
					:class="{ 'ppv2-fd-tab-panel-active': tabs.length === 1 || activeTab === ti }"
				>
					<!-- Related DocType tab: layout from row `info` (read-only field list) -->
					<div
						v-if="tab._related && tab.sections && tab.sections.length"
						class="ppv2-fd-related-preview"
					>
						<p class="ppv2-fd-related-meta">
							{{ tab._related.doctype }}
							<span v-if="tab._related.link_field" class="ppv2-fd-related-meta-link">
								· {{ tab._related.link_field }}
							</span>
						</p>
						<p v-if="tab._related.captureError" class="ppv2-fd-related-warn">
							Schema note: {{ tab._related.captureError }}
						</p>
						<div
							v-for="(section, si) in tab.sections"
							:key="'rs' + si"
							class="ppv2-fd-section"
						>
							<h3 v-if="section.label" class="ppv2-fd-section-label">{{ section.label }}</h3>
							<div
								class="ppv2-fd-columns"
								:style="{ gridTemplateColumns: 'repeat(' + Math.max(section.columns.length, 1) + ', 1fr)' }"
							>
								<div v-for="(col, ci) in section.columns" :key="'rc' + ci">
									<div
										v-for="field in col.fields"
										:key="field.fieldname"
										class="ppv2-fd-related-field-row"
									>
										<span class="ppv2-fd-related-fn">{{ field.label || field.fieldname }}</span>
										<span class="ppv2-fd-related-ft">{{ field.fieldtype }}</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Related tab without usable layout in info -->
					<div v-else-if="tab._related" class="ppv2-fd-related-placeholder">
						<p class="ppv2-fd-related-placeholder-text">
							{{ tab._related.label || tab._related.doctype }}
						</p>
						<p v-if="tab._related.captureError" class="ppv2-fd-related-warn">
							{{ tab._related.captureError }}
						</p>
						<p v-else class="ppv2-fd-related-placeholder-sub">No field layout stored for this tab.</p>
					</div>

					<!-- Normal frozen-schema tab -->
					<template v-else>
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

							<div
								class="ppv2-fd-columns"
								:style="{ gridTemplateColumns: 'repeat(' + section.columns.length + ', 1fr)' }"
							>
								<div v-for="(col, ci) in section.columns" :key="ci">
									<PanelFormField
										v-for="field in col.fields"
										:key="field.fieldname"
										:field="field"
										:model-value="formData[field.fieldname]"
										:visible="isFieldVisible(field)"
										:mandatory="isFieldMandatory(field)"
										:read-only="isFieldReadOnly(field)"
										@change="(p) => $emit('field-change', p)"
										@link-change="(p) => $emit('link-change', p)"
									/>
								</div>
							</div>
						</div>
					</template>
				</div>
			</div>

			<div v-if="validationError" class="ppv2-fd-validation-error">
				{{ validationError }}
			</div>
		</template>
	</div>
</template>

<script setup>
import PanelFormField from "./PanelFormField.vue";

defineProps({
	loading: { type: Boolean, default: false },
	error: { type: String, default: null },
	tabs: { type: Array, default: () => [] },
	validationError: { type: String, default: null },
	formData: { type: Object, required: true },
	isFieldVisible: { type: Function, required: true },
	isFieldMandatory: { type: Function, required: true },
	isFieldReadOnly: { type: Function, required: true },
});

defineEmits(["field-change", "link-change"]);

const activeTab = defineModel("activeTab", { type: Number, required: true });
</script>

<style scoped>
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
.ppv2-fd-related-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    color: var(--text-muted);
}
.ppv2-fd-related-placeholder-text {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-related-placeholder-sub {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    margin-top: 8px;
}
.ppv2-fd-related-preview {
    padding: 4px 0 12px;
}
.ppv2-fd-related-meta {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    margin: 0 0 12px;
}
.ppv2-fd-related-meta-link {
    font-weight: normal;
}
.ppv2-fd-related-warn {
    font-size: var(--font-size-sm);
    color: #a67c00;
    margin: 0 0 12px;
}
.ppv2-fd-related-field-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 8px;
    margin-bottom: 4px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-sm, 4px);
    font-size: var(--font-size-sm);
}
.ppv2-fd-related-fn {
    color: var(--text-color);
}
.ppv2-fd-related-ft {
    color: var(--text-muted);
    flex-shrink: 0;
}
</style>
