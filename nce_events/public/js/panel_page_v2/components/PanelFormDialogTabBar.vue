<template>
	<div v-if="tabs.length > 1 || showFindHelpButton" class="ppv2-fd-tab-bar">
		<div v-if="tabs.length > 1" class="ppv2-fd-tab-buttons">
			<button
				v-for="(tab, ti) in tabs"
				:key="ti"
				type="button"
				class="ppv2-fd-tab-btn"
				:class="{
					'ppv2-fd-tab-active theme-bg-primary theme-border-primary': activeTab === ti,
				}"
				:disabled="blockRelatedTabs && (tab._related || tab._inlineChild || tab._scriptTool)"
				@click="$emit('update:activeTab', ti)"
			>
				{{ tab.label }}
			</button>
		</div>
		<button
			v-if="showFindHelpButton"
			type="button"
			class="ppv2-fd-find-help-btn"
			@click="$emit('find-help')"
		>
			{{ helpLabelEffective }}
		</button>
	</div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	tabs: { type: Array, default: () => [] },
	activeTab: { type: Number, required: true },
	/** Disable switching into related DocType tabs (e.g. FileMaker-style find on root fields only). */
	blockRelatedTabs: { type: Boolean, default: false },
	/** Show Search Help control (Find criteria mode). */
	showFindHelpButton: { type: Boolean, default: false },
	/** Label for Help button; empty uses translated default. */
	findHelpLabel: { type: String, default: "" },
});

defineEmits(["update:activeTab", "find-help"]);

const helpLabelEffective = computed(() => {
	if (props.findHelpLabel && String(props.findHelpLabel).trim()) {
		return props.findHelpLabel;
	}
	return typeof window.__ === "function" ? window.__("Help…") : "Help…";
});
</script>

<style scoped>
.ppv2-fd-tab-bar {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border-color);
}
.ppv2-fd-tab-buttons {
	display: flex;
	flex: 1;
	flex-wrap: wrap;
	gap: 4px;
	min-width: 0;
}
.ppv2-fd-find-help-btn {
	flex-shrink: 0;
	margin-left: auto;
	padding: 6px 12px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	color: var(--primary, var(--text-color));
	font-size: var(--font-size-base, 14px);
	font-weight: var(--font-weight-bold, 600);
	cursor: pointer;
}
.ppv2-fd-find-help-btn:hover {
	background: var(--primary-light, var(--row-hover-bg, #e8f0fe));
}
.ppv2-fd-tab-btn {
	padding: 6px 14px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	font-size: var(--font-size-base, 14px);
	font-weight: var(--font-weight-bold, 600);
	cursor: pointer;
}
.ppv2-fd-tab-btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
</style>
