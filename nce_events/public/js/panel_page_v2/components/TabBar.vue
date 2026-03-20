<template>
	<div v-if="showBar" class="tab-bar">
		<button
			v-for="tab in sortedTabs"
			:key="tab.label"
			:class="['tab-btn', { active: activeTab === tab.label }]"
			@click="$emit('update:activeTab', tab.label)"
		>
			{{ tab.label }}
		</button>
	</div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	tabs: { type: Array, default: () => [] },
	activeTab: { type: String, default: "" },
});

defineEmits(["update:activeTab"]);

const sortedTabs = computed(() =>
	[...(props.tabs || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
);

const showBar = computed(() => {
	const t = sortedTabs.value;
	if (t.length <= 1 && t[0]?.hide_bar) return false;
	return t.length > 1;
});
</script>

<style scoped>
.tab-bar {
	display: flex;
	gap: 0;
	border-bottom: 1px solid var(--border-color);
	margin-bottom: var(--spacing-md);
}
.tab-btn {
	padding: var(--spacing-sm) var(--spacing-lg);
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size-base);
	color: var(--text-muted);
	border-bottom: 2px solid transparent;
}
.tab-btn.active {
	color: var(--text-color);
	border-bottom-color: var(--color-primary);
	font-weight: var(--font-weight-bold);
}
.tab-btn:hover {
	color: var(--text-color);
}
</style>
