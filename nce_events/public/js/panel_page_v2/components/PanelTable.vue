<!--
Panel data table with sort, context menu, format rules, links, and column resize.

code-index:begin
{
 "purpose": "Panel data table with sort, context menu, format rules, links, and column resize.",
 "read_when": "Changing panel table rendering, row click, sync status, or column widths.",
 "gotchas": [],
 "keywords": ["PanelTable", "panel table", "format rules", "column resize", "sync status"],
 "format": 1
}
code-index:end
-->

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
	<div ref="panelRef" class="ppv2-panel" :style="panelBorderStyleVars">
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

		<div v-if="loading" class="ppv2-loading">Loading…</div>

		<div v-else-if="error" class="ppv2-error">{{ error }}</div>

		<div v-else-if="config" ref="bodyRef" class="ppv2-body">
			<table class="ppv2-table" lang="en" :style="tableMinWidthStyle">
				<thead>
					<tr>
						<th
							v-for="(col, ci) in dataCols"
							:key="col.fieldname"
							class="col-header"
							:class="colHeaderCellClasses"
							:style="
								colWidths[ci]
									? {
											width: colWidths[ci] + 'px',
											minWidth: colWidths[ci] + 'px',
										}
									: { width: 'auto' }
							"
							@contextmenu.prevent="openHeaderContextMenu($event, col)"
						>
							<span class="ppv2-col-header-label">{{ headerTitleCase(col.label) }}</span>
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
							<span
								v-else-if="col.sync_error_drill && isNonSuccessSyncStatus(row, col)"
								class="ppv2-sync-status-link ppv2-text-link"
								role="button"
								tabindex="0"
								@click.stop="$emit('sync-error-click', row)"
								@keydown.enter.prevent="$emit('sync-error-click', row)"
							>{{ cellValue(row, col) }}</span>
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
import {
	activeFormatRule,
	fieldKeyMatchesColumn,
} from "../utils/panelFormatRules.js";
import {
	panelChromeBg,
	panelChromeTableBorderStyleVars,
} from "../utils/panelChromeClasses.js";

/** Display labels in title case so browser hyphenation works (skips ALL CAPS). */
function headerTitleCase(label) {
	const s = String(label || "").trim();
	if (!s) return "";
	return s
		.toLowerCase()
		.replace(/(^|\s|[-/])\w/g, (m) => m.toUpperCase());
}

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
	/** When true, sort is server-side; header emits sort-change instead of sorting rows. */
	serverSort: { type: Boolean, default: false },
	serverScroll: { type: Boolean, default: false },
	pageSize: { type: Number, default: 1000 },
	canLoadNext: { type: Boolean, default: false },
	canLoadPrev: { type: Boolean, default: false },
	loadedPageCount: { type: Number, default: 0 },
	windowGeneration: { type: Number, default: 0 },
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
	"sync-error-click",
	/** Sum of data column widths + action column reserve (px). Used to size PanelFloat on open. */
	"table-min-width",
	"sort-change",
	"need-next-page",
	"need-prev-page",
]);

const colWidths = reactive({});
const panelRef = ref(null);
const bodyRef = ref(null);

/** Virtual panel infinite scroll (only when serverScroll). */
let scrollEl = null;
let scrollHandler = null;
const scrollBusy = ref(false);
let ignoreScroll = false;

function findScrollElement(start) {
	let el = start;
	while (el) {
		const oy = getComputedStyle(el).overflowY;
		if (
			(oy === "auto" || oy === "scroll") &&
			el.scrollHeight > el.clientHeight + 1
		) {
			return el;
		}
		if (el.classList?.contains("ppv2-float")) break;
		el = el.parentElement;
	}
	return start;
}

function getDataRowElements() {
	const body = bodyRef.value;
	if (!body) return [];
	const all = body.querySelectorAll("tbody > tr");
	const n = displayRows.value.length;
	if (n <= 0) return [];
	return Array.from(all).slice(-n);
}

function sumFirstPageDataRowHeights() {
	const rows = getDataRowElements();
	const count = Math.min(props.pageSize, rows.length);
	let h = 0;
	for (let i = 0; i < count; i++) h += rows[i].offsetHeight;
	return h;
}

function detachScrollListener() {
	if (scrollEl && scrollHandler) {
		scrollEl.removeEventListener("scroll", scrollHandler, { passive: true });
	}
	scrollEl = null;
	scrollHandler = null;
}

function attachScrollListener() {
	detachScrollListener();
	if (!props.serverScroll) return;
	const body = bodyRef.value;
	if (!body) return;
	scrollEl = findScrollElement(body);
	scrollHandler = onServerScroll;
	scrollEl.addEventListener("scroll", scrollHandler, { passive: true });
	if (
		!scrollBusy.value &&
		props.canLoadNext &&
		props.loadedPageCount < 3 &&
		scrollEl.scrollHeight <= scrollEl.clientHeight + 1
	) {
		tryLoadNearBottom(scrollEl);
	}
}

function tryLoadNearBottom(scroller) {
	if (!props.canLoadNext || scrollBusy.value) return;
	if (scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 160) {
		return;
	}
	scrollBusy.value = true;
	let droppedMeasure = 0;
	if (props.loadedPageCount >= 3) {
		droppedMeasure = sumFirstPageDataRowHeights();
	}
	emit("need-next-page", {
		done: async (result) => {
			await nextTick();
			const r = result || {};
			ignoreScroll = true;
			if (r.droppedStart) {
				scroller.scrollTop = Math.max(0, scroller.scrollTop - droppedMeasure);
			}
			scrollBusy.value = false;
			requestAnimationFrame(() => {
				ignoreScroll = false;
			});
			if (
				r.added &&
				props.loadedPageCount < 3 &&
				scroller.scrollHeight <= scroller.clientHeight + 1 &&
				props.canLoadNext
			) {
				tryLoadNearBottom(scroller);
			}
		},
	});
}

function tryLoadNearTop(scroller) {
	if (!props.canLoadPrev || scrollBusy.value) return;
	if (scroller.scrollTop > 48) return;
	scrollBusy.value = true;
	emit("need-prev-page", {
		done: async (result) => {
			await nextTick();
			const r = result || {};
			ignoreScroll = true;
			if (r.prepended) {
				scroller.scrollTop += sumFirstPageDataRowHeights();
			}
			scrollBusy.value = false;
			requestAnimationFrame(() => {
				ignoreScroll = false;
			});
		},
	});
}

function onServerScroll() {
	if (!props.serverScroll || scrollBusy.value || ignoreScroll) return;
	const scroller = scrollEl;
	if (!scroller) return;
	tryLoadNearBottom(scroller);
	tryLoadNearTop(scroller);
}

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

const panelBorderStyleVars = computed(() =>
	panelChromeTableBorderStyleVars(props.config)
);
const colHeaderCellClasses = computed(() => [
	panelChromeBg(props.config, "col_header_bg_class"),
]);

function rowTrClasses(ri, row) {
	const selected = props.selectedName === row.name;
	const hovered = hoveredRowIndex.value === ri;
	if (selected) return { "ppv2-row-selected": true };
	if (hovered) return { "ppv2-row-hovered": true };
	const even = ri % 2 === 0;
	const bgField = even ? "row_bg_class" : "row_alt_bg_class";
	return { [panelChromeBg(props.config, bgField)]: true };
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
		if (props.serverSort) {
			emit("sort-change", { fieldname: col.fieldname, dir });
		}
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
		// Compare full ISO string so datetime values on the same day (time part) sort too.
		const ta = sa.replace(" ", "T");
		const tb = sb.replace(" ", "T");
		return mult * (ta < tb ? -1 : ta > tb ? 1 : 0);
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
	if (props.serverSort) return list;
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

watch(
	() => props.windowGeneration,
	() => {
		nextTick(() => {
			if (scrollEl) scrollEl.scrollTop = 0;
		});
	}
);

watch(
	() => [props.serverScroll, bodyRef.value, props.rows?.length],
	() => {
		nextTick(() => attachScrollListener());
	}
);

onUnmounted(() => {
	closeHeaderMenu();
	detachScrollListener();
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
	return minW > 0 ? { width: `${minW}px`, minWidth: `${minW}px` } : undefined;
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
	if (typeof ResizeObserver !== "undefined") {
		_colWidthResizeObs = new ResizeObserver(() => {
			syncColumnWidths();
		});
		nextTick(() => {
			if (panelRef.value) _colWidthResizeObs.observe(panelRef.value);
		});
	}
	nextTick(() => attachScrollListener());
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

const genderCol = computed(() => (props.config.gender_column || "").trim().toLowerCase());
const maleHex = computed(() => (props.config.male_hex || "").trim());
const femaleHex = computed(() => (props.config.female_hex || "").trim());
const tintByGender = computed(() => props.config.tint_by_gender || {});

function getVal(row, key) {
	return panelRowVal(row, key);
}

function isNonSuccessSyncStatus(row, col) {
	const v = String(getVal(row, col.fieldname) || "").trim().toLowerCase();
	return v !== "" && v !== "success";
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

function activeFormatRuleForRow(row, col) {
	return activeFormatRule(row, col, props.config?.format_rules);
}

function cellStyle(row, col) {
	const style = {
		color: genderColor(row, col) || "var(--text-color)",
	};
	if (isBoldColumn(col)) style.fontWeight = "700";

	const rule = activeFormatRuleForRow(row, col);
	if (rule) {
		if (rule.color) style.color = rule.color;
		if (rule.font_weight) style.fontWeight = rule.font_weight;
		if (rule.italic) style.fontStyle = "italic";
		if (rule.underline) style.textDecoration = "underline";
	}
	return style;
}

/** Link cells need inline color when format/gender tint beats default link styling. */
function linkCellStyle(row, col) {
	const rule = activeFormatRuleForRow(row, col);
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
	const rule = activeFormatRuleForRow(row, col);
	const hovered = hoveredLinkKey.value === hoverKey;
	const hasColorOverride = !!(rule?.color || genderColor(row, col));
	const classes = {};
	if (!hasColorOverride) {
		classes["ppv2-text-link"] = true;
		if (hovered) classes["ppv2-text-link--hover"] = true;
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
.ppv2-loading {
	color: var(--blue-500);
}
.ppv2-error {
	color: var(--red-500);
}
/* ── Table ── */

.ppv2-body {
	flex: 1;
	min-height: 0;
	overflow: auto;
	/* auto (not a color) lets the WebKit thumb paint. Desk sets a color pair on every element. */
	scrollbar-width: auto !important;
	scrollbar-color: auto !important;
}
.ppv2-body::-webkit-scrollbar {
	-webkit-appearance: none !important;
	width: 16px !important;
	height: 16px !important;
}
.ppv2-body::-webkit-scrollbar-thumb {
	background-color: #c4c4c4 !important;
	border: 3px solid #f4f4f4;
	border-radius: 8px;
	min-height: 32px;
	min-width: 32px;
}
.ppv2-body::-webkit-scrollbar-thumb:hover {
	background-color: #a3a3a3;
}
.ppv2-body::-webkit-scrollbar-track,
.ppv2-body::-webkit-scrollbar-corner {
	background: #f4f4f4;
}
.ppv2-body::-webkit-scrollbar-button:single-button {
	display: block !important;
	background-color: #f7f7f7;
	background-repeat: no-repeat;
	background-position: center;
	background-size: 16px 16px;
}
.ppv2-body::-webkit-scrollbar-button:single-button:vertical:decrement {
	height: 16px !important;
	border-bottom: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 10l4-4 4 4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.ppv2-body::-webkit-scrollbar-button:single-button:vertical:increment {
	height: 16px !important;
	border-top: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.ppv2-body::-webkit-scrollbar-button:single-button:horizontal:decrement {
	width: 16px !important;
	border-right: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M10 4l-4 4 4 4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.ppv2-body::-webkit-scrollbar-button:single-button:horizontal:increment {
	width: 16px !important;
	border-left: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M6 4l4 4-4 4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
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
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-sm);
	padding: 6px 8px;
	border-bottom: var(--ppv2-col-header-line-w) solid var(--ppv2-col-header-line-c);
	text-align: left;
	vertical-align: bottom;
	overflow: visible;
	border-right: var(--ppv2-col-divider-w) solid var(--ppv2-col-divider-c);
}
.ppv2-col-header-label {
	display: block;
	white-space: normal;
	overflow-wrap: normal;
	word-break: normal;
	hyphens: none;
	-webkit-hyphens: none;
	line-height: 1.2;
	padding-right: 4px;
}
.ppv2-table th:last-child {
	border-right: none;
}

.ppv2-table th.ppv2-action-th {
	position: sticky;
	top: 0;
	right: 0;
	z-index: 4;
	padding-left: 4px;
	padding-right: 4px;
	overflow: visible;
	border-left: 1px solid var(--ppv2-col-divider-c, var(--border-color));
	box-shadow: inset 1px 0 0 var(--ppv2-col-divider-c, var(--border-color));
}

.ppv2-table th.ppv2-action-th::before,
.ppv2-table td.ppv2-action-td::before,
:deep(.ppv2-action-td)::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 1px;
	background: var(--ppv2-col-divider-c, var(--border-color));
	pointer-events: none;
}

.ppv2-table td {
	padding: 5px 8px;
	border-bottom: var(--ppv2-row-divider-w) solid var(--ppv2-row-divider-c);
	border-right: var(--ppv2-col-divider-w) solid var(--ppv2-col-divider-c);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ppv2-table td:last-child {
	border-right: none;
}

.ppv2-table tbody tr {
	cursor: pointer;
}

.ppv2-chrome-col-header {
	background: var(--gray-100);
	color: var(--text-color);
}
.ppv2-chrome-row {
	background: var(--fg-color, #fff);
}
.ppv2-chrome-row-alt {
	background: var(--gray-50);
}

.ppv2-table tbody tr.ppv2-row-hovered {
	background-color: var(--blue-100);
}
.ppv2-table tbody tr.ppv2-row-selected {
	background-color: var(--blue-200);
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

.ppv2-table td.ppv2-action-td,
:deep(.ppv2-action-td) {
	position: sticky;
	right: 0;
	z-index: 1;
	background: inherit;
	white-space: nowrap;
	text-align: center;
	overflow: visible;
	padding-left: 4px;
	padding-right: 4px;
	border-left: 1px solid var(--ppv2-col-divider-c, var(--border-color));
	box-shadow: inset 1px 0 0 var(--ppv2-col-divider-c, var(--border-color));
}

:deep(.ppv2-find-row .ppv2-action-td) {
	background: var(--fg-color, #fff);
}

:deep(.ppv2-find-row--active .ppv2-action-td) {
	background: var(--blue-100);
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
	background-color: var(--fg-color, #ffffff);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
}
.ppv2-row-btn--hover,
.ppv2-row-btn:hover {
	background-color: var(--blue-50);
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
	background: color-mix(in srgb, var(--blue-500, #126bc4) 30%, transparent);
}

.ppv2-text-link {
	color: var(--blue-500);
	text-decoration: underline;
	cursor: pointer;
}
.ppv2-text-link--hover,
.ppv2-text-link:hover {
	color: var(--blue-600);
}

:deep(.ppv2-find-row td) {
	padding: 2px 4px;
	border-bottom: var(--ppv2-row-divider-w) solid var(--ppv2-row-divider-c);
}

:deep(.ppv2-find-input) {
	width: 100%;
	box-sizing: border-box;
	padding: 2px 4px;
	font-size: calc(var(--font-size-base) + 1px);
}
</style>

<style>
.ppv2-header-ctx-menu {
	position: fixed;
	z-index: 100100;
	min-width: 180px;
	padding: 4px 0;
	margin: 0;
	border: 1px solid var(--border-color);
	border-radius: 4px;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
	background-color: var(--fg-color, #ffffff);
	color: var(--text-color, #252525);
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
	background-color: var(--blue-100);
}

.ppv2-sync-status-link {
	cursor: pointer;
	text-decoration: underline;
	font-weight: 600;
}
</style>
