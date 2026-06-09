<template>
	<nav v-if="pages.length" class="ppv2-spa-nav" @mousedown.stop>
		<button
			v-for="page in pages"
			:key="page.page_slug"
			type="button"
			class="ppv2-spa-nav-btn theme-border theme-rounded-sm"
			:class="
				page.page_slug === currentSlug
					? 'theme-bg-primary theme-border-primary'
					: 'theme-bg-card theme-text-primary'
			"
			:disabled="page.page_slug === currentSlug"
			:title="navTitle(page)"
			@click="$emit('select', page)"
		>
			{{ page.page_title }}
		</button>
	</nav>
</template>

<script setup>
const props = defineProps({
	pages: { type: Array, default: () => [] },
	currentSlug: { type: String, default: "" },
});

defineEmits(["select"]);

function tr(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}

function navTitle(page) {
	return page.page_slug === props.currentSlug ? tr("Current page") : page.page_title;
}
</script>

<style scoped>
.ppv2-spa-nav {
	padding: 2px var(--spacing-sm, 10px);
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
	line-height: 1.3;
	white-space: nowrap;
	transition: background-color 0.15s ease, border-color 0.15s ease;
}

.ppv2-spa-nav-btn:hover:not(:disabled) {
	background-color: var(--nce-color-primary-100, #e3f0fc);
	border-color: var(--nce-color-primary, #126bc4);
}

.ppv2-spa-nav-btn:disabled {
	cursor: default;
}
</style>
