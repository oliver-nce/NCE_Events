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
				@sheets="onSheets({ doctype: 'WP Tables', parentFilter: {}, rows })"
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
				:show-email="!!(p.config?.email_field)"
				:show-sms="!!(p.config?.sms_field)"
				@close="closePanel(p.id)"
				@drill="(ev) => onDrill(ev, p)"
				@sheets="onSheets(p)"
				@email="onEmail(p)"
				@sms="onSms(p)"
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

const OFFSET_STEP = 80;

function nextPos() {
	const n = openPanels.length;
	return { x: 140 + n * OFFSET_STEP, y: 120 + n * OFFSET_STEP };
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

function onSheets(p) {
	frappe.call({
		method: "nce_events.api.panel_api.export_panel_data",
		args: {
			root_doctype: p.doctype,
			filters: JSON.stringify(p.parentFilter || {}),
			user_filters: JSON.stringify([]),
		},
		callback(r) {
			if (!r.message) return;
			const url = window.location.origin + r.message.url;
			const formula = `=IMPORTDATA("${url}")`;
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(formula).then(() => {
					frappe.show_alert({ message: __("Link copied — paste in Google Sheets"), indicator: "green" });
				});
			} else {
				frappe.show_alert({ message: __("Exported {0} rows", [r.message.rows_exported]), indicator: "green" });
			}
		},
	});
}

let _sendDialog = null;

function _openSendDialog(p, mode) {
	const cfg = p.config;
	if (!cfg) return;
	const recipientField = mode === "sms" ? cfg.sms_field : cfg.email_field;
	if (!recipientField) {
		frappe.msgprint(__("No {0} field configured for this panel.", [mode === "sms" ? "SMS" : "Email"]));
		return;
	}
	if (!p.rows.length) { frappe.msgprint(__("No rows.")); return; }

	if (_sendDialog) { _sendDialog.close(); _sendDialog = null; }

	frappe.require([
		"/assets/nce_events/js/panel_page/sms_dialog.js",
		"/assets/nce_events/js/panel_page/email_dialog.js",
		"/assets/nce_events/css/panel_page.css",
	], () => {
		const DialogClass = mode === "sms"
			? nce_events.panel_page.SmsDialog
			: nce_events.panel_page.EmailDialog;
		_sendDialog = new DialogClass({
			doctype: p.doctype,
			config: cfg,
			filters: p.parentFilter || {},
			user_filters: [],
			row_count: p.rows.length,
			z_index: 9999,
			on_close() { _sendDialog = null; },
		});
	});
}

function onEmail(p) { _openSendDialog(p, "email"); }
function onSms(p) { _openSendDialog(p, "sms"); }
</script>

<style scoped>
.ppv2-root {
	position: relative;
	width: 100%;
	height: calc(100vh - 60px);
}
</style>
