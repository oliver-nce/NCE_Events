<template>
	<div ref="containerRef" class="ppv2-native-form-tab"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, inject } from "vue";
import { ppv2DebugWarn } from "../utils/ppv2Debug.js";

const props = defineProps({
	/** 'details' | 'inline_child' */
	mode: { type: String, required: true },
	/** For inline_child: parent table fieldname (e.g. table_access). For details: fieldname to hide. */
	focusFieldname: { type: String, default: "" },
	/** Only reparent the shared frm when this tab panel is active. */
	isActive: { type: Boolean, default: false },
	/** For details mode: all inline table fieldnames to hide. */
	hideFieldnames: { type: Array, default: () => [] },
});

const containerRef = ref(null);
const nativeFormHost = inject("nativeFormHost", null);
const nativeFormReady = inject("nativeFormReady", ref(false));

function remount() {
	if (
		!props.isActive ||
		!nativeFormReady.value ||
		!nativeFormHost?.mountTo ||
		!containerRef.value
	) {
		return;
	}
	try {
		nativeFormHost.mountTo(containerRef.value, {
			mode: props.mode,
			focusFieldname: String(props.focusFieldname || "").trim(),
			hideFieldnames: props.hideFieldnames,
		});
	} catch (e) {
		ppv2DebugWarn("[NativeFormTab] mount error:", e);
	}
}

watch(
	() => [props.isActive, nativeFormReady.value, props.mode, props.focusFieldname, props.hideFieldnames],
	() => remount(),
);

onMounted(() => {
	remount();
});

onUnmounted(() => {
	if (containerRef.value) {
		containerRef.value.innerHTML = "";
	}
});
</script>

<style scoped>
.ppv2-native-form-tab {
	min-height: 200px;
	max-height: 60vh;
	overflow: auto;
	padding: 4px 0;
}
.ppv2-native-form-tab :deep(.form-layout) {
	margin: 0;
}
.ppv2-native-form-tab :deep(.page-actions),
.ppv2-native-form-tab :deep(.standard-actions) {
	display: none !important;
}
</style>
