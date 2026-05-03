<template>
	<div v-if="tabs.length > 1" class="ppv2-fd-tab-bar">
		<button
			v-for="(tab, ti) in tabs"
			:key="ti"
			type="button"
			class="ppv2-fd-tab-btn"
			:class="{ 'ppv2-fd-tab-active': activeTab === ti }"
			@click="$emit('update:activeTab', ti)"
		>
			{{ tab.label }}
		</button>
	</div>
</template>

<script setup>
const props = defineProps({
	tabs: { type: Array, default: () => [] },
	activeTab: { type: Number, required: true },
});

defineEmits(["update:activeTab"]);
</script>

<style scoped>
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
</style>
