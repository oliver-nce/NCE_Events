<!--
Vue actions bar combining SpaPageNavBar page switcher and Panel Action buttons.

code-index:begin
{
 "purpose": "Vue actions bar combining SpaPageNavBar page switcher and Panel Action buttons.",
 "read_when": "Changing actions bar layout, SPA nav integration, or action button clicks.",
 "gotchas": [],
 "keywords": ["ppv2-actions", "SpaPageNavBar", "useSpaPageNav", "action_id", "loadPages", "logout"],
 "format": 1
}
code-index:end
-->

<template>
	<div class="ppv2-actions-bar-inner theme-bg-card theme-gap-sm">
		<PanelNavButton
			v-if="canGoWorkspace"
			variant="back"
			instance-id="workspace"
			label="‹ Workspace"
			title="Back to workspace"
			@click="goWorkspace"
		/>
		<SpaPageNavBar
			v-if="pages.length"
			class="ppv2-actions-pages"
			:pages="pages"
			:current-slug="pageSlug || ''"
			@select="switchTo"
		/>
		<div v-if="pages.length && actions.length" class="ppv2-actions-sep" aria-hidden="true" />
		<div class="ppv2-actions-list theme-gap-sm">
			<PanelNavButton
				v-for="a in actions"
				:key="a.action_id || a.name"
				variant="action"
				:instance-id="'action-' + (a.action_id || a.name)"
				:label="a.label"
				:title="a.action_id || a.name"
				@click="$emit('select', a)"
			/>
			<div
				v-if="!actions.length && !pages.length"
				class="ppv2-actions-empty theme-text-muted theme-text-sm"
			>
				No actions
			</div>
		</div>
		<PanelNavButton
			v-if="!canGoWorkspace"
			class="ppv2-actions-logout"
			variant="action"
			instance-id="logout"
			label="Logout"
			title="Log out"
			@click="logout"
		/>
	</div>
</template>

<script setup>
import { computed, inject, onMounted } from "vue";
import SpaPageNavBar from "./SpaPageNavBar.vue";
import PanelNavButton from "./PanelNavButton.vue";
import { useSpaPageNav } from "../composables/useSpaPageNav.js";
import { canSeeWorkspace } from "../utils/canSeeWorkspace.js";

defineProps({
	actions: { type: Array, default: () => [] },
});

defineEmits(["select"]);

const pageSlug = inject("pageSlug", null);

/** Display gate only (Desk routes are role-protected server-side): Administrator, Manager, System Manager. */
const canGoWorkspace = computed(() => canSeeWorkspace());

function goWorkspace() {
	window.frappe.set_route("Workspaces", "NCE Events");
}

function logout() {
	if (
		window.frappe &&
		window.frappe.app &&
		typeof window.frappe.app.logout === "function"
	) {
		window.frappe.app.logout();
	} else {
		window.frappe.call({
			method: "logout",
			callback(r) {
				if (!r.exc) window.location.href = "/login";
			},
		});
	}
}

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
	padding: 8px 12px;
	box-sizing: border-box;
	min-height: 48px;
	border-bottom: var(--nce-border-width) solid var(--nce-color-border);
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
	background: var(--nce-color-border);
	flex-shrink: 0;
}

.ppv2-actions-list {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.ppv2-actions-empty {
	font-style: italic;
	padding: 4px 0;
}

.ppv2-actions-logout {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
