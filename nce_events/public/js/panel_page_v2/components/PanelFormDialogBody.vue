<template>
	<div class="ppv2-fd-body">
		<div v-if="loading" class="ppv2-fd-loading theme-text-muted">Loading…</div>
		<div v-else-if="error" class="ppv2-fd-error theme-text-danger">{{ error }}</div>
		<template v-else-if="tabs.length">
			<PanelFormDialogTabBar
				:tabs="tabs"
				:active-tab="activeTab"
				:block-related-tabs="findLayoutMode"
				:show-find-help-button="findLayoutMode"
				@update:active-tab="activeTab = $event"
				@find-help="findHelpOpen = true"
			/>

			<PanelFormFindSearchHelpModal
				:open="findHelpOpen"
				@close="findHelpOpen = false"
			/>

			<div class="ppv2-fd-tab-panels">
				<div
					v-for="(tab, ti) in tabs"
					:key="ti"
					class="ppv2-fd-tab-panel"
					:class="{ 'ppv2-fd-tab-panel-active': tabs.length === 1 || activeTab === ti }"
				>
					<!-- Related DocType tab: dispatched to PanelFormDialogRelatedTab child -->
				<PanelFormDialogRelatedTab
					v-if="tab._related"
					:ref="(el) => (relatedTabRefs[ti] = el)"
					:ti="ti"
					:tab="tab"
					:definition-name="definitionName"
					:root-doctype="rootDoctype"
					:root-doc-name="rootDocName"
					:reload-tick="props.reloadTick"
					:go-to-busy="goToBusy"
					:form-data="formData"
					:original-form-data="originalFormData"
					:read-only-fields="readOnlyFields"
					@related-dirty="(v) => $emit('related-dirty', v)"
					@go-to-panel="(ev) => $emit('go-to-panel', ev)"
				/>

				<PanelFormDialogInlineChildTab
					v-else-if="tab._inlineChild"
					:tab="tab"
					:form-data="formData"
					:read-only-fields="readOnlyFields"
					:read-only-host="readOnlyHost"
				/>

					<!-- Script tool tab: full JS UI rendered by captured client script -->
					<PanelFormScriptToolTab
						v-else-if="tab._scriptTool"
						:tab="tab"
					/>

					<!-- Normal frozen-schema tab -->
					<template v-else>
						<div
							v-for="(section, si) in visibleFormDialogSections(tab.sections)"
							:key="si"
							class="ppv2-fd-section"
							:class="{ 'ppv2-fd-section-collapsible': section.collapsible }"
						>
							<button
								v-if="section.collapsible"
								type="button"
								class="ppv2-fd-section-toggle"
								:aria-expanded="!isSectionCollapsed(ti, si)"
								@click="toggleSection(ti, si)"
							>
								<i
									class="fa fa-chevron-right ppv2-fd-section-chevron"
									:class="{
										'ppv2-fd-section-chevron-open': !isSectionCollapsed(ti, si),
									}"
									aria-hidden="true"
								/>
								<span class="ppv2-fd-section-label">{{ sectionDisplayLabel(section) }}</span>
							</button>
							<h3 v-else-if="section.label" class="ppv2-fd-section-label">
								{{ section.label }}
							</h3>

							<div
								v-show="!section.collapsible || !isSectionCollapsed(ti, si)"
								class="ppv2-fd-section-body"
							>
								<p
									v-if="section.description"
									class="ppv2-fd-section-desc theme-text-muted"
								>
									{{ section.description }}
								</p>

								<div
									v-for="(row, ri) in sectionGridRows(section)"
									:key="ri"
									class="ppv2-fd-row"
									:style="{
										gridTemplateColumns:
											'repeat(' + sectionColumnCount(section) + ', 1fr)',
									}"
								>
									<template
										v-for="(field, ci) in row"
										:key="field ? field.fieldname : 'empty-' + ci"
									>
										<PanelFormField
											v-if="field"
											:field="field"
											:model-value="fieldModelValue(field)"
											:visible="isFieldVisible(field)"
											:mandatory="findLayoutMode ? false : isFieldMandatory(field)"
											:read-only="fieldReadOnlyEffective(field)"
											:find-criteria-mode="
												findLayoutMode && isFindEnterable(field)
											"
											:field-dirty="
												!findLayoutMode &&
												!fieldReadOnlyEffective(field) &&
												(props.isFieldDisplayDirty
													? props.isFieldDisplayDirty(field.fieldname)
													: isRootFieldDirty(field.fieldname))
											"
											@change="(p) => onFieldOrCriterionChange(field, p)"
											@link-change="(p) => $emit('link-change', p)"
										/>
										<div v-else class="ppv2-fd-row-empty" aria-hidden="true" />
									</template>
								</div>
							</div>
						</div>
						<div
							v-if="tab.tabGuidance && String(tab.tabGuidance).trim()"
							class="ppv2-fd-tab-guidance theme-border theme-rounded-sm"
						>
							<strong class="ppv2-fd-tab-guidance-label">Note:</strong>
							<span class="ppv2-fd-tab-guidance-text">{{ tab.tabGuidance }}</span>
						</div>
					</template>
				</div>
			</div>

			<div
				v-if="validationError"
				class="ppv2-fd-validation-error theme-text-danger theme-bg-danger-100 theme-border theme-rounded-sm"
			>
				{{ validationError }}
			</div>
		</template>
	</div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { isFindSearchableRootField } from "../utils/formDialogFindFields.js";
import {
	sectionColumnCount,
	sectionGridRows,
	visibleFormDialogSections,
} from "../utils/formDialogSectionRows.js";
import PanelFormField from "./PanelFormField.vue";
import PanelFormDialogTabBar from "./PanelFormDialogTabBar.vue";
import PanelFormDialogRelatedTab from "./PanelFormDialogRelatedTab.vue";
import PanelFormDialogInlineChildTab from "./PanelFormDialogInlineChildTab.vue";
import PanelFormScriptToolTab from "./PanelFormScriptToolTab.vue";
import PanelFormFindSearchHelpModal from "./PanelFormFindSearchHelpModal.vue";

const props = defineProps({
	definitionName: { type: String, default: "" },
	rootDoctype: { type: String, default: "" },
	rootDocName: { type: String, default: null },
	/** Bumped by host to trigger related-tab refetch without imperative calls. */
	reloadTick: { type: Number, default: 0 },
	loading: { type: Boolean, default: false },
	error: { type: String, default: null },
	tabs: { type: Array, default: () => [] },
	validationError: { type: String, default: null },
	formData: { type: Object, required: true },
	/** Snapshot after load; used for dirty highlighting on main tabs. */
	originalFormData: { type: Object, default: null },
	isFieldVisible: { type: Function, required: true },
	isFieldMandatory: { type: Function, required: true },
	isFieldReadOnly: { type: Function, required: true },
	/** Page Panel Display read_only_fields — gates related/inline grid editability. */
	readOnlyFields: { type: Array, default: () => [] },
	/** When set, field-level dirty highlight uses display baseline (not formData). */
	isFieldDisplayDirty: { type: Function, default: null },
	findLayoutMode: { type: Boolean, default: false },
	/** Reactive bag of criterion strings while ``findLayoutMode``. */
	findCriteria: { type: Object, required: true },
	/**
	 * Set of fieldnames (from panel effective_searchable) that are enterable in Find mode.
	 * null = allow all searchable fields (default / no panel context).
	 */
	findableFieldnames: { type: Object, default: null },
	/** Disable editing on inline child tabs (e.g. Find criteria mode). */
	readOnlyHost: { type: Boolean, default: false },
	goToBusy: { type: Boolean, default: false },
});

const emit = defineEmits([
	"field-change",
	"link-change",
	"related-dirty",
	"find-criteria-patch",
	"go-to-panel",
]);

const findHelpOpen = ref(false);

/** Collapsible Section Break without a Desk label. */
const COLLAPSIBLE_SECTION_FALLBACK_LABEL = "Un-named Section";

/** @type {Record<string, boolean>} true = collapsed (body hidden) */
const collapsedSections = reactive({});

watch(
	() => `${props.definitionName}|${props.rootDocName ?? ""}`,
	() => {
		for (const key of Object.keys(collapsedSections)) {
			delete collapsedSections[key];
		}
	},
);

function sectionCollapseKey(tabIdx, sectionIdx) {
	return `${tabIdx}-${sectionIdx}`;
}

function isSectionCollapsed(tabIdx, sectionIdx) {
	return collapsedSections[sectionCollapseKey(tabIdx, sectionIdx)] ?? true;
}

function toggleSection(tabIdx, sectionIdx) {
	const key = sectionCollapseKey(tabIdx, sectionIdx);
	collapsedSections[key] = !isSectionCollapsed(tabIdx, sectionIdx);
}

function sectionDisplayLabel(section) {
	const label = section?.label != null ? String(section.label).trim() : "";
	return label || COLLAPSIBLE_SECTION_FALLBACK_LABEL;
}

watch(
	() => props.findLayoutMode,
	(isFind) => {
		if (!isFind) findHelpOpen.value = false;
	},
);

function fieldModelValue(field) {
	if (props.findLayoutMode && isFindEnterable(field)) {
		const fn = field.fieldname;
		const v = props.findCriteria[fn];
		return v === undefined || v === null ? "" : v;
	}
	return props.formData[field.fieldname];
}

function isFindEnterable(field) {
	if (!isFindSearchableRootField(field)) return false;
	// If a panel context is provided, only effective_searchable fields are enterable
	if (props.findableFieldnames) return props.findableFieldnames.has(field.fieldname);
	return true;
}

function fieldReadOnlyEffective(field) {
	if (props.findLayoutMode) {
		return !isFindEnterable(field);
	}
	return props.isFieldReadOnly(field);
}

function onFieldOrCriterionChange(field, p) {
	if (props.findLayoutMode && field && isFindEnterable(field)) {
		emit("find-criteria-patch", { fieldname: p.fieldname, value: p.value });
		return;
	}
	emit("field-change", p);
}

const activeTab = defineModel("activeTab", { type: Number, required: true });

function isRootFieldDirty(fieldname) {
	const o = props.originalFormData;
	const fd = props.formData;
	if (o == null || fd == null || fieldname == null || fieldname === "") {
		return false;
	}
	return !valuesEqual(fd[fieldname], o[fieldname]);
}

function valuesEqual(a, b) {
	if (a === b) {
		return true;
	}
	if (a == null && b == null) {
		return true;
	}
	if (a == null || b == null) {
		return false;
	}
	if ((a === 0 || a === "0" || a === false) && (b === 0 || b === "0" || b === false)) {
		return true;
	}
	if ((a === 1 || a === "1" || a === true) && (b === 1 || b === "1" || b === true)) {
		return true;
	}
	return String(a) === String(b);
}

const relatedTabRefs = ref([]);

async function saveAllRelatedRows(...args) {
	const allJobIds = [];
	for (const ref of relatedTabRefs.value) {
		if (ref?.saveAllRelatedRows) {
			const ids = await ref.saveAllRelatedRows(...args);
			if (Array.isArray(ids)) allJobIds.push(...ids);
		}
	}
	return allJobIds;
}

function resetRelatedToBaseline() {
	for (const ref of relatedTabRefs.value) {
		ref?.resetRelatedToBaseline?.();
	}
}

function reloadRelatedFromServer() {
	for (const ref of relatedTabRefs.value) {
		ref?.reloadRelatedFromServer?.();
	}
}

function getRelatedRowsForTab(ti) {
	const ref = relatedTabRefs.value[ti];
	return ref?.getDisplayRows?.() ?? [];
}

defineExpose({
	saveAllRelatedRows,
	resetRelatedToBaseline,
	reloadRelatedFromServer,
	getRelatedRowsForTab,
});
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
	font-size: var(--font-size-base);
}
.ppv2-fd-error {
	text-align: center;
	padding: 32px;
	font-size: var(--font-size-base);
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
.ppv2-fd-section-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	margin: 0 0 8px;
	padding: 0;
	border: 0;
	background: transparent;
	cursor: pointer;
	text-align: left;
	font: inherit;
	color: inherit;
}
.ppv2-fd-section-toggle:focus-visible {
	outline: 2px solid var(--nce-color-primary, #2563eb);
	outline-offset: 2px;
}
.ppv2-fd-section-chevron {
	flex: 0 0 auto;
	width: 12px;
	font-size: 12px;
	line-height: 1;
	transition: transform 0.15s ease;
}
.ppv2-fd-section-chevron-open {
	transform: rotate(90deg);
}
.ppv2-fd-section-body {
	overflow: visible;
}
.ppv2-fd-section-label {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold);
	margin: 0;
}
.ppv2-fd-section-toggle .ppv2-fd-section-label {
	margin: 0;
}
.ppv2-fd-section:not(.ppv2-fd-section-collapsible) .ppv2-fd-section-label {
	margin: 0 0 8px;
}
.ppv2-fd-section-desc {
	font-size: var(--font-size-sm);
	margin: 0 0 8px;
}
.ppv2-fd-row {
	display: grid;
	gap: 12px;
	overflow: visible;
	align-items: start;
	margin-bottom: 0;
}
.ppv2-fd-row > * {
	min-width: 0;
	overflow: visible;
}
.ppv2-fd-row-empty {
	min-height: 0;
}
.ppv2-fd-tab-guidance {
	margin-top: 12px;
	padding: 10px 12px;
	font-size: var(--font-size-base);
	font-family: var(--font-family);
	background: var(--nce-color-surface, #f7fafc);
	line-height: 1.45;
}
.ppv2-fd-tab-guidance-label {
	font-weight: var(--font-weight-bold, 700);
	margin-right: 6px;
}
.ppv2-fd-tab-guidance-text {
	white-space: pre-wrap;
}
.ppv2-fd-validation-error {
	margin-top: 8px;
	padding: 8px 12px;
	font-size: var(--font-size-sm);
}
</style>
