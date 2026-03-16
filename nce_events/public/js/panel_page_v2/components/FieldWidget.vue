<template>
	<div class="field-widget">
		<label class="field-label" :class="{ required: fieldMeta?.reqd }">
			{{ fieldMeta?.label || config.path }}
		</label>
		<input
			v-if="inputType === 'text'"
			type="text"
			v-model="localValue"
			:readonly="!config.editable"
			class="field-input"
			@blur="onSave"
			@keydown.enter="onSave"
		/>
		<input
			v-else-if="inputType === 'number'"
			type="number"
			:step="numberStep"
			v-model="localValue"
			:readonly="!config.editable"
			class="field-input"
			@blur="onSave"
			@keydown.enter="onSave"
		/>
		<input
			v-else-if="inputType === 'date'"
			type="date"
			v-model="localValue"
			:readonly="!config.editable"
			class="field-input"
			@blur="onSave"
			@keydown.enter="onSave"
		/>
		<input
			v-else-if="inputType === 'checkbox'"
			type="checkbox"
			:checked="localValue"
			:disabled="!config.editable"
			class="field-input"
			@change="onCheckChange"
		/>
		<select
			v-else-if="inputType === 'select'"
			v-model="localValue"
			:disabled="!config.editable"
			class="field-input"
			@change="onSave"
		>
			<option value=""></option>
			<option v-for="opt in selectOptions" :key="opt" :value="opt">{{ opt }}</option>
		</select>
		<textarea
			v-else-if="inputType === 'textarea'"
			v-model="localValue"
			:readonly="!config.editable"
			class="field-input"
			rows="3"
			@blur="onSave"
		/>
		<input
			v-else
			type="text"
			v-model="localValue"
			:readonly="!config.editable"
			class="field-input"
			@blur="onSave"
			@keydown.enter="onSave"
		/>
	</div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
	config: { type: Object, required: true },
	record: { type: Object, default: null },
	meta: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["save-field"]);

const rootDoctype = computed(() => props.record?.doctype);
const fieldMeta = computed(
	() =>
		rootDoctype.value &&
		props.meta?.[rootDoctype.value]?.fields?.find((f) => f.fieldname === props.config.path)
);

const inputType = computed(() => {
	const ft = fieldMeta.value?.fieldtype || "Data";
	if (ft === "Int") return "number";
	if (ft === "Float" || ft === "Currency") return "number";
	if (ft === "Select") return "select";
	if (ft === "Date") return "date";
	if (ft === "Check") return "checkbox";
	if (["Small Text", "Text", "Text Editor"].includes(ft)) return "textarea";
	return "text";
});

const numberStep = computed(() => {
	const ft = fieldMeta.value?.fieldtype;
	return ft === "Int" ? "1" : "0.01";
});

const selectOptions = computed(() => {
	const opts = fieldMeta.value?.options;
	if (!opts || typeof opts !== "string") return [];
	return opts.split("\n").filter(Boolean);
});

const rawValue = computed(() => {
	const path = props.config.path;
	if (path?.includes(".")) return null;
	return props.record?.[path] ?? "";
});

const localValue = ref("");

watch(
	rawValue,
	(v) => {
		const val = v === null || v === undefined ? "" : String(v);
		if (fieldMeta.value?.fieldtype === "Check") {
			localValue.value = !!v && v !== "0" && v !== 0;
		} else {
			localValue.value = val;
		}
	},
	{ immediate: true }
);

function onSave() {
	if (!props.config.editable) return;
	const path = props.config.path;
	if (path?.includes(".")) return;
	const prev = rawValue.value;
	let newVal = localValue.value;
	if (fieldMeta.value?.fieldtype === "Check") {
		newVal = !!newVal ? 1 : 0;
	}
	if (String(prev) !== String(newVal)) {
		emit("save-field", { fieldname: path, value: newVal });
	}
}

function onCheckChange(e) {
	localValue.value = e.target.checked;
	onSave();
}
</script>

<style scoped>
.field-widget {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.field-label {
	font-size: var(--font-size-sm);
	color: var(--text-muted);
	margin-bottom: 2px;
}
.field-label.required::after {
	content: " *";
	color: red;
}
.field-input {
	flex: 1;
	border: 1px solid var(--input-border);
	border-radius: var(--border-radius-sm);
	padding: 4px 8px;
	font-size: var(--font-size-base);
	min-height: 28px;
}
.field-input:focus {
	border-color: var(--input-focus-border);
	outline: none;
}
.field-input[readonly],
.field-input:disabled {
	background: var(--bg-surface);
	cursor: default;
}
.field-input[type="checkbox"] {
	flex: none;
	width: auto;
	min-height: auto;
}
textarea.field-input {
	min-height: 60px;
	resize: vertical;
}
</style>
