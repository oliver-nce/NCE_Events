<template>
	<nav v-if="pages.length > 1" class="ppv2-spa-nav" @mousedown.stop>
		<button
			v-for="page in pages"
			:key="page.page_slug"
			type="button"
			class="ppv2-spa-nav-btn"
			:class="{ 'ppv2-spa-nav-btn--current': page.page_slug === currentSlug }"
			:disabled="page.page_slug === currentSlug"
			:title="page.page_slug === currentSlug ? __('Current page') : page.page_title"
			@click="$emit('select', page)"
		>
			{{ page.page_title }}
		</button>
	</nav>
</template>

<script setup>
defineProps({
	pages: { type: Array, default: () => [] },
	currentSlug: { type: String, default: "" },
});

defineEmits(["select"]);
</script>

<style scoped>
.ppv2-spa-nav {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	flex-shrink: 0;
	margin-left: var(--spacing-sm, 8px);
}

.ppv2-spa-nav-btn {
	font-size: 12px;
	line-height: 1.2;
	padding: 3px 10px;
	border-radius: var(--radius-sm, 4px);
	border: 1px solid rgba(255, 255, 255, 0.45);
	background: rgba(255, 255, 255, 0.12);
	color: var(--text-header, #fff);
	cursor: pointer;
	white-space: nowrap;
}

.ppv2-spa-nav-btn:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.28);
}

.ppv2-spa-nav-btn--current,
.ppv2-spa-nav-btn:disabled {
	opacity: 0.55;
	cursor: default;
	background: rgba(0, 0, 0, 0.15);
	border-color: rgba(255, 255, 255, 0.25);
}
</style>
