<template>
	<div ref="panelRef" class="ppv2-panel">
		<div class="ppv2-header">
			<span class="ppv2-title">{{ title }}</span>
			<span v-if="config.open_card_on_click" class="ppv2-click-hint">Click on a row for details</span>
			<span class="ppv2-header-right">
				<button class="ppv2-hdr-btn" title="Filter" @click="toggleFilter">
					<i class="fa fa-filter"></i>
				</button>
				<button class="ppv2-hdr-btn" title="Export to Sheets" @click="$emit('sheets')">
					<i class="fa fa-table"></i>
				</button>
				<button v-if="showEmail" class="ppv2-hdr-btn" title="Email" @click="$emit('email')">
					<i class="fa fa-envelope"></i>
				</button>
				<button v-if="showSms" class="ppv2-hdr-btn" title="SMS" @click="$emit('sms')">
					<i class="fa fa-comment"></i>
				</button>
				<span class="ppv2-count">{{ rows.length }} / {{ total }} records</span>
				<button class="ppv2-hdr-btn ppv2-close-btn" title="Close" @click="$emit('close')">&times;</button>
			</span>
		</div>

		<div v-if="showFilterWidget" class="ppv2-filter-widget">
			<div v-for="(cond, i) in filters" :key="i" class="ppv2-filter-row">
				<select v-model="cond.field" class="ppv2-filter-col" @change="emitFilterChange">
					<option value="">— column —</option>
					<option v-for="col in columns" :key="col.fieldname" :value="col.fieldname">{{ col.label }}</option>
				</select>
				<span class="ppv2-filter-ops">
					<button
						v-for="op in ops"
						:key="op"
						:class="['ppv2-op-btn', { active: cond.op === op }]"
						@click="cond.op = op; emitFilterChange()"
					>{{ op }}</button>
				</span>
				<input v-model="cond.value" class="ppv2-filter-val" placeholder="value" @input="emitFilterDebounced">
				<button class="ppv2-filter-rm" @click="filters.splice(i, 1); emitFilterChange()">&times;</button>
			</div>
			<button class="ppv2-filter-add" @click="filters.push({ field: '', op: '=', value: '' })">Add Filter &#9660;</button>
		</div>

		<div v-if="loading" class="ppv2-loading">Loading…</div>

		<div v-else-if="error" class="ppv2-error">{{ error }}</div>

		<div v-else class="ppv2-body">
			<table class="ppv2-table">
				<thead>
					<tr>
						<th
							v-for="(col, ci) in dataCols"
							:key="col.fieldname"
							:style="{ width: colWidths[ci] ? colWidths[ci] + 'px' : 'auto', minWidth: '40px', position: 'relative' }"
						>
							{{ col.label }}
							<div class="ppv2-col-resize" @mousedown.prevent="startColResize($event, ci)" />
						</th>
						<th v-if="hasEmailAction || hasPhoneAction" class="ppv2-action-th" />
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(row, ri) in rows"
						:key="row.name || ri"
						:class="{ 'ppv2-alt': ri % 2 === 1, 'ppv2-selected': selectedName === row.name }"
						@click="$emit('row-click', row)"
					>
						<td
							v-for="col in dataCols"
							:key="col.fieldname"
							:style="cellStyle(row, col)"
						>
							<a
								v-if="col.is_link && col.link_doctype && getVal(row, col.fieldname)"
								class="ppv2-link-val"
								:href="formRoute(col.link_doctype, getVal(row, col.fieldname))"
								target="_blank"
								@click.stop
							>{{ cellValue(row, col) }}</a>
							<span
								v-else-if="col.is_related_link && col.related_doctype"
								class="ppv2-related-link"
								@click.stop="$emit('drill', { doctype: col.related_doctype, linkField: col.related_link_field, rowName: row.name })"
							>{{ cellValue(row, col) }}</span>
							<template v-else>{{ cellValue(row, col) }}</template>
						</td>
						<td v-if="hasEmailAction || hasPhoneAction" class="ppv2-action-td">
							<button
								v-if="hasEmailAction && rowHasEmail(row)"
								class="ppv2-row-btn"
								title="Send email"
								@click.stop="$emit('email-one', row)"
							><i class="fa fa-envelope"></i></button>
							<button
								v-if="hasPhoneAction && rowHasPhone(row)"
								class="ppv2-row-btn"
								title="Call"
								@click.stop="onCallRow(row)"
							><i class="fa fa-phone"></i></button>
							<button
								v-if="hasPhoneAction && rowHasPhone(row)"
								class="ppv2-row-btn"
								title="Send SMS"
								@click.stop="$emit('sms-one', row)"
							><i class="fa fa-comment"></i></button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from "vue";

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
});

const emit = defineEmits([
	"row-click", "close", "drill", "sheets", "email", "sms",
	"filter-change", "email-one", "sms-one",
]);

const ops = ["=", "!=", ">", "<", "like", "in"];
const showFilterWidget = ref(false);
const filters = reactive([]);
const colWidths = reactive({});
const panelRef = ref(null);
let _filterTimer = null;



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
			widths.forEach((w, i) => { colWidths[i] = w; });
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
	(props.config.bold_fields || []).forEach((f) => { s[f.toLowerCase()] = true; });
	return s;
});

const genderTintSet = computed(() => {
	const s = {};
	(props.config.gender_color_fields || []).forEach((f) => { s[f.toLowerCase()] = true; });
	return s;
});

const genderCol = computed(() => (props.config.gender_column || "").trim().toLowerCase());
const maleHex = computed(() => (props.config.male_hex || "").trim());
const femaleHex = computed(() => (props.config.female_hex || "").trim());
const tintByGender = computed(() => props.config.tint_by_gender || {});

function toggleFilter() {
	showFilterWidget.value = !showFilterWidget.value;
	if (showFilterWidget.value && !filters.length) {
		filters.push({ field: "", op: "=", value: "" });
	}
}

function activeFilters() {
	return filters.filter((f) => f.field && String(f.value || "") !== "")
		.map((f) => ({ field: f.field, op: f.op, value: f.value }));
}

function emitFilterChange() {
	if (_filterTimer) clearTimeout(_filterTimer);
	emit("filter-change", activeFilters());
}

function emitFilterDebounced() {
	if (_filterTimer) clearTimeout(_filterTimer);
	_filterTimer = setTimeout(() => emit("filter-change", activeFilters()), 1200);
}

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

.ppv2-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 5px 8px;
	background: var(--bg-header);
	color: var(--text-header);
	flex-shrink: 0;
}

.ppv2-title { font-weight: var(--font-weight-bold); font-size: 14px; }

.ppv2-header-right {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.ppv2-hdr-btn {
	background: none;
	border: none;
	color: var(--text-header);
	font-size: 18px;
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
	opacity: 0.8;
}
.ppv2-hdr-btn:hover { opacity: 1; }

.ppv2-count { font-size: var(--font-size-sm); opacity: 0.8; }

.ppv2-click-hint {
	font-size: var(--font-size-sm);
	opacity: 0.7;
	font-style: italic;
	margin-left: var(--spacing-sm);
}

/* ── Filter Widget ── */

.ppv2-filter-widget {
	padding: 6px 10px;
	background: var(--primary-light);
	border-bottom: 1px solid var(--border-color);
	flex-shrink: 0;
}

.ppv2-filter-row {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	margin-bottom: var(--spacing-xs);
}

.ppv2-filter-col {
	font-size: var(--font-size-sm);
	padding: 2px 4px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	min-width: 120px;
}

.ppv2-filter-ops { display: flex; gap: 1px; }

.ppv2-op-btn {
	font-size: 10px;
	padding: 2px 5px;
	border: 1px solid var(--border-color);
	background: var(--bg-card);
	cursor: pointer;
	border-radius: 2px;
}
.ppv2-op-btn.active {
	background: var(--bg-header);
	color: var(--text-header);
	border-color: var(--bg-header);
}

.ppv2-filter-val {
	font-size: var(--font-size-sm);
	padding: 2px 6px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	flex: 1;
	min-width: 60px;
}

.ppv2-filter-rm {
	background: none;
	border: none;
	color: #c0392b;
	font-size: 14px;
	cursor: pointer;
	padding: 0 4px;
}

.ppv2-filter-add {
	font-size: 10px;
	padding: 2px 8px;
	background: var(--bg-card);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	cursor: pointer;
	color: var(--color-primary);
}

/* ── Loading / Error ── */

.ppv2-loading, .ppv2-error {
	padding: 24px;
	text-align: center;
	font-size: var(--font-size-base);
}
.ppv2-loading { color: var(--color-primary); }
.ppv2-error { color: #e53e3e; }

/* ── Table ── */

.ppv2-body { flex: 1; overflow: auto; }

.ppv2-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
	font-family: Arial, sans-serif;
	table-layout: fixed;
}

.ppv2-table th {
	position: sticky;
	top: 0;
	background: color-mix(in srgb, var(--nce-color-secondary) 30%, white);
	color: color-mix(in srgb, var(--nce-color-secondary) 70%, black);
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
.ppv2-table th:last-child { border-right: none; }

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

.ppv2-table tbody tr:hover { background: var(--primary-light); cursor: pointer; }
.ppv2-alt { background: var(--row-alt); }
.ppv2-selected { background: var(--primary-light) !important; }

.ppv2-link-val {
	color: royalblue;
	text-decoration: underline;
	cursor: pointer;
}
.ppv2-link-val:hover { color: #1a3fb5; }

.ppv2-related-link {
	color: royalblue;
	text-decoration: underline;
	cursor: pointer;
}
.ppv2-related-link:hover { color: #1a3fb5; }

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
.ppv2-row-btn i { margin: 0; }

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
.ppv2-col-resize:hover { background: color-mix(in srgb, var(--color-primary) 30%, transparent); }
</style>
