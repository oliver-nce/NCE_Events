<template>
	<div class="ppv2-root">
		<PanelTable
			:title="config?.header_text || 'WP Tables'"
			:columns="columns"
			:rows="rows"
			:total="total"
			:loading="loading"
			:error="error"
			:width="900"
			@row-click="onRowClick"
		/>

		<PanelTable
			v-if="childPanel.columns.length"
			:title="childPanel.config?.header_text || childPanel.doctype"
			:columns="childPanel.columns"
			:rows="childPanel.rows"
			:total="childPanel.total"
			:loading="childPanel.loading"
			:error="childPanel.error"
			:width="1200"
		/>
	</div>
</template>

<script setup>
import { reactive, onMounted } from "vue";
import { usePanel } from "./composables/usePanel.js";
import PanelTable from "./components/PanelTable.vue";

const { config, columns, rows, total, loading, error, load } = usePanel("WP Tables");

const childPanel = reactive({
	doctype: "",
	config: null,
	columns: [],
	rows: [],
	total: 0,
	loading: false,
	error: null,
});

onMounted(() => {
	load();
});

async function onRowClick(row) {
	const doctype = row.frappe_doctype || row.name;
	if (!doctype) return;

	childPanel.doctype = doctype;
	childPanel.loading = true;
	childPanel.error = null;
	childPanel.columns = [];
	childPanel.rows = [];

	try {
		const child = usePanel(doctype);
		await child.load();
		childPanel.config = child.config.value;
		childPanel.columns = child.columns.value;
		childPanel.rows = child.rows.value;
		childPanel.total = child.total.value;
	} catch (e) {
		childPanel.error = String(e);
	} finally {
		childPanel.loading = false;
	}
}
</script>

<style scoped>
.ppv2-root {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}
</style>
