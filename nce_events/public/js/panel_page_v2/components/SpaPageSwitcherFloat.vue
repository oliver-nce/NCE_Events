<template>
	<PanelFloat
		v-if="ready && pages.length"
		:init-x="anchor.x"
		:init-y="anchor.y"
		:init-w="anchor.w"
		:init-h="anchor.h"
	>
		<template #header>
			<span class="ppv2-title">{{ __("Pages") }}</span>
		</template>
		<SpaPageNavBar
			:pages="pages"
			:current-slug="pageSlug || ''"
			@select="switchTo"
		/>
		<template #footer>{{ __("Pages") }}</template>
	</PanelFloat>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from "vue";
import PanelFloat from "./PanelFloat.vue";
import SpaPageNavBar from "./SpaPageNavBar.vue";
import { useSpaPageNav } from "../composables/useSpaPageNav.js";
import { measureDeskTitleAnchor } from "../utils/measureDeskTitleAnchor.js";

const pageSlug = inject("pageSlug", null);
const { pages, loadPages, switchTo } = useSpaPageNav();

const ready = ref(false);
const anchor = reactive({ x: 280, y: 8, w: 320, h: 80 });

onMounted(async () => {
	await loadPages();
	Object.assign(anchor, measureDeskTitleAnchor());
	ready.value = true;
});
</script>
