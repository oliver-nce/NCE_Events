<template>
	<PanelFloat :init-x="20" :init-y="60" :init-w="200" :init-h="420">
		<template #header>
			<span class="ppv2-title">Actions</span>
		</template>
		<div class="ppv2-actions-body">
			<button type="button" class="ppv2-action-btn" @click="$emit('new-woo-product')">
				New Woo Commerce Product
			</button>
		</div>
		<template #footer>Actions</template>
	</PanelFloat>
</template>

<script setup>
import PanelFloat from "./PanelFloat.vue";

defineEmits(["new-woo-product"]);
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
	color: var(--text-color);
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
</style>
