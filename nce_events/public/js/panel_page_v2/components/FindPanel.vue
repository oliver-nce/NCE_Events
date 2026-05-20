<template>
	<PanelFloat
		:init-x="initX"
		:init-y="initY"
		:init-w="initW"
		:init-h="initH"
	>
		<template #header>
			<span class="ppv2-title">{{ title }}</span>
			<div class="ppv2-header-right">
				<div class="ppv2-header-controls">
					<span class="ppv2-count">{{ browseCount }} / {{ sourceTotal }} records</span>
					<button
						class="ppv2-hdr-btn ppv2-close-btn"
						title="Close"
						@click="$emit('close')"
					>
						&times;
					</button>
				</div>
			</div>
		</template>

		<div class="ppv2-find-body">
			<div
				v-if="mode === 'find'"
				class="ppv2-find-actions"
				@mousedown.stop
			>
				<button type="button" class="ppv2-find-action-btn ppv2-find-action-btn--primary" @click="onFindClick">
					Find
				</button>
				<button type="button" class="ppv2-find-action-btn" @click="$emit('close')">
					Cancel
				</button>
			</div>
			<div
				v-else
				class="ppv2-find-actions"
				@mousedown.stop
			>
				<button type="button" class="ppv2-find-action-btn" @click="enterFindMode">
					New Find
				</button>
			</div>
			<table class="ppv2-table">
				<thead>
					<tr>
						<th v-for="col in columns" :key="col.fieldname">
							{{ col.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="mode === 'find'" class="ppv2-find-row">
						<td v-for="col in columns" :key="'in-' + col.fieldname">
							<input
								v-model="criteria[col.fieldname]"
								type="text"
								class="ppv2-find-input"
								:placeholder="col.label"
								@keydown.enter.prevent="onFindClick"
							/>
						</td>
					</tr>
					<template v-else>
						<tr
							v-for="(row, ri) in rows"
							:key="row.name || ri"
							class="ppv2-find-browse-row"
							:class="{ 'ppv2-alt': ri % 2 === 1 }"
							@click="$emit('row-click', row)"
						>
							<td v-for="col in columns" :key="col.fieldname">
								{{ formatCell(row, col) }}
							</td>
						</tr>
					</template>
				</tbody>
			</table>
			<div v-if="mode === 'browse' && !rows.length" class="ppv2-find-empty">
				No records match your request.
			</div>
		</div>

		<template #footer>{{ title }}</template>
	</PanelFloat>
</template>

<script setup>
import { computed, toRef, watch } from "vue";
import PanelFloat from "./PanelFloat.vue";
import { useFindPanel } from "../composables/useFindPanel.js";

const props = defineProps({
	title: { type: String, default: "" },
	columns: { type: Array, default: () => [] },
	allRows: { type: [Array, Object], default: () => [] },
	initX: { type: Number, default: 140 },
	initY: { type: Number, default: 120 },
	initW: { type: Number, default: 1200 },
	initH: { type: Number, default: 600 },
});

defineEmits(["close", "row-click"]);

const { mode, criteria, rows, initCriteriaForColumns, enterFindMode, performFind } = useFindPanel({
	allRows: toRef(props, "allRows"),
});

watch(
	() => props.columns,
	(cols) => initCriteriaForColumns(cols),
	{ immediate: true }
);

const browseCount = computed(() => (mode.value === "browse" ? rows.value.length : 0));

const sourceTotal = computed(() => {
	const r = props.allRows;
	if (Array.isArray(r)) return r.length;
	if (r != null && typeof r === "object" && Array.isArray(r.value)) return r.value.length;
	return 0;
});

function formatCell(row, col) {
	const v = row[col.fieldname];
	if (v == null || v === "") return "";
	return String(v);
}

function onFindClick() {
	if (!performFind()) {
		const msg =
			typeof window.__ === "function"
				? window.__("Enter at least one search criterion.")
				: "Enter at least one search criterion.";
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint(msg);
		}
	}
}
</script>

<style scoped>
.ppv2-find-actions {
	display: flex;
	gap: 8px;
	padding: 6px 10px;
	background: var(--primary-light);
	border-bottom: 1px solid var(--border-color);
	flex-shrink: 0;
}

.ppv2-find-action-btn {
	font-size: 12px;
	padding: 4px 14px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	background: var(--bg-card);
	cursor: pointer;
}

.ppv2-find-action-btn--primary {
	background: var(--bg-header);
	color: var(--text-header);
	border-color: var(--bg-header);
	font-weight: var(--font-weight-bold);
}

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

.ppv2-find-body {
	flex: 1;
	overflow: auto;
	min-height: 0;
}

.ppv2-find-browse-row {
	cursor: pointer;
}

.ppv2-find-browse-row:hover {
	background: var(--primary-light);
}

.ppv2-find-empty {
	padding: 12px;
	color: var(--text-muted, #666);
	font-size: calc(var(--font-size-base) + 1px);
}
</style>
