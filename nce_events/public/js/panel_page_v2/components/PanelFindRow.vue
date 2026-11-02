<!--
Single ppv2-find-row criterion inputs with OR label and find-perform on Enter.

code-index:begin
{
 "purpose": "Single ppv2-find-row criterion inputs with OR label and find-perform on Enter.",
 "read_when": "Changing find criterion row inputs, activate-row, or OR label display.",
 "gotchas": [],
 "keywords": ["ppv2-find-row", "criteria", "columns", "find-perform", "activate-row"],
 "format": 1
}
code-index:end
-->

<template>
	<tr class="ppv2-find-row" :class="{ 'ppv2-find-row--active': active }"
		@mousedown="onRowActivate"
	>
		<td v-for="(col, ci) in columns" :key="col.fieldname">
			<span v-if="ci === 0 && showOrLabel" class="ppv2-find-or-label">OR</span>
			<input
				:value="criteria[col.fieldname] ?? ''"
				type="text"
				class="ppv2-find-input"
				:placeholder="col.label"
				@input="onInput(col.fieldname, $event)"
				@focus="onRowActivate"
				@mousedown.stop="onRowActivate"
				@keydown.enter.prevent="$emit('find-perform')"
			/>
		</td>
	</tr>
</template>

<script setup>
const props = defineProps({
	columns: { type: Array, required: true },
	criteria: { type: Object, required: true },
	active: { type: Boolean, default: false },
	showOrLabel: { type: Boolean, default: false },
});

const emit = defineEmits(["update-criterion", "activate-row", "find-perform"]);

function onRowActivate() {
	emit("activate-row");
}

function onInput(fieldname, event) {
	emit("update-criterion", fieldname, event.target.value);
}
</script>

<style scoped>
.ppv2-find-row--active {
	background-color: var(--blue-100);
}

.ppv2-find-row td {
	padding: 2px 4px;
	border-bottom: 1px solid var(--border-color);
}

.ppv2-find-or-label {
	display: inline-block;
	margin-right: 6px;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-bold);
	vertical-align: middle;
	color: var(--gray-500);
}

.ppv2-find-input {
	width: 100%;
	box-sizing: border-box;
	padding: 2px 4px;
	font-size: calc(var(--font-size-base) + 1px);
	background-color: var(--fg-color, #ffffff);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
}

.ppv2-find-or-label + .ppv2-find-input {
	width: calc(100% - 2.2em);
	display: inline-block;
	vertical-align: middle;
}
</style>
