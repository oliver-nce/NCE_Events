<template>
	<div ref="containerRef" class="ppv2-script-tool-tab"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
	tab: { type: Object, required: true },
});

const containerRef = ref(null);
let _dispose = null;

onMounted(() => {
	const { tool, mountFn } = props.tab._scriptTool || {};
	if (typeof mountFn === "function" && containerRef.value) {
		// mountFn returns a disposer (see useFormClientScript.mountTool).
		// Stored so onUnmounted can detach jQuery handlers + free DOM-bound state
		// when the dialog closes or the tab is replaced on prev/next nav.
		_dispose = mountFn(tool, containerRef.value);
	}
});

onUnmounted(() => {
	if (typeof _dispose === "function") {
		try { _dispose(); } catch (e) { console.warn("[ScriptToolTab] dispose error:", e); }
		_dispose = null;
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
	border: 1px solid var(--nce-color-border, #d1d5db);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--nce-color-surface, #f9fafb);
	font-size: var(--font-size-sm);
	cursor: pointer;
}
.ppv2-script-tool-tab :deep(.ppv2-script-tool-btn:hover) {
	background: var(--nce-color-focus, #e8f0fe);
}
</style>
