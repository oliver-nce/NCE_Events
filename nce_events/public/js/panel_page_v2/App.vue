<template>
	<div class="ppv2-root">
		<PanelFloat :init-x="40" :init-y="60" :init-w="900" :init-h="550">
			<template #header>
				<PanelTable
					:title="config?.header_text || 'WP Tables'"
					:columns="[]"
					:rows="[]"
					:total="0"
					style="display:none"
				/>
			</template>
			<PanelTable
				:title="config?.header_text || 'WP Tables'"
				:columns="columns"
				:rows="rows"
				:total="total"
				:loading="loading"
				:error="error"
				@row-click="onRowClick"
			/>
			<template #footer>{{ config?.header_text || 'WP Tables' }}</template>
		</PanelFloat>

		<PanelFloat
			v-if="childPanel.doctype"
			:init-x="160"
			:init-y="160"
			:init-w="1200"
			:init-h="600"
		>
			<PanelTable
				:title="childPanel.config?.header_text || childPanel.doctype"
				:columns="childPanel.columns"
				:rows="childPanel.rows"
				:total="childPanel.total"
				:loading="childPanel.loading"
				:error="childPanel.error"
				@close="childPanel.doctype = ''"
			/>
			<template #footer>{{ childPanel.config?.header_text || childPanel.doctype }}</template>
		</PanelFloat>
	</div>
</template>

<script setup>
import { reactive, onMounted } from "vue";
import { usePanel } from "./composables/usePanel.js";
import PanelFloat from "./components/PanelFloat.vue";
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
	position: relative;
	width: 100%;
	height: calc(100vh - 60px);
}
</style>
