<template>
	<PanelFloat :init-x="8" :init-y="16" :init-w="200" :init-h="420">
		<template #header>
			<span class="ppv2-title">Actions</span>
		</template>
		<div class="ppv2-actions-body">
			<button
				v-for="a in actions"
				:key="a.action_id || a.name"
				type="button"
				class="ppv2-action-btn"
				:title="a.action_id || a.name"
				@click="$emit('select', a)"
			>
				{{ a.label }}
			</button>
			<div v-if="!actions.length" class="ppv2-actions-empty text-muted">No actions</div>
		</div>
		<template #footer>Actions</template>
	</PanelFloat>
</template>

<script setup>
import PanelFloat from "./PanelFloat.vue";

defineProps({
	actions: { type: Array, default: () => [] },
});

defineEmits(["select"]);
</script>

<style scoped>
.ppv2-actions-body {
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.ppv2-action-btn {
	width: 100%;
	padding: 10px 12px;
	font-size: var(--font-size-sm, 13px);
	font-weight: var(--font-weight-bold, 600);
	font-family: var(--font-family);
	text-align: left;
	cursor: pointer;
	border-radius: var(--border-radius-sm, 4px);
	border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border-color));
	background: color-mix(in srgb, var(--primary) 12%, var(--bg-card));
	line-height: 1.3;
	transition: background 0.15s ease, border-color 0.15s ease;
}

.ppv2-action-btn:hover {
	background: color-mix(in srgb, var(--primary) 22%, var(--bg-card));
	border-color: var(--primary);
}

.ppv2-action-btn:active {
	transform: translateY(1px);
}

.ppv2-actions-empty {
	font-size: var(--font-size-sm);
	font-style: italic;
	text-align: center;
	padding: 6px 0;
}
</style>
