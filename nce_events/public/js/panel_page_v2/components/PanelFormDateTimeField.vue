<template>
	<div ref="hostRef" class="ppv2-fd-datetime-frappe" />
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, inject } from "vue";
import {
	applyVueValueToDateControl,
	createDateControlChangeHandler,
} from "../utils/frappeDateControlSync.js";

const props = defineProps({
	field: { type: Object, required: true },
	modelValue: { default: null },
	readOnly: { type: Boolean, default: false },
});

const emit = defineEmits(["change"]);

/** Mutes Frappe control echo while loader seeds formData. */
const fdSyncingFromLoad = inject("fdSyncingFromLoad", null);

const hostRef = ref(null);
let control = null;

function buildDf() {
	const fn = props.field.fieldname;
	return {
		fieldname: fn,
		fieldtype: props.field.fieldtype,
		read_only: props.readOnly ? 1 : 0,
		// Mandatory asterisk is on PanelFormField's <label> only; df.reqd would duplicate Frappe control UI.
		reqd: 0,
		hidden: 0,
		change: createDateControlChangeHandler({
			fieldname: fn,
			fdSyncingFromLoad,
			emit,
		}),
	};
}

function mountFrappeControl() {
	if (typeof frappe === "undefined" || !frappe.ui?.form?.make_control || !hostRef.value) {
		return;
	}
	const ft = props.field.fieldtype;
	if (ft !== "Date" && ft !== "Datetime") {
		return;
	}
	const fn = props.field.fieldname;
	const $host = window.$(hostRef.value);
	$host.empty();
	control = frappe.ui.form.make_control({
		parent: $host,
		df: buildDf(),
		render_input: true,
		doc: { [fn]: props.modelValue ?? "" },
	});
}

onMounted(() => {
	nextTick(() => mountFrappeControl());
});

watch(
	() => props.modelValue,
	(v) => {
		applyVueValueToDateControl(control, props.field.fieldname, v, fdSyncingFromLoad);
	},
	{ flush: "post" },
);

/** Loader seeds formData while syncing=true; Date watcher skips set_input then — re-apply once syncing ends */
watch(
	() => fdSyncingFromLoad?.value,
	(syncing) => {
		if (syncing) return;
		nextTick(() => {
			applyVueValueToDateControl(control, props.field.fieldname, props.modelValue, null);
		});
	},
);

watch(
	() => [props.readOnly, props.field.fieldtype],
	() => {
		if (!control) return;
		control.df.read_only = props.readOnly ? 1 : 0;
		control.df.reqd = 0;
		control.refresh();
	},
);

onBeforeUnmount(() => {
	if (control?.$wrapper) {
		control.$wrapper.remove();
	}
	control = null;
});
</script>

<style scoped>
.ppv2-fd-datetime-frappe {
	width: 100%;
}
.ppv2-fd-datetime-frappe :deep(.control-label),
.ppv2-fd-datetime-frappe :deep(.help-box) {
	display: none !important;
}
.ppv2-fd-datetime-frappe :deep(.frappe-control) {
	width: 100%;
	max-width: 100%;
	margin: 0;
	padding: 0;
}
.ppv2-fd-datetime-frappe :deep(.form-control),
.ppv2-fd-datetime-frappe :deep(input.form-control),
.ppv2-fd-datetime-frappe :deep(.control-value.like-disabled-input),
.ppv2-fd-datetime-frappe :deep(.control-value) {
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
</style>
