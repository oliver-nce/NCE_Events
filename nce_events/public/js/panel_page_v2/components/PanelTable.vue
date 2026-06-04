<template>
	<Teleport to="body">
		<div
			v-if="headerMenuOpen && headerMenuCol"
			ref="headerMenuRef"
			class="ppv2-header-ctx-menu"
			:style="{ left: headerMenuX + 'px', top: headerMenuY + 'px' }"
			@click.stop
			@contextmenu.prevent
		>
			<button type="button" class="ppv2-header-ctx-item" @click="applyHeaderSort('asc')">
				Sort Ascending
			</button>
			<button type="button" class="ppv2-header-ctx-item" @click="applyHeaderSort('desc')">
				Sort Descending
			</button>
		</div>
	</Teleport>
	<div ref="panelRef" class="ppv2-panel">
		<PanelTableFilterBar
			v-if="!embedded"
			:columns="columns"
			:search-only-columns="searchOnlyColumns"
			:default-filters="defaultFilters"
			:show-filter="showFilter"
			@filter-change="(f) => $emit('filter-change', f)"
			@show-filter="(v) => $emit('show-filter', v)"
		/>

		<div v-if="loading" class="ppv2-loading theme-text-primary">Loading…</div>

		<div v-else-if="error" class="ppv2-error theme-text-danger">{{ error }}</div>

		<div v-else-if="config" class="ppv2-body">
			<table class="ppv2-table" :style="tableMinWidthStyle">
				<thead>
					<tr>
						<th
							v-for="(col, ci) in dataCols"
							:key="col.fieldname"
							class="col-header"
							:style="{
								width: colWidths[ci] ? colWidths[ci] + 'px' : 'auto',
								minWidth: '40px',
							}"
							@contextmenu.prevent="openHeaderContextMenu($event, col)"
						>
							{{ col.label }}
							<div
								class="ppv2-col-resize"
								@mousedown.prevent="startColResize($event, ci)"
							/>
						</th>
						<th
							v-if="hasActionColumn"
							class="ppv2-action-th col-header"
							:style="actionColumnStyle"
						/>
					</tr>
				</thead>
				<tbody>
					<slot name="tbody-prefix" />
					<tr
						v-for="(row, ri) in displayRows"
						:key="row.name || ri"
						:class="rowTrClasses(ri, row)"
						@click="onRowClick($event, row)"
						@contextmenu="onContextMenu($event, row)"
						@mouseenter="hoveredRowIndex = ri"
						@mouseleave="hoveredRowIndex = null"
					>
						<td
							v-for="col in dataCols"
							:key="col.fieldname"
							:style="cellStyle(row, col)"
						>
							<a
								v-if="
									col.is_link && col.link_doctype && getVal(row, col.fieldname)
								"
								class="ppv2-link-val theme-text-link"
								:class="{ 'theme-text-primary': hoveredLinkKey === linkKey(row, col) }"
								@mouseenter="hoveredLinkKey = linkKey(row, col)"
								@mouseleave="hoveredLinkKey = null"
								:href="formRoute(col.link_doctype, getVal(row, col.fieldname))"
								target="_blank"
								@click.stop
								>{{ cellValue(row, col) }}</a
							>
							<span
								v-else-if="col.is_related_link && col.related_doctype"
								class="ppv2-related-link theme-text-link"
								:class="{ 'theme-text-primary': hoveredLinkKey === linkKey(row, col) }"
								@mouseenter="hoveredLinkKey = linkKey(row, col)"
								@mouseleave="hoveredLinkKey = null"
								@click.stop="
									$emit('drill', {
										doctype: col.related_doctype,
										linkField: col.related_link_field,
										rowName: row.name,
										parentRow: row,
									})
								"
								>{{ cellValue(row, col) }}</span
							>
							<template v-else>{{ cellValue(row, col) }}</template>
						</td>
						<td v-if="hasActionColumn" class="ppv2-action-td" :style="actionColumnStyle">
							<button
								v-if="hasEmailAction && rowHasEmail(row)"
								class="ppv2-row-btn"
								:class="{ 'ppv2-row-btn--hover': hoveredRowBtn === rowBtnKey(row, 'email') }"
								title="Send email"
								@mouseenter="hoveredRowBtn = rowBtnKey(row, 'email')"
								@mouseleave="hoveredRowBtn = null"
								@click.stop="$emit('email-one', row)"
							>
								<i class="fa fa-envelope"></i>
							</button>
							<button
								v-if="hasPhoneAction && rowHasPhone(row)"
								class="ppv2-row-btn"
								:class="{ 'ppv2-row-btn--hover': hoveredRowBtn === rowBtnKey(row, 'call') }"
								title="Call"
								@mouseenter="hoveredRowBtn = rowBtnKey(row, 'call')"
								@mouseleave="hoveredRowBtn = null"
								@click.stop="onCallRow(row)"
							>
								<i class="fa fa-phone"></i>
							</button>
							<button
								v-if="hasPhoneAction && rowHasPhone(row)"
								class="ppv2-row-btn"
								:class="{ 'ppv2-row-btn--hover': hoveredRowBtn === rowBtnKey(row, 'sms') }"
								title="Send SMS"
								@mouseenter="hoveredRowBtn = rowBtnKey(row, 'sms')"
								@mouseleave="hoveredRowBtn = null"
								@click.stop="$emit('sms-one', row)"
							>
								<i class="fa fa-comment"></i>
							</button>
							<button
								v-if="hasWpSwitchAction && rowHasFamilyId(row)"
								class="ppv2-row-btn"
								:class="{ 'ppv2-row-btn--hover': hoveredRowBtn === rowBtnKey(row, 'switch') }"
								title="View as on website"
								@mouseenter="hoveredRowBtn = rowBtnKey(row, 'switch')"
								@mouseleave="hoveredRowBtn = null"
								@click.stop="$emit('switch-one', row)"
							>
								<i class="fa fa-external-link"></i>
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onUnmounted } from "vue";
import PanelTableFilterBar from "./PanelTableFilterBar.vue";
import { familyIdFromRow } from "../utils/wpUserSwitch.js";

const props = defineProps({
	title: { type: String, default: "" },
	columns: { type: Array, default: () => [] },
	rows: { type: Array, default: () => [] },
	total: { type: Number, default: 0 },
	loading: { type: Boolean, default: false },
	error: { type: String, default: null },
	selectedName: { type: String, default: null },
	showEmail: { type: Boolean, default: false },
	showSms: { type: Boolean, default: false },
	config: { type: Object, default: () => ({}) },
	defaultFilters: { type: Array, default: () => [] },
	showFilter: { type: Boolean, default: false },
	searchOnlyColumns: { type: Array, default: () => [] },
	/** Inside Find Panel etc.: no filter bar; table fills parent. */
	embedded: { type: Boolean, default: false },
});

const emit = defineEmits([
	"row-click",
	"row-drop",
	"close",
	"drill",
	"sheets",
	"email",
	"sms",
	"filter-change",
	"email-one",
	"sms-one",
	"switch-one",
	"refresh",
	"show-filter",
]);

const colWidths = reactive({});
const panelRef = ref(null);

/** Client-side sort (current row set only). */
const sortFieldname = ref(null);
const sortDir = ref(null); // 'asc' | 'desc'

const headerMenuOpen = ref(false);
const headerMenuCol = ref(null);
const headerMenuX = ref(0);
const headerMenuY = ref(0);
const headerMenuRef = ref(null);
const hoveredRowIndex = ref(null);
const hoveredLinkKey = ref(null);
const hoveredRowBtn = ref(null);
let _closeHeaderMenuHandler = null;

function rowTrClasses(ri, row) {
	const selected = props.selectedName === row.name;
	const hovered = hoveredRowIndex.value === ri;
	if (selected) return { "ppv2-row-selected": true };
	if (hovered) return { "ppv2-row-hovered": true };
	return {
		"ppv2-row-even": ri % 2 === 0,
		"ppv2-row-odd": ri % 2 === 1,
	};
}

function linkKey(row, col) {
	return `${row.name || ""}:${col.fieldname}`;
}

function rowBtnKey(row, action) {
	return `${row.name || ""}:${action}`;
}

function closeHeaderMenu() {
	headerMenuOpen.value = false;
	headerMenuCol.value = null;
	if (_closeHeaderMenuHandler) {
		document.removeEventListener("click", _closeHeaderMenuHandler, true);
		document.removeEventListener("keydown", _closeHeaderMenuHandler, true);
		_closeHeaderMenuHandler = null;
	}
}

function openHeaderContextMenu(event, col) {
	headerMenuCol.value = col;
	headerMenuX.value = event.clientX;
	headerMenuY.value = event.clientY;
	headerMenuOpen.value = true;
	nextTick(() => {
		if (_closeHeaderMenuHandler) {
			document.removeEventListener("click", _closeHeaderMenuHandler, true);
			document.removeEventListener("keydown", _closeHeaderMenuHandler, true);
		}
		_closeHeaderMenuHandler = (e) => {
			if (e.type === "keydown" && e.key === "Escape") {
				closeHeaderMenu();
				return;
			}
			if (e.type === "click") {
				const el = headerMenuRef.value;
				if (el && el.contains(e.target)) return;
				closeHeaderMenu();
			}
		};
		setTimeout(() => {
			document.addEventListener("click", _closeHeaderMenuHandler, true);
			document.addEventListener("keydown", _closeHeaderMenuHandler, true);
		}, 0);
	});
}

function applyHeaderSort(dir) {
	const col = headerMenuCol.value;
	if (col?.fieldname) {
		sortFieldname.value = col.fieldname;
		sortDir.value = dir;
	}
	closeHeaderMenu();
}

function compareRowsForSort(ra, rb, fieldname, dir) {
	const mult = dir === "desc" ? -1 : 1;
	const va = getVal(ra, fieldname);
	const vb = getVal(rb, fieldname);
	const aEmpty = va == null || va === "";
	const bEmpty = vb == null || vb === "";
	if (aEmpty && bEmpty) return 0;
	if (aEmpty) return 1 * mult;
	if (bEmpty) return -1 * mult;
	if (typeof va === "object" || typeof vb === "object") {
		const sa = typeof va === "object" ? JSON.stringify(va) : String(va);
		const sb = typeof vb === "object" ? JSON.stringify(vb) : String(vb);
		return mult * sa.localeCompare(sb, undefined, { sensitivity: "base" });
	}
	const sa = String(va).trim();
	const sb = String(vb).trim();
	const dateRe = /^\d{4}-\d{2}-\d{2}/;
	if (dateRe.test(sa) && dateRe.test(sb)) {
		return mult * sa.slice(0, 10).localeCompare(sb.slice(0, 10));
	}
	const na = parseFloat(sa);
	const nb = parseFloat(sb);
	if (
		!Number.isNaN(na) &&
		!Number.isNaN(nb) &&
		/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(sa) &&
		/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(sb)
	) {
		if (na === nb) return 0;
		return mult * (na < nb ? -1 : 1);
	}
	return mult * sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
}

const displayRows = computed(() => {
	const list = props.rows || [];
	const fn = sortFieldname.value;
	const dir = sortDir.value;
	if (!fn || !dir) return list;
	const tagged = list.map((r, i) => ({ r, i }));
	tagged.sort((a, b) => {
		const c = compareRowsForSort(a.r, b.r, fn, dir);
		if (c !== 0) return c;
		return a.i - b.i;
	});
	return tagged.map((t) => t.r);
});

watch(
	() => [props.rows, props.columns],
	() => {
		const fn = sortFieldname.value;
		if (fn && !props.columns?.some((c) => c.fieldname === fn)) {
			sortFieldname.value = null;
			sortDir.value = null;
		}
	}
);

onUnmounted(() => {
	closeHeaderMenu();
});

function onRowClick(event, row) {
	if (event.ctrlKey) {
		event.preventDefault();
		emit("row-drop", row);
	} else {
		emit("row-click", row);
	}
}

function onContextMenu(event, row) {
	// On Mac, Ctrl+Click fires contextmenu instead of click
	if (event.ctrlKey) {
		event.preventDefault();
		emit("row-drop", row);
	}
}

function onRefresh() {
	emit("refresh");
}

const ACTION_BTN_SLOT_PX = 38;
const ACTION_CELL_PAD_PX = 12;

function calcColWidths(columns, rows, containerWidth, actionColWidth = 0) {
	const sample = rows.slice(0, 20);
	const MIN_COL = 50;
	const MAX_COL = 500;
	const reserved = Math.max(0, actionColWidth) + 16;
	const available = Math.max(200, (containerWidth || 800) - reserved);
	const avgChars = columns.map((col) => {
		let total = 0;
		sample.forEach((row) => {
			const v = getVal(row, col.fieldname);
			total += String(v ?? "").length;
		});
		const headerLen = (col.label || col.fieldname).length;
		const avg = sample.length > 0 ? total / sample.length : headerLen;
		return Math.max(avg, headerLen, 2);
	});
	let totalChars = avgChars.reduce((s, c) => s + c, 0);
	if (totalChars <= 0) totalChars = 1;
	let widths = avgChars.map((c) =>
		Math.min(MAX_COL, Math.max(MIN_COL, Math.round((c / totalChars) * available)))
	);
	const wSum = widths.reduce((s, w) => s + w, 0);
	if (wSum > available && wSum > 0) {
		const scale = available / wSum;
		widths = widths.map((w) => Math.floor(w * scale));
	}
	return widths;
}

const emailField = computed(() => (props.config.email_field || "").trim().toLowerCase());
const smsField = computed(() => (props.config.sms_field || "").trim().toLowerCase());
const wpFamilyIdField = computed(() => (props.config.wp_family_id_field || "").trim().toLowerCase());
const hasEmailAction = computed(() => !!emailField.value);
const hasPhoneAction = computed(() => !!smsField.value);
const hasWpSwitchAction = computed(
	() => !!props.config.show_wp_switch && !!wpFamilyIdField.value
);

const actionSlotCount = computed(() => {
	let n = 0;
	if (hasEmailAction.value) n += 1;
	if (hasPhoneAction.value) n += 2;
	if (hasWpSwitchAction.value) n += 1;
	return n;
});

const hasActionColumn = computed(() => actionSlotCount.value > 0);

const actionColumnWidth = computed(() => {
	if (!actionSlotCount.value) return 0;
	return ACTION_CELL_PAD_PX + actionSlotCount.value * ACTION_BTN_SLOT_PX;
});

const actionColumnStyle = computed(() => {
	const w = actionColumnWidth.value;
	if (!w) return undefined;
	return {
		width: `${w}px`,
		minWidth: `${w}px`,
		maxWidth: `${w}px`,
	};
});

const tableMinWidthStyle = computed(() => {
	if (!hasActionColumn.value || !props.columns?.length) return undefined;
	const dataSum = props.columns.reduce((s, _c, i) => s + (colWidths[i] || 0), 0);
	const minW = dataSum + actionColumnWidth.value;
	return minW > 0 ? { minWidth: `${minW}px` } : undefined;
});

watch(
	() => [props.rows, props.columns, actionColumnWidth.value],
	() => {
		if (!props.columns?.length) return;
		nextTick(() => {
			const el = panelRef.value;
			const w = el?.offsetWidth ?? el?.clientWidth ?? 0;
			const widths = calcColWidths(
				props.columns,
				props.rows || [],
				w,
				actionColumnWidth.value
			);
			widths.forEach((w, i) => {
				colWidths[i] = w;
			});
		});
	},
	{ immediate: true }
);

const dataCols = computed(() => props.columns);

const boldSet = computed(() => {
	const s = {};
	(props.config.bold_fields || []).forEach((f) => {
		s[f.toLowerCase()] = true;
	});
	return s;
});

const genderTintSet = computed(() => {
	const s = {};
	(props.config.gender_color_fields || []).forEach((f) => {
		s[f.toLowerCase()] = true;
	});
	return s;
});

const genderCol = computed(() => (props.config.gender_column || "").trim().toLowerCase());
const maleHex = computed(() => (props.config.male_hex || "").trim());
const femaleHex = computed(() => (props.config.female_hex || "").trim());
const tintByGender = computed(() => props.config.tint_by_gender || {});

function getVal(row, key) {
	if (!key) return null;
	return row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()] ?? null;
}

function cellValue(row, col) {
	const v = getVal(row, col.fieldname);
	if (v === null || v === undefined) return "";
	if (typeof v === "object") return JSON.stringify(v);
	return String(v);
}

function formRoute(doctype, name) {
	const slug = doctype.toLowerCase().replace(/ /g, "-");
	return `/app/${slug}/${encodeURIComponent(name)}`;
}

function rowHasEmail(row) {
	const v = getVal(row, emailField.value);
	return v && String(v).includes("@");
}

function rowHasPhone(row) {
	const v = getVal(row, smsField.value);
	return v && /[\d+]/.test(String(v));
}

function rowHasFamilyId(row) {
	return !!familyIdFromRow(row, wpFamilyIdField.value);
}

function onCallRow(row) {
	const v = getVal(row, smsField.value);
	if (!v) return;
	const tel = String(v).replace(/\s+/g, "");
	window.open("tel:" + tel, "_self");
}

function looksLike(val, gender) {
	if (!val) return false;
	const v = String(val).toLowerCase().trim();
	if (gender === "male") return v === "male" || v === "m" || v === "boy";
	if (gender === "female") return v === "female" || v === "f" || v === "girl";
	return false;
}

function cellStyle(row, col) {
	const fn = col.fieldname.toLowerCase();
	const style = {};

	if (genderTintSet.value[fn]) {
		const fixedGender = tintByGender.value[fn];
		if (fixedGender === "Male" && maleHex.value) {
			style.fontWeight = "700";
			style.color = maleHex.value;
		} else if (fixedGender === "Female" && femaleHex.value) {
			style.fontWeight = "700";
			style.color = femaleHex.value;
		} else {
			const gv = getVal(row, genderCol.value);
			if (looksLike(gv, "male") && maleHex.value) {
				style.fontWeight = "700";
				style.color = maleHex.value;
			} else if (looksLike(gv, "female") && femaleHex.value) {
				style.fontWeight = "700";
				style.color = femaleHex.value;
			}
		}
	} else if (boldSet.value[fn]) {
		style.fontWeight = "700";
	}

	return style;
}

function startColResize(e, ci) {
	const startX = e.clientX;
	const th = e.target.parentElement;
	const startW = th.offsetWidth;

	function onMove(ev) {
		colWidths[ci] = Math.max(40, startW + ev.clientX - startX);
	}
	function onUp() {
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}
</script>

<style scoped>
.ppv2-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

/* ── Loading / Error ── */

.ppv2-loading,
.ppv2-error {
	padding: 24px;
	text-align: center;
	font-size: var(--font-size-base);
}
/* ── Table ── */

.ppv2-body {
	flex: 1;
	overflow: auto;
}

.ppv2-table {
	width: 100%;
	/* separate + spacing 0: sticky thead works reliably (collapse breaks sticky in WebKit/Chromium). */
	border-collapse: separate;
	border-spacing: 0;
	font-size: 12px;
	font-family: Arial, sans-serif;
	table-layout: fixed;
}

.ppv2-table th {
	position: sticky;
	top: 0;
	z-index: 2;
	background-color: var(--nce-color-secondary-100, #e3f0fc);
	color: var(--nce-color-secondary-700, #105ead);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-sm);
	text-transform: uppercase;
	letter-spacing: 0.3px;
	padding: 6px 8px;
	border-bottom: 2px solid var(--nce-color-border);
	text-align: left;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	border-right: 1px solid var(--nce-color-border);
}
.ppv2-table th:last-child {
	border-right: none;
}

.ppv2-action-th {
	padding-left: 4px;
	padding-right: 4px;
	overflow: visible;
}

.ppv2-table td {
	padding: 5px 8px;
	border-bottom: 1px solid var(--nce-color-border);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.ppv2-table tbody tr {
	cursor: pointer;
}

/* Zebra stripes: read --nce-* from published theme (:root), not theme-bg-* utilities */
.ppv2-table tbody tr.ppv2-row-even {
	background-color: var(--nce-color-surface, #f9fafb);
}
.ppv2-table tbody tr.ppv2-row-odd {
	background-color: var(--nce-color-row-alt, #f3f4f6);
}
.ppv2-table tbody tr.ppv2-row-hovered {
	background-color: var(--nce-color-primary-100, #e3f0fc);
}
.ppv2-table tbody tr.ppv2-row-selected {
	background-color: var(--nce-color-primary-200, #c7e0fa);
}

.ppv2-link-val {
	text-decoration: underline;
	cursor: pointer;
}

.ppv2-related-link {
	text-decoration: underline;
	cursor: pointer;
}

/* ── Row action buttons ── */

.ppv2-action-td {
	white-space: nowrap;
	text-align: center;
	overflow: visible;
	padding-left: 4px;
	padding-right: 4px;
}

.ppv2-row-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 3px 7px;
	margin: 0 2px;
	cursor: pointer;
	font-size: var(--font-size-base);
	line-height: 1;
	background-color: var(--nce-color-surface, #ffffff);
	border: 1px solid var(--nce-color-border, #d1d5db);
	border-radius: var(--border-radius-sm, 4px);
}
.ppv2-row-btn--hover,
.ppv2-row-btn:hover {
	background-color: var(--nce-color-primary-50, #f1f7fe);
}
.ppv2-row-btn i {
	margin: 0;
}

/* ── Column resize handle ── */

.ppv2-col-resize {
	position: absolute;
	top: 0;
	right: -3px;
	width: 6px;
	height: 100%;
	cursor: col-resize;
	z-index: 2;
}
.ppv2-col-resize:hover {
	background: color-mix(in srgb, var(--nce-color-primary, #126bc4) 30%, transparent);
}

:deep(.ppv2-find-row td) {
	padding: 2px 4px;
	border-bottom: 1px solid var(--nce-color-border);
}

:deep(.ppv2-find-input) {
	width: 100%;
	box-sizing: border-box;
	padding: 2px 4px;
	font-size: calc(var(--font-size-base) + 1px);
}
</style>

<!-- Teleported to <body>: use --nce-color-* from :root, not scoped bridge aliases -->
<style>
.ppv2-header-ctx-menu {
	position: fixed;
	z-index: 100100;
	min-width: 180px;
	padding: 4px 0;
	margin: 0;
	border: 1px solid var(--nce-color-border, #d1d5db);
	border-radius: 4px;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
	background-color: var(--nce-color-surface, #ffffff);
	color: var(--nce-color-text, #252525);
}
.ppv2-header-ctx-item {
	display: block;
	width: 100%;
	padding: 8px 14px;
	border: none;
	background-color: transparent;
	text-align: left;
	font-size: 13px;
	color: inherit;
	cursor: pointer;
	font-family: inherit;
}
.ppv2-header-ctx-item:hover {
	background-color: var(--nce-color-primary-100, #e3f0fc);
}
</style>
