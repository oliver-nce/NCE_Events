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
	<nav v-if="pages.length" class="ppv2-spa-nav theme-gap-sm" @mousedown.stop>
		<PanelNavButton
			v-for="page in pages"
			:key="page.page_slug"
			variant="page"
			:instance-id="'page-' + page.page_slug"
			:active="page.page_slug === currentSlug"
			:disabled="page.page_slug === currentSlug"
			:title="navTitle(page)"
			:label="page.page_title"
			@click="$emit('select', page)"
		/>
	</nav>
</template>

<script setup>
import PanelNavButton from "./PanelNavButton.vue";

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
	padding: 2px 10px;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	min-height: 100%;
	box-sizing: border-box;
}
</style>
