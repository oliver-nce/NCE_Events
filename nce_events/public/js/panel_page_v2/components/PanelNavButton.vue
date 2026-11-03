<!--
Shared nav/action button for SPA page switcher, panel actions, and workspace back link.

code-index:begin
{
 "purpose": "Shared nav/action button for SPA page switcher, panel actions, and workspace back link.",
 "read_when": "Changing panel nav button styling, frappe-ui Button wrapper, or theme class recipe.",
 "gotchas": [
  "frappe-ui Button adds Tailwind utility class names that are mostly inert but can conflict with Desk/Bootstrap; theme- classes handle states.",
  "Active page variant uses theme-bg-primary pairing; do not set hard-coded text colour on active state."
 ],
 "keywords": ["ppv2-nav-btn", "PanelNavButton", "frappe-ui", "appearance", "theme-bg-primary"],
 "format": 1
}
code-index:end
-->

<template>
	<!-- One static class attribute per variant so the Themes scanner (Design Mode) sees each
	     button as its own element with its own selector class (last token). -->
	<Button
		v-if="variant === 'back'"
		appearance="theme"
		class="ppv2-nav-btn theme-border theme-rounded-sm theme-btn-md theme-font-sans theme-bg-card theme-text-primary theme-hover-bg-primary theme-hover-border-primary theme-focus-ring theme-pressed theme-font-semibold theme-disabled-auto ppv2-workspace-btn"
		:label="label"
		:disabled="disabled"
		:title="title"
		:data-nce-instance="instanceAttr"
		@click="emit('click')"
	/>
	<Button
		v-else-if="variant === 'page' && active"
		appearance="theme"
		class="ppv2-nav-btn theme-border theme-rounded-sm theme-btn-md theme-font-sans theme-bg-primary theme-border-primary theme-focus-ring theme-font-semibold ppv2-page-btn-current"
		:label="label"
		:disabled="disabled"
		:title="title"
		:data-nce-instance="instanceAttr"
		@click="emit('click')"
	/>
	<Button
		v-else-if="variant === 'page'"
		appearance="theme"
		class="ppv2-nav-btn theme-border theme-rounded-sm theme-btn-md theme-font-sans theme-bg-card theme-text-primary theme-hover-bg-primary theme-hover-border-primary theme-focus-ring theme-pressed theme-font-semibold theme-disabled-auto ppv2-page-btn"
		:label="label"
		:disabled="disabled"
		:title="title"
		:data-nce-instance="instanceAttr"
		@click="emit('click')"
	/>
	<Button
		v-else
		appearance="theme"
		class="ppv2-nav-btn theme-border theme-rounded-sm theme-btn-md theme-font-sans theme-bg-card theme-text-primary theme-hover-bg-primary theme-hover-border-primary theme-focus-ring theme-pressed theme-font-semibold theme-disabled-auto ppv2-action-btn"
		:label="label"
		:disabled="disabled"
		:title="title"
		:data-nce-instance="instanceAttr"
		@click="emit('click')"
	/>
</template>

<script setup>
import { computed } from "vue";
import Button from "frappe-ui/src/components/Button.vue";

const props = defineProps({
	label: { type: String, default: "" },
	variant: {
		type: String,
		default: "action",
		validator: (v) => ["action", "page", "back"].includes(v),
	},
	active: { type: Boolean, default: false },
	disabled: { type: Boolean, default: false },
	title: { type: String, default: undefined },
	instanceId: { type: String, default: "" },
});

const instanceAttr = computed(() => {
	if (!props.instanceId) return undefined;
	const sanitized = props.instanceId.replace(/[^a-zA-Z0-9_-]/g, "_");
	return ("ppv2nav-" + sanitized).slice(0, 64);
});

const emit = defineEmits(["click"]);
</script>

<style scoped>
button.ppv2-nav-btn {
	white-space: nowrap;
	cursor: pointer;
}

button.ppv2-page-btn-current:disabled {
	/* frappe-ui adds opacity-50 to disabled buttons, which washes out the selected page's primary fill. */
	opacity: 1;
	cursor: default;
	pointer-events: none;
}
</style>
