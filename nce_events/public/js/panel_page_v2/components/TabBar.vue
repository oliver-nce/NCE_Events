<!--
Panel page v2 tab bar sorting tabs by sort_order and hiding when only one tab with hide_bar.

code-index:begin
{
 "purpose": "Panel page v2 tab bar sorting tabs by sort_order and hiding when only one tab with hide_bar.",
 "read_when": "When changing panel tab navigation UI or single-tab hide_bar visibility.",
 "gotchas": [],
 "keywords": ["TabBar", "tab bar", "panel page v2", "sort_order", "hide_bar", "activeTab"],
 "format": 1
}
code-index:end
-->

<template>
	<div v-if="showBar" class="tab-bar">
		<button
			v-for="tab in sortedTabs"
			:key="tab.label"
			:class="[
				'tab-btn',
				activeTab === tab.label
					? 'tab-btn--active tab-btn--active-border'
					: 'tab-btn--inactive',
			]"
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
	border-bottom: 2px solid transparent;
}
.tab-btn--inactive {
	color: var(--gray-500);
}
.tab-btn--active {
	color: var(--text-color);
	font-weight: 700;
}
.tab-btn--active-border {
	border-bottom: 2px solid var(--blue-500);
}
.tab-btn:hover {
	color: inherit;
}
</style>
