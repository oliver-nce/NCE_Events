<template>
	<div ref="panelRef" class="ppv2-panel">
		<PanelTableFilterBar
			:columns="columns"
			:default-filters="defaultFilters"
			:show-filter="showFilter"
			@filter-change="(f) => $emit('filter-change', f)"
			@show-filter="(v) => $emit('show-filter', v)"
		/>

		<div v-if="loading" class="ppv2-loading">Loading…</div>

		<div v-else-if="error" class="ppv2-error">{{ error }}</div>

		<div v-else-if="config" class="ppv2-body">
			<table class="ppv2-table">
				<thead>
					<tr>
						<th
							v-for="(col, ci) in dataCols"
							:key="col.fieldname"
							:style="{
								width: colWidths[ci] ? colWidths[ci] + 'px' : 'auto',
								minWidth: '40px',
							}"
						>
							{{ col.label }}
							<div
								class="ppv2-col-resize"
								@mousedown.prevent="startColResize($event, ci)"
							/>
						</th>
						<th v-if="hasEmailAction || hasPhoneAction" class="ppv2-action-th" />
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(row, ri) in rows"
						:key="row.name || ri"
						:class="{
							'ppv2-alt': ri % 2 === 1,
							'ppv2-selected': selectedName === row.name,
						}"
						@click="onRowClick($event, row)"
						@contextmenu="onContextMenu($event, row)"
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
								:href="formRoute(col.link_doctype, getVal(row, col.fieldname))"
								target="_blank"
								@click.stop
								>{{ cellValue(row, col) }}</a
							>
							<span
								v-else-if="col.is_related_link && col.related_doctype"
								class="ppv2-related-link"
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
						<td v-if="hasEmailAction || hasPhoneAction" class="ppv2-action-td">
							<button
								v-if="hasEmailAction && rowHasEmail(row)"
								class="ppv2-row-btn"
								title="Send email"
								@click.stop="$emit('email-one', row)"
							>
								<i class="fa fa-envelope"></i>
							</button>
							<button
								v-if="hasPhoneAction && rowHasPhone(row)"
								class="ppv2-row-btn"
								title="Call"
								@click.stop="onCallRow(row)"
							>
								<i class="fa fa-phone"></i>
							</button>
							<button
								v-if="hasPhoneAction && rowHasPhone(row)"
								class="ppv2-row-btn"
								title="Send SMS"
								@click.stop="$emit('sms-one', row)"
							>
								<i class="fa fa-comment"></i>
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from "vue";
import PanelTableFilterBar from "./PanelTableFilterBar.vue";

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
	"refresh",
	"show-filter",
]);

const colWidths = reactive({});
const panelRef = ref(null);

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

function calcColWidths(columns, rows, containerWidth) {
	const sample = rows.slice(0, 20);
	const MIN_COL = 50;
	const MAX_COL = 500;
	const available = Math.max(200, (containerWidth || 800) - 160);
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

watch(
	() => [props.rows, props.columns],
	() => {
		if (!props.columns?.length) return;
		nextTick(() => {
			const el = panelRef.value;
			const w = el?.offsetWidth ?? el?.clientWidth ?? 0;
			const widths = calcColWidths(props.columns, props.rows || [], w);
			widths.forEach((w, i) => {
				colWidths[i] = w;
			});
		});
	},
	{ immediate: true }
);

const emailField = computed(() => (props.config.email_field || "").trim().toLowerCase());
const smsField = computed(() => (props.config.sms_field || "").trim().toLowerCase());
const hasEmailAction = computed(() => !!emailField.value);
const hasPhoneAction = computed(() => !!smsField.value);

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
.ppv2-loading {
	color: var(--color-primary);
}
.ppv2-error {
	color: #e53e3e;
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
	background: var(--column-header-bg);
	color: var(--column-header-text);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-sm);
	text-transform: uppercase;
	letter-spacing: 0.3px;
	padding: 6px 8px;
	border-bottom: 2px solid var(--border-color);
	text-align: left;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	border-right: 1px solid var(--border-color);
}
.ppv2-table th:last-child {
	border-right: none;
}

.ppv2-action-th {
	width: 110px;
	min-width: 110px;
}

.ppv2-table td {
	padding: 5px 8px;
	border-bottom: 1px solid var(--border-color);
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.ppv2-table tbody tr:hover {
	background: var(--primary-light);
	cursor: pointer;
}
.ppv2-alt {
	background: var(--row-alt);
}
.ppv2-selected {
	background: var(--primary-light) !important;
}

.ppv2-link-val {
	color: royalblue;
	text-decoration: underline;
	cursor: pointer;
}
.ppv2-link-val:hover {
	color: #1a3fb5;
}

.ppv2-related-link {
	color: royalblue;
	text-decoration: underline;
	cursor: pointer;
}
.ppv2-related-link:hover {
	color: #1a3fb5;
}

/* ── Row action buttons ── */

.ppv2-action-td {
	white-space: nowrap;
	text-align: center;
	overflow: visible;
}

.ppv2-row-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 3px 7px;
	margin: 0 2px;
	background: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	color: var(--text-color);
	cursor: pointer;
	font-size: var(--font-size-base);
	line-height: 1;
}
.ppv2-row-btn:hover {
	background: var(--bg-surface);
	border-color: var(--border-color);
	color: var(--text-color);
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
	background: color-mix(in srgb, var(--color-primary) 30%, transparent);
}
</style>
