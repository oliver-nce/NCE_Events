<!--
ppv2-spa-nav button row for switching between SPA pages by page_slug.

code-index:begin
{
 "purpose": "ppv2-spa-nav button row for switching between SPA pages by page_slug.",
 "read_when": "Changing SPA nav button styling or currentSlug disabled state.",
 "gotchas": [],
 "keywords": ["ppv2-spa-nav", "pages", "currentSlug", "page_slug", "page_title"],
 "format": 1
}
code-index:end
-->

<template>
	<nav v-if="pages.length" class="ppv2-spa-nav" @mousedown.stop>
		<button
			v-for="page in pages"
			:key="page.page_slug"
			type="button"
			class="ppv2-spa-nav-btn"
			:class="
				page.page_slug === currentSlug
					? 'ppv2-spa-nav-btn--active'
					: 'ppv2-spa-nav-btn--idle'
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
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
}

.ppv2-spa-nav-btn--idle {
	background: var(--fg-color, #fff);
	color: var(--blue-500);
}

.ppv2-spa-nav-btn--active {
	background: var(--blue-500);
	border-color: var(--blue-500);
	color: #fff;
}

.ppv2-spa-nav-btn:hover:not(:disabled) {
	background-color: var(--blue-100);
	border-color: var(--blue-500);
}

.ppv2-spa-nav-btn:disabled {
	cursor: default;
}
</style>
