<template>
	<tr class="ppv2-find-row">
		<td v-for="col in columns" :key="col.fieldname">
			<input
				:value="criteria[col.fieldname] ?? ''"
				type="text"
				class="ppv2-find-input"
				:placeholder="col.label"
				@input="onInput(col.fieldname, $event)"
				@keydown.enter.prevent="$emit('find-perform')"
			/>
		</td>
	</tr>
</template>

<script setup>
const props = defineProps({
	columns: { type: Array, required: true },
	criteria: { type: Object, required: true },
});

const emit = defineEmits(["update-criterion", "find-perform"]);

function onInput(fieldname, event) {
	emit("update-criterion", fieldname, event.target.value);
}
</script>

<style scoped>
.ppv2-find-row td {
	padding: 2px 4px;
	border-bottom: 1px solid var(--border-color);
}

.ppv2-find-input {
	width: 100%;
	box-sizing: border-box;
	padding: 2px 4px;
	font-size: calc(var(--font-size-base) + 1px);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	background: var(--bg-card);
}
</style>
