<template>
	<PanelFloat
		v-if="ready && pages.length"
		:init-x="anchor.x"
		:init-y="anchor.y"
		:init-w="anchor.w"
		:init-h="anchor.h"
	>
		<template #header="{ titleClasses }">
			<span class="ppv2-title" :class="titleClasses">{{ headerLabel }}</span>
		</template>
		<SpaPageNavBar
			:pages="pages"
			:current-slug="pageSlug || ''"
			@select="switchTo"
		/>
	</PanelFloat>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from "vue";
import PanelFloat from "./PanelFloat.vue";
import SpaPageNavBar from "./SpaPageNavBar.vue";
import { useSpaPageNav } from "../composables/useSpaPageNav.js";
import { measureDeskTitleAnchor } from "../utils/measureDeskTitleAnchor.js";

function tr(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}

const pageSlug = inject("pageSlug", null);
const { pages, loadPages, switchTo } = useSpaPageNav();
const headerLabel = computed(() => tr("Pages"));

const ready = ref(false);
const anchor = reactive({ x: 16, y: 4, w: 420, h: 70 });

onMounted(async () => {
	await loadPages();
	Object.assign(anchor, measureDeskTitleAnchor());
	ready.value = true;
});
</script>
