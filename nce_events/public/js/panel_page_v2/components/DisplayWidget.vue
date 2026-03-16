<template>
	<div class="display-widget">
		<label class="display-label">{{ displayLabel }}</label>
		<span class="display-value">{{ displayValue }}</span>
	</div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	config: { type: Object, required: true },
	record: { type: Object, default: null },
	resolvedHops: { type: Object, default: () => ({}) },
});

const displayValue = computed(() => {
	if (props.config.path?.includes(".")) {
		return props.resolvedHops?.[props.config.path] ?? "";
	}
	return props.record?.[props.config.path] ?? "";
});

const displayLabel = computed(() => {
	if (props.config.label) return props.config.label;
	const parts = (props.config.path || "").split(".");
	const last = parts[parts.length - 1] || props.config.path;
	return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
});
</script>

<style scoped>
.display-widget {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.display-label {
	font-size: var(--font-size-sm);
	color: var(--text-muted);
	margin-bottom: 2px;
}
.display-value {
	background: var(--bg-surface);
	padding: 4px 8px;
	border-radius: var(--border-radius-sm);
	flex: 1;
	font-size: var(--font-size-base);
}
</style>
