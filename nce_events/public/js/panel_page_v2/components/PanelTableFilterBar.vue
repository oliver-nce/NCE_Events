<template>
	<div
		v-if="props.showFilter"
		class="ppv2-filter-widget border-b theme-border"
		:class="filterBarBgClass"
	>
		<div v-for="(cond, i) in filters" :key="i" class="ppv2-filter-row">
			<select
				v-model="cond.field"
				class="ppv2-filter-col"
				@change="
					onFilterFieldChange(cond);
					emitFilterChange();
				"
			>
				<option value="">— column —</option>
				<option v-for="col in columns" :key="col.fieldname" :value="col.fieldname">
					{{ col.label }}
				</option>
				<optgroup v-if="searchOnlyColumns.length" label="Search Only">
					<option
						v-for="col in searchOnlyColumns"
						:key="'so-' + col.fieldname"
						:value="col.fieldname"
					>
						{{ col.label }}
					</option>
				</optgroup>
			</select>
			<span v-if="cond.field" class="ppv2-filter-ops">
				<button
					v-for="op in opsForCond(cond)"
					:key="op"
					:class="[
						'ppv2-op-btn theme-border theme-rounded-sm',
						cond.op === op ? 'theme-bg-primary theme-border-primary' : 'theme-bg-card',
					]"
					@click="
						cond.op = op;
						emitFilterChange();
					"
				>
					{{ op }}
				</button>
			</span>
			<!-- Date / Datetime column: two mutually-exclusive inputs -->
			<template v-if="cond.field && isDateField(cond.field)">
				<input
					:value="cond._sqlDate || ''"
					class="ppv2-filter-val"
					placeholder="Enter a SQL date e.g. 1950-06-08"
					@input="
						onDateSqlInput(cond, $event.target.value);
						emitFilterDebounced();
					"
				/>
				<input
					:value="cond._daysAgo || ''"
					class="ppv2-filter-val"
					placeholder="OR enter days ago e.g. 30"
					@input="
						onDaysAgoInput(cond, $event.target.value);
						emitFilterDebounced();
					"
				/>
			</template>
			<input
				v-else-if="cond.field"
				v-model="cond.value"
				class="ppv2-filter-val"
				placeholder="value"
				@input="emitFilterDebounced"
			/>
			<button
				v-if="cond.field"
				class="ppv2-filter-rm theme-text-danger"
				@click="
					filters.splice(i, 1);
					emitFilterChange();
				"
			>
				&times;
			</button>
		</div>
		<button
			class="ppv2-filter-add theme-bg-card theme-border theme-rounded-sm theme-text-primary"
			@click="filters.push({ field: '', op: '>', value: '' })"
		>
			Add Filter &#9660;
		</button>
	</div>
</template>

<script setup>
import { reactive, watch, computed } from "vue";
import { panelChromeBg } from "../utils/panelChromeClasses.js";

const props = defineProps({
	columns: { type: Array, default: () => [] },
	searchOnlyColumns: { type: Array, default: () => [] },
	defaultFilters: { type: Array, default: () => [] },
	showFilter: { type: Boolean, default: false },
	config: { type: Object, default: () => ({}) },
});

const filterBarBgClass = computed(() =>
	panelChromeBg(props.config, "filter_bar_bg_class")
);

const emit = defineEmits(["filter-change", "show-filter"]);

const opsDefault = ["=", "!=", ">", "<", ">=", "<=", "like", "in"];
const opsDate = ["=", ">", "<"];
const filters = reactive([]);
let _filterTimer = null;

const DATE_FIELDTYPES = new Set(["Date", "Datetime"]);

function colByFieldname(fieldname) {
	return (
		props.columns.find((c) => c.fieldname === fieldname) ||
		props.searchOnlyColumns.find((c) => c.fieldname === fieldname) ||
		null
	);
}

function isDateField(fieldname) {
	if (!fieldname) return false;
	const col = colByFieldname(fieldname);
	if (col && col.fieldtype) return DATE_FIELDTYPES.has(col.fieldtype);
	// Heuristic fallback: common date-ish field name fragments
	return /date|_at$/.test(fieldname.toLowerCase());
}

function opsForCond(cond) {
	return isDateField(cond.field) ? opsDate : opsDefault;
}

function onFilterFieldChange(cond) {
	// Clear stale value whenever the field changes
	cond.value = "";
	cond._sqlDate = "";
	cond._daysAgo = "";
	// When switching to a date field, default op to > (most common intent)
	if (isDateField(cond.field) && !opsDate.includes(cond.op)) {
		cond.op = ">";
	}
	// When switching to a non-date field, reset op to = if it was a date-only op
	if (!isDateField(cond.field) && !opsDefault.includes(cond.op)) {
		cond.op = "=";
	}
}

function onDateSqlInput(cond, val) {
	cond._sqlDate = val;
	cond._daysAgo = "";
	cond.value = val;
}

function onDaysAgoInput(cond, val) {
	cond._daysAgo = val;
	cond._sqlDate = "";
	cond.value = val ? val + " days ago" : "";
}

function toggleFilter() {
	// Filter visibility is now controlled by parent via showFilter prop
	// This function is kept for backwards compatibility but does nothing
}

// When defaultFilters change (i.e. panel first loads with config), pre-populate
// the filter widget and open it — only if the user hasn't already entered filters.
watch(
	() => props.defaultFilters,
	(defs) => {
		if (!defs || !defs.length) return;
		// Only seed if user hasn't touched the filters yet
		const hasUserFilters = filters.some((f) => f.field && String(f.value ?? "") !== "");
		if (hasUserFilters) return;
		filters.splice(
			0,
			filters.length,
			...defs.map((f) => {
				let _sqlDate = "";
				let _daysAgo = "";
				if (f.value) {
					if (/days ago|month|today/i.test(f.value)) {
						_daysAgo = f.value.replace(/\s*days ago$/i, "").trim();
					} else {
						_sqlDate = f.value;
					}
				}
				return { field: f.field, op: f.op, value: f.value, _sqlDate, _daysAgo };
			})
		);
		emit("show-filter", true);
		emitFilterChange();
	},
	{ immediate: true }
);

function activeFilters() {
	return filters
		.filter((f) => f.field && String(f.value || "") !== "")
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
</script>

<style scoped>
.ppv2-filter-widget {
	padding: 6px 10px;
	flex-shrink: 0;
}

.ppv2-filter-row {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	margin-bottom: var(--spacing-xs);
}

.ppv2-filter-col {
	font-size: calc(var(--font-size-base) + 2px);
	padding: 3px 6px;
	border: 1px solid var(--nce-color-border);
	border-radius: var(--border-radius-sm);
	min-width: 120px;
}

.ppv2-filter-ops {
	display: flex;
	gap: 1px;
}

.ppv2-op-btn {
	font-size: calc(var(--font-size-base) + 2px);
	padding: 3px 8px;
	cursor: pointer;
}

.ppv2-filter-val {
	font-size: calc(var(--font-size-base) + 2px);
	padding: 3px 8px;
	border: 1px solid var(--nce-color-border);
	border-radius: var(--border-radius-sm);
	flex: 1;
	min-width: 60px;
}

.ppv2-filter-rm {
	background: none;
	border: none;
	font-size: var(--font-size-base);
	cursor: pointer;
	padding: 0 4px;
}

.ppv2-filter-add {
	font-size: var(--font-size-sm);
	padding: 2px 8px;
	cursor: pointer;
}
</style>
