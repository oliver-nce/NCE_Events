<template>
	<div ref="containerRef" class="ppv2-script-tool-tab"></div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
	tab: { type: Object, required: true },
});

const containerRef = ref(null);

onMounted(() => {
	const { tool, mountFn } = props.tab._scriptTool || {};
	if (typeof mountFn === "function" && containerRef.value) {
		mountFn(tool, containerRef.value);
	}
});
</script>

<style scoped>
.ppv2-script-tool-tab {
	padding: 16px;
}
.ppv2-script-tool-tab :deep(.ppv2-script-tool-btn) {
	margin: 4px 8px 4px 0;
	padding: 6px 14px;
	border: 1px solid var(--border-color, #d1d5db);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--control-bg, #f9fafb);
	color: var(--text-color);
	font-size: var(--font-size-sm);
	cursor: pointer;
}
.ppv2-script-tool-tab :deep(.ppv2-script-tool-btn:hover) {
	background: var(--bg-blue, #e8f0fe);
}
</style>
