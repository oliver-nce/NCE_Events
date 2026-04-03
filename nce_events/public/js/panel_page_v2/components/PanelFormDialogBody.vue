<template>
	<div class="ppv2-fd-body">
		<div v-if="error" class="ppv2-fd-error">{{ error }}</div>
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
</style>
