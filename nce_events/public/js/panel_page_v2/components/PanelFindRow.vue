<template>
	<tr class="ppv2-find-row">
		<td v-for="col in columns" :key="col.fieldname">
			<input
				v-model="criteria[col.fieldname]"
				type="text"
				class="ppv2-find-input"
				:placeholder="col.label"
			/>
		</td>
	</tr>
</template>

<script setup>
defineProps({
	columns: { type: Array, required: true },
	criteria: { type: Object, required: true },
});
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
