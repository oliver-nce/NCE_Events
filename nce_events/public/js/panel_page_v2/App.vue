<template>
	<div class="ppv2-root">
		<PanelFloat :init-x="40" :init-y="60" :init-w="900" :init-h="550">
			<PanelTable
				:title="config?.header_text || 'NCE Tables'"
				:columns="columns"
				:rows="rows"
				:total="fullTotal"
				:loading="loading"
				:error="error"
				:config="config || {}"
				@row-click="onRootRowClick"
				@sheets="onSheets({ doctype: 'WP Tables', parentFilter: {}, rows })"
				@filter-change="(f) => onFilterChange(null, f)"
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
				:total="p.fullTotal"
				:loading="p.loading"
				:error="p.error"
				:config="p.config || {}"
				:show-email="!!(p.config?.email_field)"
				:show-sms="!!(p.config?.sms_field)"
				@close="closePanel(p.id)"
				@row-click="(row) => onDrilledRowClick(p, row)"
				@drill="(ev) => onDrill(ev, p)"
				@sheets="onSheets(p)"
				@email="onEmail(p)"
				@sms="onSms(p)"
				@tags="openTagFinder(p)"
				@filter-change="(f) => onFilterChange(p, f)"
				@email-one="(row) => onEmailOne(p, row)"
				@sms-one="(row) => onSmsOne(p, row)"
			/>
			<template #footer>{{ p.config?.header_text || p.doctype }}</template>
		</PanelFloat>

		<TagFinder
			v-if="tagFinderDoctype"
			:root-doctype="tagFinderDoctype"
			:init-x="tagFinderX"
			:init-y="tagFinderY"
			@close="tagFinderDoctype = ''"
		/>

		<CardModal
			v-for="(card, i) in cardStack"
			:key="'card-' + card.id"
			:card-def-name="card.cardDefName"
			:doctype="card.doctype"
			:record-name="card.recordName"
			:style="{ zIndex: 1000 + i }"
			@open-card="onOpenCard"
			@close="closeTopCard"
		/>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { usePanel } from "./composables/usePanel.js";
import PanelFloat from "./components/PanelFloat.vue";
import PanelTable from "./components/PanelTable.vue";
import TagFinder from "./components/TagFinder.vue";
import CardModal from "./components/CardModal.vue";

const rootPanel = usePanel("WP Tables");
const { config, columns, rows, total, fullTotal, loading, error, load } = rootPanel;

const openPanels = reactive([]);
let panelCounter = 0;
const tagFinderDoctype = ref("");
const tagFinderX = ref(0);
const tagFinderY = ref(80);

const cardStack = reactive([]);
let cardCounter = 0;

function openCardModal(cardDefName, doctype, recordName) {
	cardStack.push({
		id: ++cardCounter,
		cardDefName,
		doctype,
		recordName,
	});
}

function closeTopCard() {
	cardStack.pop();
}

function onOpenCard(cfg) {
	openCardModal(cfg.cardDefName, cfg.doctype, cfg.name);
}

onMounted(() => {
	load();
	window._nce_open_tag_finder = (dt, x, y) => {
		if (!dt) return;
		if (typeof x === "number") tagFinderX.value = x;
		if (typeof y === "number") tagFinderY.value = y;
		tagFinderDoctype.value = dt;
	};
	window._nce_close_tag_finder = () => { tagFinderDoctype.value = ""; };
});

onUnmounted(() => {
	delete window._nce_open_tag_finder;
	delete window._nce_close_tag_finder;
});

function nextPos(parentId) {
	/* Find the parent panel's position and offset from it */
	if (parentId === "root") {
		/* Offset from the root WP Tables panel (40, 60) */
		return { x: 40 + 80, y: 60 + 24 };
	}
	const parent = openPanels.find((p) => p.id === parentId);
	if (parent) {
		return { x: parent.x + 80, y: parent.y + 24 };
	}
	/* Fallback */
	return { x: 140, y: 120 };
}

function openTagFinder(panel) {
	tagFinderDoctype.value = panel.doctype;
	tagFinderX.value = panel.x + 20;
	tagFinderY.value = panel.y;
}

async function openPanel(doctype, parentFilter = {}, parentId = null) {
	const existingIdx = openPanels.findIndex((p) => p.doctype === doctype);
	if (existingIdx >= 0) closePanel(openPanels[existingIdx].id);

	const pos = nextPos(parentId);
	const id = ++panelCounter;
	const p = reactive({
		id,
		doctype,
		parentFilter,
		parentId,
		config: null,
		columns: [],
		rows: [],
		total: 0,
		fullTotal: 0,
		loading: true,
		error: null,
		x: pos.x,
		y: pos.y,
		_refetch: null,
	});
	openPanels.push(p);

	try {
		const panel = usePanel(doctype, parentFilter);
		await panel.load();
		p.config = panel.config.value;
		p.columns = panel.columns.value;
		p.rows = panel.rows.value;
		p.total = panel.total.value;
		p.fullTotal = panel.fullTotal.value;
		p._refetch = async (uf) => {
			p.loading = true;
			await panel.refetch(uf);
			p.rows = panel.rows.value;
			p.total = panel.total.value;
			p.loading = false;
		};
	} catch (e) {
		p.error = String(e);
	} finally {
		p.loading = false;
	}
}

function closePanel(id) {
	const children = openPanels.filter((p) => p.parentId === id);
	children.forEach((c) => closePanel(c.id));
	const idx = openPanels.findIndex((p) => p.id === id);
	if (idx >= 0) openPanels.splice(idx, 1);
}

function onRootRowClick(row) {
	const doctype = row.frappe_doctype || row.name;
	if (!doctype) return;
	openPanel(doctype, {}, "root");
}

async function onDrill(ev, parentPanel) {
	const filter = {};
	if (ev.linkField && ev.rowName) {
		filter[ev.linkField] = ev.rowName;
	}
	try {
		const r = await new Promise((resolve) => {
			frappe.db
				.get_value("Card Definition", { root_doctype: ev.doctype, is_default: 1 }, "name")
				.then((val) => resolve(val))
				.catch(() => resolve(null));
		});
		const cardDefName = typeof r === "object" && r?.name ? r.name : typeof r === "string" ? r : null;
		if (cardDefName && ev.rowName) {
			openCardModal(cardDefName, ev.doctype, ev.rowName);
			return;
		}
	} catch (e) {
		/* fall through to panel */
	}
	openPanel(ev.doctype, filter, parentPanel.id);
}

function onDrilledRowClick(p, row) {
	if (!p.config?.open_card_on_click || !row?.name) return;
	const slug = p.doctype.toLowerCase().replace(/ /g, "-");
	const url = `${window.location.origin}/app/${slug}/${encodeURIComponent(row.name)}`;
	window.open(url, "_blank");
}

function onFilterChange(panel, userFilters) {
	if (!panel) {
		rootPanel.refetch(userFilters);
	} else if (panel._refetch) {
		panel._refetch(userFilters);
	}
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
		"/assets/nce_events/js/panel_page/ai_tools.js",
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
			init_left: (p.x || 40) + 60,
			init_top: (p.y || 60) + 20,
			on_close() { _sendDialog = null; },
		});
	});
}

function onEmail(p) { _openSendDialog(p, "email"); }
function onSms(p) { _openSendDialog(p, "sms"); }

function _openSendDialogOne(p, mode, row) {
	const cfg = p.config;
	if (!cfg) return;
	const recipientField = mode === "sms" ? cfg.sms_field : cfg.email_field;
	if (!recipientField) return;

	if (_sendDialog) { _sendDialog.close(); _sendDialog = null; }

	frappe.require([
		"/assets/nce_events/js/panel_page/ai_tools.js",
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
			filters: { name: row.name },
			user_filters: [],
			row_count: 1,
			z_index: 9999,
			init_left: (p.x || 40) + 60,
			init_top: (p.y || 60) + 20,
			on_close() { _sendDialog = null; },
		});
	});
}

function onEmailOne(p, row) { _openSendDialogOne(p, "email", row); }
function onSmsOne(p, row) { _openSendDialogOne(p, "sms", row); }
</script>

<style scoped>
.ppv2-root {
	position: relative;
	width: 100%;
	height: calc(100vh - 60px);
}
</style>
