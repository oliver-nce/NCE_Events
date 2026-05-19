<template>
	<nav v-if="pages.length" class="ppv2-spa-nav" @mousedown.stop>
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
	padding: var(--spacing-sm, 12px);
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-sm, 10px);
	min-height: 100%;
	box-sizing: border-box;
}

.ppv2-spa-nav-btn {
	padding: 8px 12px;
	font-size: var(--font-size-sm, 13px);
	font-weight: var(--font-weight-bold, 600);
	font-family: var(--font-family);
	text-align: center;
	cursor: pointer;
	border-radius: var(--border-radius-sm, 4px);
	border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border-color));
	background: color-mix(in srgb, var(--primary) 12%, var(--bg-card));
	color: var(--text-color);
	line-height: 1.3;
	white-space: nowrap;
	transition: background 0.15s ease, border-color 0.15s ease;
}

.ppv2-spa-nav-btn:hover:not(:disabled) {
	background: color-mix(in srgb, var(--primary) 22%, var(--bg-card));
	border-color: var(--primary);
}

.ppv2-spa-nav-btn--current,
.ppv2-spa-nav-btn:disabled {
	opacity: 0.55;
	cursor: default;
}
</style>
