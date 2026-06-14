<template>
	<div class="ppv2-actions-bar-inner theme-bg-card">
		<SpaPageNavBar
			v-if="pages.length"
			class="ppv2-actions-pages"
			:pages="pages"
			:current-slug="pageSlug || ''"
			@select="switchTo"
		/>
		<div v-if="pages.length && actions.length" class="ppv2-actions-sep" aria-hidden="true" />
		<div class="ppv2-actions-list">
			<button
				v-for="a in actions"
				:key="a.action_id || a.name"
				type="button"
				class="ppv2-action-btn theme-bg-card theme-border theme-rounded-sm theme-text-primary"
				:title="a.action_id || a.name"
				@click="$emit('select', a)"
			>
				{{ a.label }}
			</button>
			<div v-if="!actions.length && !pages.length" class="ppv2-actions-empty theme-text-muted">
				No actions
			</div>
		</div>
	</div>
</template>

<script setup>
import { inject, onMounted } from "vue";
import SpaPageNavBar from "./SpaPageNavBar.vue";
import { useSpaPageNav } from "../composables/useSpaPageNav.js";

defineProps({
	actions: { type: Array, default: () => [] },
});

defineEmits(["select"]);

const pageSlug = inject("pageSlug", null);
const { pages, loadPages, switchTo } = useSpaPageNav();

onMounted(() => {
	loadPages();
});
</script>

<style scoped>
.ppv2-actions-bar-inner {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-sm, 10px);
	padding: 8px 12px;
	box-sizing: border-box;
	min-height: 48px;
	border-bottom: 1px solid var(--nce-color-border, #d1d5db);
}

.ppv2-actions-pages {
	flex-shrink: 0;
	padding: 0;
	min-height: 0;
}

.ppv2-actions-pages :deep(.ppv2-spa-nav) {
	padding: 0;
	min-height: 0;
}

.ppv2-actions-sep {
	width: 1px;
	align-self: stretch;
	min-height: 28px;
	background: var(--nce-color-border, #d1d5db);
	flex-shrink: 0;
}

.ppv2-actions-list {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-sm, 10px);
	flex: 1 1 auto;
	min-width: 0;
}

.ppv2-action-btn {
	padding: 8px 12px;
	font-size: var(--font-size-sm, 13px);
	font-weight: var(--font-weight-bold, 600);
	font-family: var(--font-family);
	text-align: center;
	cursor: pointer;
	line-height: 1.3;
	white-space: nowrap;
	transition: background-color 0.15s ease, border-color 0.15s ease;
}

.ppv2-action-btn:hover {
	background-color: var(--nce-color-primary-100, #e3f0fc);
	border-color: var(--nce-color-primary, #126bc4);
}

.ppv2-action-btn:active {
	transform: translateY(1px);
}

.ppv2-actions-empty {
	font-size: var(--font-size-sm);
	font-style: italic;
	padding: 4px 0;
}
</style>
