<template>
	<div ref="hostRef" class="ppv2-fd-datetime-frappe" />
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, inject } from "vue";

const props = defineProps({
	field: { type: Object, required: true },
	modelValue: { default: null },
	readOnly: { type: Boolean, default: false },
	mandatory: { type: Boolean, default: false },
});

const emit = defineEmits(["change"]);

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
	const ft = props.field.fieldtype;
	return {
		fieldname: fn,
		fieldtype: ft,
		read_only: props.readOnly ? 1 : 0,
		reqd: props.mandatory ? 1 : 0,
		hidden: 0,
		change() {
			if (fdSyncingFromLoad?.value) return;
			const v = this.get_value();
			emit("change", { fieldname: fn, value: v });
		},
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
	const $host = window.$(hostRef.value);
	$host.empty();
	control = frappe.ui.form.make_control({
		parent: $host,
		df: buildDf(),
		render_input: true,
		doc: makeDoc(),
	});
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
	() => [props.readOnly, props.mandatory, props.field.fieldtype],
	() => {
		if (!control) return;
		control.df.read_only = props.readOnly ? 1 : 0;
		control.df.reqd = props.mandatory ? 1 : 0;
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
.ppv2-fd-datetime-frappe :deep(.frappe-control) {
	width: 100%;
	max-width: 100%;
}
.ppv2-fd-datetime-frappe :deep(.form-control),
.ppv2-fd-datetime-frappe :deep(input.form-control) {
	width: 100%;
	box-sizing: border-box;
}
</style>
