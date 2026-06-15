<template>
  <div ref="hostRef" class="ppv2-fd-link-frappe" />
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, inject } from "vue";

const props = defineProps({
	field: { type: Object, required: true },
	modelValue: { default: null },
	readOnly: { type: Boolean, default: false },
});

const emit = defineEmits(["change", "link-change"]);

// Injected directly from PanelFormDialog — raw ref, no prop cycle delay.
const fdSyncingFromLoad = inject("fdSyncingFromLoad", null);

const hostRef = ref(null);
let control = null;

function makeDoc() {
	const fn = props.field.fieldname;
	return { [fn]: props.modelValue ?? "" };
}

function buildDf() {
	const fn = props.field.fieldname;
	return {
		fieldname: fn,
		fieldtype: "Link",
		options: props.field.options || "",
		read_only: props.readOnly ? 1 : 0,
		// Mandatory asterisk is shown on PanelFormField's <label> only; reqd on df would duplicate Desk chrome.
		reqd: 0,
		hidden: 0,
		change() {
			if (fdSyncingFromLoad?.value) return;
			const v = this.get_value();
			emit("change", { fieldname: fn, value: v });
			emit("link-change", { fieldname: fn, value: v });
		},
	};
}

function mountFrappeControl() {
	if (typeof frappe === "undefined" || !frappe.ui?.form?.make_control || !hostRef.value) {
		return;
	}
	const $host = window.$(hostRef.value);
	$host.empty();
	control = frappe.ui.form.make_control({
		parent: $host,
		df: buildDf(),
		render_input: true,
		doc: makeDoc(),
	});

	// Begins-with filter: show only dropdown items whose label starts with the
	// typed text (server still fetches using contains, so this is client-side).
	// Action items (Create new, Advanced Search) always pass through.
	if (control.awesomplete) {
		control.awesomplete.filter = function (item, input) {
			if (item && item.action) return true;
			const label = (
				typeof item === "object" ? item.label || item.value || "" : item
			).toString();
			const q = (input || "").trim();
			if (!q) return true;
			return label.toLowerCase().startsWith(q.toLowerCase());
		};
	}

	// Advanced Search propagation: frappe.ui.form.LinkSelector selects a value
	// by calling set_input(value) + $input.trigger("change") when the control
	// has no .doctype (our case — no frm passed). That raw change event bypasses
	// df.change, so Vue never sees the update. Forward it here.
	if (control.$input) {
		const fn = props.field.fieldname;
		control.$input.on("change.pfl_adv", function () {
			if (fdSyncingFromLoad?.value) return;
			const v = control.get_value();
			emit("change", { fieldname: fn, value: v });
			emit("link-change", { fieldname: fn, value: v });
		});

		// Open the dropdown immediately on focus showing the full option list.
		// Clearing the input text before triggering fetches with an empty query
		// so Awesomplete returns all options, not just matches for the current value.
		control.$input.on("focus.pfl_dd", function () {
			$(this).val("").trigger("input");
		});
	}
}

onMounted(() => {
	nextTick(() => mountFrappeControl());
});

watch(
	() => props.modelValue,
	(v) => {
		if (!control?.set_value) return;
		const cur = control.get_value();
		if (String(cur ?? "") !== String(v ?? "")) {
			control.set_value(v ?? "", true);
		}
	},
);

watch(
	() => props.readOnly,
	() => {
		if (!control) return;
		control.df.read_only = props.readOnly ? 1 : 0;
		control.df.reqd = 0;
		control.refresh();
	},
);

onBeforeUnmount(() => {
	control?.$input?.off("change.pfl_adv focus.pfl_dd");
	if (control?.$wrapper) {
		control.$wrapper.remove();
	}
	control = null;
});
</script>

<style scoped>
/* Awesomplete anchors to this box so the list matches the input width (grid columns). */
.ppv2-fd-link-frappe {
	width: 100%;
	position: relative;
	z-index: 5;
	overflow: visible;
}
.ppv2-fd-link-frappe :deep(.frappe-control) {
	width: 100%;
	max-width: 100%;
	overflow: visible;
	margin: 0;
	padding: 0;
}
.ppv2-fd-link-frappe :deep(.control-input),
.ppv2-fd-link-frappe :deep(.control-value) {
	overflow: visible;
}
.ppv2-fd-link-frappe :deep(.control-label),
.ppv2-fd-link-frappe :deep(.help-box) {
	display: none !important;
}
.ppv2-fd-link-frappe :deep(.link-field) {
	width: 100%;
	position: relative;
}
.ppv2-fd-link-frappe :deep(.link-field .form-control),
.ppv2-fd-link-frappe :deep(.control-value.like-disabled-input),
.ppv2-fd-link-frappe :deep(.control-value) {
	width: 100%;
	min-height: 2.25em;
	padding: 5px 8px;
	box-sizing: border-box;
	border: var(--nce-border-width, 1px) solid var(--nce-color-border);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--nce-color-surface);
	font-size: var(--font-size-base);
	font-family: var(--font-family);
	line-height: 1.4;
}
.ppv2-fd-link-frappe :deep(.awesomplete) {
	display: block;
	width: 100%;
}
.ppv2-fd-link-frappe :deep(.awesomplete > ul) {
	position: absolute;
	left: 0 !important;
	right: 0 !important;
	width: 100% !important;
	min-width: 100% !important;
	max-width: 100%;
	box-sizing: border-box;
	margin: 2px 0 0;
	z-index: 100;
}
</style>
