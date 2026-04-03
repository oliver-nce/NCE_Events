<template>
	<div class="card-form" :style="cardStyles">
		<div class="card-form-header">
			<span class="card-title">{{ cardDef?.title || doctype }}</span>
			<span class="card-record-name">{{ recordName }}</span>
			<button class="card-close-btn" @click="$emit('close')">&times;</button>
		</div>
		<div v-if="loading" class="card-loading">Loading…</div>
		<div v-else-if="error" class="card-error">{{ error }}</div>
		<div v-else class="card-form-body">
			<ActionsPanel
				v-if="cardDef?.actions?.length"
				:actions="cardDef.actions"
				:scripts="cardDef.scripts || []"
				:record="record"
				@open-card="(...a) => $emit('open-card', ...a)"
				@refresh="onRefresh"
			/>
			<div class="card-form-content">
				<TabBar
					v-if="cardDef?.tabs?.length"
					:tabs="cardDef.tabs"
					v-model:active-tab="activeTab"
				/>
				<WidgetGrid
					:widgets="activeWidgets"
					:grid-columns="cardDef?.grid_columns || 12"
					:grid-rows="cardDef?.grid_rows || 10"
					:cell-size="cardDef?.grid_cell_size || 50"
					:record="record"
					:meta="meta"
					:resolved-hops="resolvedHops"
					:scripts="cardDef?.scripts || []"
					@save-field="onSaveField"
					@open-card="(...a) => $emit('open-card', ...a)"
				/>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useCardForm } from "./useCardForm.js";
import ActionsPanel from "../components/ActionsPanel.vue";
import TabBar from "../components/TabBar.vue";
import WidgetGrid from "../components/WidgetGrid.vue";

const props = defineProps({
	cardDefName: { type: String, required: true },
	doctype: { type: String, required: true },
	recordName: { type: String, required: true },
});

defineEmits(["open-card", "close"]);

const cardForm = useCardForm(props.doctype);
const {
	cardDef,
	record,
	meta,
	resolvedHops,
	loading,
	error,
	load,
	saveField,
	refresh,
} = cardForm;

const activeTab = ref("");

function collectWidgets() {
	const def = cardDef.value;
	if (!def) return [];
	const tab = activeTab.value;
	const widgets = [];

	for (const row of def.fields_list || []) {
		if (row.tab !== tab) continue;
		widgets.push({
			type: "field",
			id: `field-${row.path}-${row.idx || widgets.length}`,
			x: row.x ?? 0,
			y: row.y ?? 0,
			w: row.w ?? 3,
			h: row.h ?? 1,
			config: { path: row.path, editable: row.editable !== 0 },
		});
	}
	for (const row of def.displays || []) {
		if (row.tab !== tab) continue;
		widgets.push({
			type: "display",
			id: `display-${row.path}-${row.idx || widgets.length}`,
			x: row.x ?? 0,
			y: row.y ?? 0,
			w: row.w ?? 3,
			h: row.h ?? 1,
			config: { path: row.path, label: row.label },
		});
	}
	return widgets;
}

const activeWidgets = computed(collectWidgets);

const cardStyles = computed(() => {
	const json = cardDef.value?.styles_json;
	if (!json || !json.trim()) return {};
	try {
		const vars = JSON.parse(json);
		const style = {};
		for (const [key, value] of Object.entries(vars)) {
			if (key.startsWith("--") && value != null) {
				style[key] = String(value);
			}
		}
		return style;
	} catch {
		return {};
	}
});

watch(
	() => cardDef.value?.tabs,
	(tabs) => {
		const sorted = [...(tabs || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
		if (sorted.length && !activeTab.value) {
			activeTab.value = sorted[0].label || "Home";
		}
	},
	{ immediate: true }
);

function onSaveField({ fieldname, value }) {
	saveField(fieldname, value);
}

async function onRefresh() {
	await refresh();
}

onMounted(async () => {
	await load(props.cardDefName, props.recordName);
	const tabs = cardDef.value?.tabs || [];
	const sorted = [...tabs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
	if (sorted.length && !activeTab.value) {
		activeTab.value = sorted[0].label || "Home";
	}
});
</script>

<style scoped>
.card-form {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--bg-card);
	color: var(--text-color);
	font-family: var(--font-family);
}
.card-form-header {
	display: flex;
	align-items: center;
	padding: var(--spacing-sm) var(--spacing-md);
	background: var(--bg-header);
	color: var(--text-header);
	border-radius: var(--border-radius) var(--border-radius) 0 0;
}
.card-title {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-lg);
	flex: 1;
}
.card-record-name {
	font-size: var(--font-size-sm);
	opacity: 0.8;
	margin-right: var(--spacing-md);
}
.card-close-btn {
	background: none;
	border: none;
	color: var(--text-header);
	font-size: 20px;
	cursor: pointer;
	opacity: 0.8;
}
.card-close-btn:hover {
	opacity: 1;
}
.card-form-body {
	flex: 1;
	display: flex;
	overflow: hidden;
}
.card-form-content {
	flex: 1;
	overflow: auto;
	padding: var(--spacing-md);
}
.card-loading,
.card-error {
	padding: var(--spacing-lg);
	text-align: center;
}
.card-error {
	color: red;
}
</style>
