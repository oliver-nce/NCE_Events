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
			:config="config"
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
							:class="colHeaderCellClasses"
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
							:class="colHeaderCellClasses"
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
								class="ppv2-link-val"
								:class="linkCellClasses(row, col, linkKey(row, col))"
								:style="linkCellStyle(row, col)"
								@mouseenter="hoveredLinkKey = linkKey(row, col)"
								@mouseleave="hoveredLinkKey = null"
								:href="formRoute(col.link_doctype, getVal(row, col.fieldname))"
								target="_blank"
								@click.stop
								>{{ cellValue(row, col) }}</a
							>
							<span
								v-else-if="col.is_related_link && col.related_doctype"
								class="ppv2-related-link"
								:class="linkCellClasses(row, col, linkKey(row, col))"
								:style="linkCellStyle(row, col)"
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
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import PanelTableFilterBar from "./PanelTableFilterBar.vue";
import { familyIdFromRow } from "../utils/wpUserSwitch.js";
import {
	actionColumnWidthFromConfig,
	calcColWidths,
	isTitleFieldColumn,
	panelRowVal,
} from "../utils/panelTableColWidths.js";
import { panelChromeBg, panelChromeFgTextClass } from "../utils/panelChromeClasses.js";

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
	/** Pre-computed column widths from App.vue before first paint. */
	initialColWidths: { type: Array, default: null },
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
	/** Sum of data column widths + action column reserve (px). Used to size PanelFloat on open. */
	"table-min-width",
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

const colHeaderBgClass = computed(() =>
	panelChromeBg(props.config, "col_header_bg_class")
);
const colHeaderCellClasses = computed(() => {
	const bg = colHeaderBgClass.value;
	const fg = panelChromeFgTextClass(props.config, "col_header_bg_class");
	return fg ? [bg, fg] : [bg];
});

function rowTrClasses(ri, row) {
	const selected = props.selectedName === row.name;
	const hovered = hoveredRowIndex.value === ri;
	if (selected) return { "ppv2-row-selected": true };
	if (hovered) return { "ppv2-row-hovered": true };
	const even = ri % 2 === 0;
	const bgField = even ? "row_bg_class" : "row_alt_bg_class";
	const bgClass = panelChromeBg(props.config, bgField);
	const fgClass = panelChromeFgTextClass(props.config, bgField);
	const classes = { [bgClass]: true };
	if (fgClass) classes[fgClass] = true;
	return classes;
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

const emailField = computed(() => (props.config.email_field || "").trim().toLowerCase());
const smsField = computed(() => (props.config.sms_field || "").trim().toLowerCase());
const wpFamilyIdField = computed(() => (props.config.wp_family_id_field || "").trim().toLowerCase());
const hasEmailAction = computed(() => !!emailField.value);
const hasPhoneAction = computed(() => !!smsField.value);
const hasWpSwitchAction = computed(
	() => !!props.config.show_wp_switch && !!wpFamilyIdField.value
);

const actionColumnWidth = computed(() => actionColumnWidthFromConfig(props.config));
const hasActionColumn = computed(() => actionColumnWidth.value > 0);

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
	if (!props.columns?.length) return undefined;
	const dataSum = props.columns.reduce((s, _c, i) => s + (colWidths[i] || 0), 0);
	const minW = dataSum + actionColumnWidth.value;
	return minW > 0 ? { minWidth: `${minW}px` } : undefined;
});

function applyInitialColWidths() {
	const arr = props.initialColWidths;
	if (!Array.isArray(arr) || !arr.length) return;
	arr.forEach((px, i) => {
		colWidths[i] = px;
	});
}

function syncColumnWidths() {
	if (!props.columns?.length) return;
	const el = panelRef.value;
	const cw = el?.offsetWidth ?? el?.clientWidth ?? 0;
	const { widths, tableMinWidth } = calcColWidths(
		props.columns,
		props.rows || [],
		cw,
		actionColumnWidth.value,
		props.config?.title_field
	);
	widths.forEach((px, i) => {
		colWidths[i] = px;
	});
	emit("table-min-width", tableMinWidth);
}

watch(
	() => props.initialColWidths,
	() => applyInitialColWidths(),
	{ immediate: true }
);

watch(
	() => [props.rows, props.columns, actionColumnWidth.value],
	() => {
		nextTick(() => syncColumnWidths());
	},
	{ immediate: true }
);

let _colWidthResizeObs = null;
onMounted(() => {
	if (typeof ResizeObserver === "undefined") return;
	_colWidthResizeObs = new ResizeObserver(() => {
		syncColumnWidths();
	});
	nextTick(() => {
		if (panelRef.value) _colWidthResizeObs.observe(panelRef.value);
	});
});
onUnmounted(() => {
	_colWidthResizeObs?.disconnect();
	_colWidthResizeObs = null;
});

const dataCols = computed(() => props.columns);

const genderTintSet = computed(() => {
	const s = {};
	(props.config.gender_color_fields || []).forEach((f) => {
		s[f.toLowerCase()] = true;
	});
	return s;
});

function formatRuleForColumn(col) {
	const rules = props.config?.format_rules || [];
	for (let i = 0; i < rules.length; i++) {
		if (fieldKeyMatchesColumn(rules[i].field_name, col)) return rules[i];
	}
	return null;
}

function isFormatRuleActive(row, col) {
	const rule = formatRuleForColumn(col);
	if (!rule) return false;
	return Number(panelRowVal(row, rule.flag_key)) === 1;
}

const genderCol = computed(() => (props.config.gender_column || "").trim().toLowerCase());
const maleHex = computed(() => (props.config.male_hex || "").trim());
const femaleHex = computed(() => (props.config.female_hex || "").trim());
const tintByGender = computed(() => props.config.tint_by_gender || {});

function getVal(row, key) {
	return panelRowVal(row, key);
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

function fieldKeyMatchesColumn(fieldKey, col) {
	const k = String(fieldKey || "").trim().toLowerCase();
	if (!k || !col) return false;
	const bare = k.includes(".") ? k.split(".").pop() : k;
	const fn = String(col.fieldname || "").toLowerCase();
	return fn === k || fn === bare;
}

function isBoldColumn(col) {
	if (isTitleFieldColumn(col, props.config?.title_field)) return true;
	return (props.config.bold_fields || []).some((f) => fieldKeyMatchesColumn(f, col));
}

function genderColor(row, col) {
	const fn = col.fieldname.toLowerCase();
	if (!genderTintSet.value[fn]) return "";
	const fixedGender = tintByGender.value[fn];
	if (fixedGender === "Male") return maleHex.value || "";
	if (fixedGender === "Female") return femaleHex.value || "";
	const gv = getVal(row, genderCol.value);
	if (looksLike(gv, "male")) return maleHex.value || "";
	if (looksLike(gv, "female")) return femaleHex.value || "";
	return "";
}

function activeFormatRule(row, col) {
	return isFormatRuleActive(row, col) ? formatRuleForColumn(col) : null;
}

/** Same layering as bold: base panel styles on <td>, format overrides only what it sets. */
function cellStyle(row, col) {
	const style = {
		color: genderColor(row, col) || "var(--nce-color-text)",
	};
	if (isBoldColumn(col)) style.fontWeight = "700";

	const rule = activeFormatRule(row, col);
	if (rule) {
		if (rule.color) style.color = rule.color;
		if (rule.font_weight) style.fontWeight = rule.font_weight;
		if (rule.italic) style.fontStyle = "italic";
		if (rule.underline) style.textDecoration = "underline";
	}
	return style;
}

/** Link cells need inline color when format/gender tint beats theme-text-link. */
function linkCellStyle(row, col) {
	const rule = activeFormatRule(row, col);
	const style = {};
	if (rule?.color) {
		style.color = rule.color;
	} else {
		const gc = genderColor(row, col);
		if (gc) style.color = gc;
	}
	return style;
}

function linkCellClasses(row, col, hoverKey) {
	const rule = activeFormatRule(row, col);
	const hovered = hoveredLinkKey.value === hoverKey;
	const hasColorOverride = !!(rule?.color || genderColor(row, col));
	const classes = {};
	if (!hasColorOverride) {
		classes["theme-text-link"] = true;
		if (hovered) classes["theme-text-primary"] = true;
	}
	return classes;
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
	table-layout: fixed;
}

.ppv2-table th {
	position: sticky;
	top: 0;
	z-index: 2;
	/* Background + auto-paired text color come from the theme class
	   theme-bg-secondary-600 on the <th> (see template). Do not set color
	   here — a scoped rule would override the theme class. */
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

/* Row even/odd use per-panel theme-bg-* classes (row_bg_class / row_alt_bg_class). */
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
	font-size: var(--font-size-base);
	color: inherit;
	cursor: pointer;
	font-family: inherit;
}
.ppv2-header-ctx-item:hover {
	background-color: var(--nce-color-primary-100, #e3f0fc);
}
</style>
