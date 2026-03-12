<template>
	<div class="ppv2-root">
		<PanelFloat :init-x="40" :init-y="60" :init-w="900" :init-h="550">
			<PanelTable
				:title="config?.header_text || 'NCE Tables'"
				:columns="columns"
				:rows="rows"
				:total="total"
				:loading="loading"
				:error="error"
				@row-click="onRootRowClick"
			/>
			<template #footer>{{ config?.header_text || 'NCE Tables' }}</template>
		</PanelFloat>

		<PanelFloat
			v-for="p in openPanels"
			:key="p.id"
			:init-x="p.x"
			:init-y="p.y"
			:init-w="1200"
			:init-h="600"
		>
			<PanelTable
				:title="p.config?.header_text || p.doctype"
				:columns="p.columns"
				:rows="p.rows"
				:total="p.total"
				:loading="p.loading"
				:error="p.error"
				@close="closePanel(p.id)"
				@drill="(ev) => onDrill(ev, p)"
			/>
			<template #footer>{{ p.config?.header_text || p.doctype }}</template>
		</PanelFloat>
	</div>
</template>

<script setup>
import { reactive, onMounted } from "vue";
import { usePanel } from "./composables/usePanel.js";
import PanelFloat from "./components/PanelFloat.vue";
import PanelTable from "./components/PanelTable.vue";

const { config, columns, rows, total, loading, error, load } = usePanel("WP Tables");

const openPanels = reactive([]);
let panelCounter = 0;

onMounted(() => { load(); });

function nextPos() {
	return { x: 140, y: 120 };
}

async function openPanel(doctype, parentFilter = {}) {
	const existingIdx = openPanels.findIndex((p) => p.doctype === doctype);
	if (existingIdx >= 0) openPanels.splice(existingIdx, 1);

	const pos = nextPos();
	const id = ++panelCounter;
	const p = reactive({
		id,
		doctype,
		parentFilter,
		config: null,
		columns: [],
		rows: [],
		total: 0,
		loading: true,
		error: null,
		x: pos.x,
		y: pos.y,
	});
	openPanels.push(p);

	try {
		const panel = usePanel(doctype, parentFilter);
		await panel.load();
		p.config = panel.config.value;
		p.columns = panel.columns.value;
		p.rows = panel.rows.value;
		p.total = panel.total.value;
	} catch (e) {
		p.error = String(e);
	} finally {
		p.loading = false;
	}
}

function closePanel(id) {
	const idx = openPanels.findIndex((p) => p.id === id);
	if (idx >= 0) openPanels.splice(idx, 1);
}

function onRootRowClick(row) {
	const doctype = row.frappe_doctype || row.name;
	if (!doctype) return;
	openPanel(doctype);
}

function onDrill(ev, parentPanel) {
	const filter = {};
	if (ev.linkField && ev.rowName) {
		filter[ev.linkField] = ev.rowName;
	}
	openPanel(ev.doctype, filter);
}
</script>

<style scoped>
.ppv2-root {
	position: relative;
	width: 100%;
	height: calc(100vh - 60px);
}
</style>
