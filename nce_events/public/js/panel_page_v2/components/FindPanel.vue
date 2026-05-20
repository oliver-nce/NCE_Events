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
					<button
						v-if="mode === 'find'"
						type="button"
						class="ppv2-hdr-btn ppv2-find-action-btn"
						@click.stop="onFindClick"
					>
						Find
					</button>
					<button
						v-if="mode === 'browse'"
						type="button"
						class="ppv2-hdr-btn ppv2-find-action-btn"
						@click="enterFindMode"
					>
						New Find
					</button>
					<button
						v-if="mode === 'find'"
						type="button"
						class="ppv2-hdr-btn ppv2-find-action-btn"
						@click="$emit('close')"
					>
						Cancel
					</button>
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
			<table class="ppv2-table">
				<thead>
					<tr>
						<th v-for="col in columns" :key="col.fieldname">
							{{ col.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<PanelFindRow
						v-if="mode === 'find'"
						:columns="columns"
						:criteria="criteria"
						@update-criterion="setCriterion"
						@find-perform="onFindClick"
					/>
					<tr
						v-for="(row, ri) in rows"
						v-else
						:key="row.name || ri"
						class="ppv2-find-browse-row"
						:class="{ 'ppv2-alt': ri % 2 === 1 }"
						@click="$emit('row-click', row)"
					>
						<td v-for="col in columns" :key="col.fieldname">
							{{ formatCell(row, col) }}
						</td>
					</tr>
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
import PanelFindRow from "./PanelFindRow.vue";
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

const { mode, criteria, rows, initCriteriaForColumns, setCriterion, enterFindMode, performFind } =
	useFindPanel({
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
.ppv2-find-action-btn {
	font-size: 12px;
	padding: 2px 10px;
	min-width: auto;
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
