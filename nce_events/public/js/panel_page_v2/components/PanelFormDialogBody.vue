<template>
	<div class="ppv2-fd-body">
		<div v-if="loading" class="ppv2-fd-loading">Loading…</div>
		<div v-else-if="error" class="ppv2-fd-error">{{ error }}</div>
		<template v-else-if="tabs.length">
			<div v-if="tabs.length > 1" class="ppv2-fd-tab-bar">
				<button
					v-for="(tab, ti) in tabs"
					:key="ti"
					type="button"
					class="ppv2-fd-tab-btn"
					:class="{ 'ppv2-fd-tab-active': activeTab === ti }"
					@click="activeTab = ti"
				>
					{{ tab.label }}
				</button>
			</div>

			<div class="ppv2-fd-tab-panels">
				<div
					v-for="(tab, ti) in tabs"
					:key="ti"
					class="ppv2-fd-tab-panel"
					:class="{ 'ppv2-fd-tab-panel-active': tabs.length === 1 || activeTab === ti }"
				>
					<!-- Related DocType tab: data table + optional field-metadata details -->
					<div v-if="tab._related" class="ppv2-fd-related-root">
						<p class="ppv2-fd-related-meta">
							{{ tab._related.doctype }}
							<span v-if="tab._related.link_field" class="ppv2-fd-related-meta-link">
								· {{ tab._related.link_field }}
							</span>
							<span
								v-if="tab._related.hop_chain && tab._related.hop_chain.length"
								class="ppv2-fd-related-meta-link"
							>
								· {{ tab._related.hop_chain.length }}-hop
							</span>
						</p>
						<p v-if="tab._related.captureError" class="ppv2-fd-related-warn">
							Schema note: {{ tab._related.captureError }}
						</p>

						<p v-if="!tab._related.child_row_name" class="ppv2-fd-related-hint">
							Related tab is missing a server row id. Re-save the Form Dialog from Desk.
						</p>
						<p v-else-if="!rootDocName" class="ppv2-fd-related-hint">
							Save the document to load related rows.
						</p>
						<template v-else>
							<div v-if="relatedState[ti]?.loading" class="ppv2-fd-related-rows-loading">
								Loading related rows…
							</div>
							<div v-else-if="relatedState[ti]?.error" class="ppv2-fd-related-rows-err">
								{{ relatedState[ti].error }}
							</div>
							<div
								v-else-if="(relatedState[ti]?.columns || []).length"
								class="ppv2-fd-related-table-wrap"
							>
								<table class="ppv2-fd-related-table">
									<thead>
										<tr>
											<th
												v-for="col in relatedState[ti].columns"
												:key="col.fieldname"
												class="ppv2-fd-related-th"
											>
												{{ col.label || col.fieldname }}
											</th>
										</tr>
									</thead>
									<tbody>
										<tr
											v-for="(rw, ri) in relatedState[ti].rows || []"
											:key="String(rw.name != null ? rw.name : ri)"
										>
											<td
												v-for="col in relatedState[ti].columns"
												:key="col.fieldname"
												class="ppv2-fd-related-td"
											>
												<select
													v-if="isSelectColumn(col)"
													class="ppv2-fd-related-select"
													:value="String(relatedCellRaw(rw, col) ?? '')"
													:disabled="!isRelatedColEditable(col)"
													:aria-label="col.label || col.fieldname"
													@change="onRelatedSelectChange(rw, col, $event)"
												>
													<option value="">—</option>
													<option
														v-for="opt in selectOptionsForCell(col, rw)"
														:key="opt"
														:value="opt"
													>
														{{ opt }}
													</option>
												</select>
												<input
													v-else-if="col.fieldtype === 'Check'"
													type="checkbox"
													class="ppv2-fd-related-check"
													:disabled="!isRelatedColEditable(col)"
													:checked="relatedCellTruthy(rw, col)"
													@change="onRelatedCheckChange(rw, col, $event)"
												/>
												<input
													v-else-if="isRelatedColEditable(col) && isRelatedNumberField(col)"
													type="number"
													class="ppv2-fd-related-inp"
													:value="relatedNumberInputValue(rw, col)"
													@input="onRelatedNumberInput(rw, col, $event)"
												/>
												<input
													v-else-if="isRelatedColEditable(col) && col.fieldtype === 'Date'"
													type="date"
													class="ppv2-fd-related-inp"
													:value="relatedDateInputValue(rw, col)"
													@input="onRelatedDateInput(rw, col, $event)"
												/>
												<textarea
													v-else-if="isRelatedColEditable(col) && isRelatedLongText(col)"
													class="ppv2-fd-related-textarea"
													rows="2"
													:value="String(relatedCellRaw(rw, col) ?? '')"
													@input="onRelatedTextInput(rw, col, $event)"
												/>
												<input
													v-else-if="isRelatedColEditable(col)"
													type="text"
													class="ppv2-fd-related-inp"
													:value="String(relatedCellRaw(rw, col) ?? '')"
													@input="onRelatedTextInput(rw, col, $event)"
												/>
												<span v-else class="ppv2-fd-related-cell-text">{{
													formatRelatedCell(rw, col)
												}}</span>
											</td>
										</tr>
									</tbody>
								</table>
								<p
									v-if="!(relatedState[ti].rows || []).length"
									class="ppv2-fd-related-empty"
								>
									No related records.
								</p>
							</div>
						</template>

						<details
							v-if="tab.sections && tab.sections.length"
							class="ppv2-fd-related-schema"
						>
							<summary class="ppv2-fd-related-schema-sum">Field metadata</summary>
							<div
								class="ppv2-fd-related-preview"
								:style="{ '--ppv2-fd-rel-lbl': relatedLabelColPx(ti) + 'px' }"
							>
								<div
									class="ppv2-fd-related-sizer-row"
									title="Drag to resize the label column"
								>
									<span
										class="ppv2-fd-related-sizer-spacer"
										:style="{ width: relatedLabelColPx(ti) + 'px' }"
									/>
									<button
										type="button"
										class="ppv2-fd-related-sizer-grip"
										aria-label="Resize label column"
										@mousedown.prevent="onRelatedLabelResizeDown(ti, $event)"
									/>
								</div>
								<div
									v-for="(section, si) in tab.sections"
									:key="'rs' + si"
									class="ppv2-fd-section"
								>
									<h3 v-if="section.label" class="ppv2-fd-section-label">{{ section.label }}</h3>
									<div
										class="ppv2-fd-columns"
										:style="{
											gridTemplateColumns:
												'repeat(' + Math.max(section.columns.length, 1) + ', 1fr)',
										}"
									>
										<div v-for="(col, ci) in section.columns" :key="'rc' + ci">
											<div
												v-for="field in col.fields"
												:key="field.fieldname"
												class="ppv2-fd-related-field-row"
											>
												<span class="ppv2-fd-related-fn">{{
													field.label || field.fieldname
												}}</span>
												<span class="ppv2-fd-related-ft">{{ field.fieldtype }}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</details>
						<div
							v-else
							class="ppv2-fd-related-placeholder ppv2-fd-related-placeholder-compact"
						>
							<p class="ppv2-fd-related-placeholder-text">
								{{ tab._related.label || tab._related.doctype }}
							</p>
							<p v-if="!tab._related.captureError" class="ppv2-fd-related-placeholder-sub">
								No field layout stored for this tab.
							</p>
						</div>
					</div>

					<!-- Normal frozen-schema tab -->
					<template v-else>
						<div
							v-for="(section, si) in tab.sections"
							:key="si"
							class="ppv2-fd-section"
						>
							<h3 v-if="section.label" class="ppv2-fd-section-label">
								{{ section.label }}
							</h3>
							<p v-if="section.description" class="ppv2-fd-section-desc">
								{{ section.description }}
							</p>

							<div
								class="ppv2-fd-columns"
								:style="{ gridTemplateColumns: 'repeat(' + section.columns.length + ', 1fr)' }"
							>
								<div v-for="(col, ci) in section.columns" :key="ci">
									<PanelFormField
										v-for="field in col.fields"
										:key="field.fieldname"
										:field="field"
										:model-value="formData[field.fieldname]"
										:visible="isFieldVisible(field)"
										:mandatory="isFieldMandatory(field)"
										:read-only="isFieldReadOnly(field)"
										@change="(p) => $emit('field-change', p)"
										@link-change="(p) => $emit('link-change', p)"
									/>
								</div>
							</div>
						</div>
					</template>
				</div>
			</div>

			<div v-if="validationError" class="ppv2-fd-validation-error">
				{{ validationError }}
			</div>
		</template>
	</div>
</template>

<script setup>
import { reactive, watch, onUnmounted, nextTick } from "vue";
import PanelFormField from "./PanelFormField.vue";
import { frappeCall } from "../utils/frappeCall.js";

const props = defineProps({
	definitionName: { type: String, default: "" },
	rootDoctype: { type: String, default: "" },
	rootDocName: { type: String, default: null },
	loading: { type: Boolean, default: false },
	error: { type: String, default: null },
	tabs: { type: Array, default: () => [] },
	validationError: { type: String, default: null },
	formData: { type: Object, required: true },
	isFieldVisible: { type: Function, required: true },
	isFieldMandatory: { type: Function, required: true },
	isFieldReadOnly: { type: Function, required: true },
});

const emit = defineEmits(["field-change", "link-change", "related-dirty"]);

const activeTab = defineModel("activeTab", { type: Number, required: true });

/** @type {Record<number, { loading?: boolean, error?: string|null, rows?: object[], columns?: object[], fetchKey?: string }>} */
const relatedState = reactive({});
/** @type {Record<number, number>} */
const relatedSeq = reactive({});

/** @type {Record<number, number>} */
const relatedLabelColByTab = reactive({});
let relResizeTabIndex = null;
let relResizeStartX = 0;
let relResizeStartW = 0;

function relatedLabelStorageKey(ti) {
	return `nce_fd_rel_lblw:${(props.definitionName || "_").trim() || "_"}:${ti}`;
}

function readSavedRelatedLabelWidth(ti) {
	try {
		const raw = localStorage.getItem(relatedLabelStorageKey(ti));
		const n = parseInt(String(raw), 10);
		if (Number.isFinite(n) && n >= 72 && n <= 640) {
			return n;
		}
	} catch {
		/* ignore */
	}
	return null;
}

/** Default label column width from longest label / fieldname in that tab. */
function defaultRelatedLabelWidthForTab(tab) {
	let maxChars = 8;
	for (const section of tab.sections || []) {
		for (const col of section.columns || []) {
			for (const f of col.fields || []) {
				const t = String(f.label || f.fieldname || "").length;
				if (t > maxChars) {
					maxChars = t;
				}
			}
		}
	}
	return Math.min(480, Math.max(120, Math.round(maxChars * 7.2 + 28)));
}

function syncRelatedLabelWidthsFromTabs() {
	const tabs = props.tabs || [];
	for (const key of Object.keys(relatedLabelColByTab)) {
		const i = Number(key);
		if (!Number.isInteger(i) || i < 0 || i >= tabs.length || !tabs[i]?._related) {
			delete relatedLabelColByTab[key];
		}
	}
	for (let ti = 0; ti < tabs.length; ti++) {
		const tab = tabs[ti];
		if (!tab || !tab._related) {
			continue;
		}
		const saved = readSavedRelatedLabelWidth(ti);
		if (saved != null) {
			relatedLabelColByTab[ti] = saved;
		} else if (tab.sections && tab.sections.length) {
			relatedLabelColByTab[ti] = defaultRelatedLabelWidthForTab(tab);
		} else {
			relatedLabelColByTab[ti] = 200;
		}
	}
}

watch(
	() => [props.definitionName, props.tabs],
	() => {
		syncRelatedLabelWidthsFromTabs();
	},
	{ deep: true, immediate: true },
);

function clearAllRelatedFetch() {
	for (const k of Object.keys(relatedState)) {
		delete relatedState[k];
	}
	for (const k of Object.keys(relatedSeq)) {
		delete relatedSeq[k];
	}
}

function relatedFetchKey() {
	const d = (props.definitionName || "").trim();
	const dt = (props.rootDoctype || "").trim();
	const dn = String(props.rootDocName || "").trim();
	return `${d}\0${dt}\0${dn}`;
}

async function fetchRelatedForTab(ti) {
	const tabs = props.tabs || [];
	const tab = tabs[ti];
	if (
		!tab?._related?.child_row_name ||
		!props.rootDocName ||
		!String(props.definitionName || "").trim() ||
		!String(props.rootDoctype || "").trim()
	) {
		return;
	}
	const fk = relatedFetchKey();
	const seq = (relatedSeq[ti] || 0) + 1;
	relatedSeq[ti] = seq;
	if (!relatedState[ti]) {
		relatedState[ti] = {};
	}
	relatedState[ti].loading = true;
	relatedState[ti].error = null;
	try {
		const msg = await frappeCall("nce_events.api.form_dialog_api.get_form_dialog_related_rows", {
			definition: String(props.definitionName).trim(),
			related_row_name: tab._related.child_row_name,
			root_doctype: String(props.rootDoctype).trim(),
			root_name: String(props.rootDocName).trim(),
			limit: 500,
		});
		if (relatedSeq[ti] !== seq) {
			return;
		}
		relatedState[ti].fetchKey = fk;
		const rawRows = Array.isArray(msg.rows) ? msg.rows : [];
		relatedState[ti].baseline = JSON.parse(JSON.stringify(rawRows));
		relatedState[ti].rows = rawRows.map((r) => ({ ...r }));
		relatedState[ti].columns = Array.isArray(msg.columns) ? msg.columns : [];
		emit("related-dirty", false);
	} catch (e) {
		if (relatedSeq[ti] !== seq) {
			return;
		}
		relatedState[ti].rows = [];
		relatedState[ti].baseline = [];
		relatedState[ti].columns = [];
		relatedState[ti].error = e?.message || String(e) || "Failed to load related rows";
	} finally {
		if (relatedSeq[ti] === seq) {
			relatedState[ti].loading = false;
		}
	}
}

watch(
	() => [props.loading, props.definitionName, props.rootDoctype, props.rootDocName, props.tabs],
	() => {
		if (props.loading) {
			clearAllRelatedFetch();
			return;
		}
		const tabs = props.tabs || [];
		const fk = relatedFetchKey();
		for (let ti = 0; ti < tabs.length; ti++) {
			const tab = tabs[ti];
			if (
				!tab?._related?.child_row_name ||
				!props.rootDocName ||
				!String(props.definitionName || "").trim() ||
				!String(props.rootDoctype || "").trim()
			) {
				delete relatedState[ti];
				delete relatedSeq[ti];
				continue;
			}
			const st = relatedState[ti];
			if (st && st.fetchKey === fk && !st.loading && Array.isArray(st.rows)) {
				continue;
			}
			fetchRelatedForTab(ti);
		}
		for (const key of Object.keys(relatedState)) {
			const i = Number(key);
			if (!Number.isInteger(i) || i < 0 || i >= tabs.length || !tabs[i]?._related) {
				delete relatedState[key];
				delete relatedSeq[key];
			}
		}
	},
	{ deep: true, immediate: true },
);

function parseSelectOptions(optionsStr) {
	if (optionsStr == null || typeof optionsStr !== "string") {
		return [];
	}
	return optionsStr
		.split("\n")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function isSelectColumn(col) {
	return !!(col && col.fieldtype === "Select");
}

/** Options from DocType meta plus current row value if missing from the list. */
function selectOptionsForCell(col, rw) {
	const base = parseSelectOptions(col.options);
	const cur = String(relatedCellRaw(rw, col) ?? "").trim();
	if (cur && !base.includes(cur)) {
		return [...base, cur];
	}
	if (base.length) {
		return base;
	}
	return cur ? [cur] : [];
}

function relatedCellRaw(rw, col) {
	if (!rw || !col) {
		return null;
	}
	return rw[col.fieldname];
}

function relatedCellTruthy(rw, col) {
	const v = relatedCellRaw(rw, col);
	return v === 1 || v === true || v === "1" || v === "Yes";
}

function formatRelatedCell(rw, col) {
	const v = relatedCellRaw(rw, col);
	if (v == null || v === "") {
		return "";
	}
	if (typeof v === "object") {
		try {
			return JSON.stringify(v);
		} catch {
			return String(v);
		}
	}
	return String(v);
}

const RELATED_GRID_NON_EDITABLE_TYPES = new Set([
	"Link",
	"Dynamic Link",
	"Table",
	"Attach",
	"Attach Image",
	"HTML",
	"Read Only",
	"Button",
	"Barcode",
	"Geolocation",
]);

function isRelatedColEditable(col) {
	if (!col || !(Number(col.editable) === 1 || col.editable === true)) {
		return false;
	}
	const ft = col.fieldtype;
	return !RELATED_GRID_NON_EDITABLE_TYPES.has(ft);
}

function isRelatedNumberField(col) {
	const ft = col?.fieldtype;
	return ft === "Int" || ft === "Float" || ft === "Currency";
}

function isRelatedLongText(col) {
	return col?.fieldtype === "Text" || col?.fieldtype === "Long Text";
}

function valuesEqual(a, b) {
	if (a === b) {
		return true;
	}
	if (a == null && b == null) {
		return true;
	}
	if (a == null || b == null) {
		return false;
	}
	if (
		(a === 0 || a === "0" || a === false) &&
		(b === 0 || b === "0" || b === false)
	) {
		return true;
	}
	if (
		(a === 1 || a === "1" || a === true) &&
		(b === 1 || b === "1" || b === true)
	) {
		return true;
	}
	return String(a) === String(b);
}

function hasRelatedDirtyAny() {
	for (const k of Object.keys(relatedState)) {
		const ti = Number(k);
		if (!Number.isInteger(ti)) {
			continue;
		}
		if (relatedRowsDirty(ti)) {
			return true;
		}
	}
	return false;
}

let relatedDirtyEmitScheduled = false;
function scheduleRelatedDirtyEmit() {
	if (relatedDirtyEmitScheduled) {
		return;
	}
	relatedDirtyEmitScheduled = true;
	nextTick(() => {
		relatedDirtyEmitScheduled = false;
		emit("related-dirty", hasRelatedDirtyAny());
	});
}

function relatedRowsDirty(ti) {
	const st = relatedState[ti];
	if (!st?.rows || !st.baseline) {
		return false;
	}
	const cols = (st.columns || []).filter(isRelatedColEditable);
	if (!cols.length) {
		return false;
	}
	for (const rw of st.rows) {
		const name = rw.name;
		if (!name) {
			continue;
		}
		const base = st.baseline.find((b) => b.name === name);
		if (!base) {
			continue;
		}
		for (const c of cols) {
			if (!valuesEqual(rw[c.fieldname], base[c.fieldname])) {
				return true;
			}
		}
	}
	return false;
}

function buildRelatedUpdates(ti) {
	const st = relatedState[ti];
	if (!st?.rows?.length || !st.baseline?.length) {
		return [];
	}
	const cols = (st.columns || []).filter(isRelatedColEditable);
	if (!cols.length) {
		return [];
	}
	const updates = [];
	for (const rw of st.rows) {
		const name = rw.name;
		if (!name) {
			continue;
		}
		const base = st.baseline.find((b) => b.name === name);
		if (!base) {
			continue;
		}
		const values = {};
		for (const c of cols) {
			const fn = c.fieldname;
			if (!valuesEqual(rw[fn], base[fn])) {
				values[fn] = rw[fn];
			}
		}
		if (Object.keys(values).length) {
			updates.push({ name, values });
		}
	}
	return updates;
}

function onRelatedSelectChange(rw, col, ev) {
	rw[col.fieldname] = ev.target.value;
	scheduleRelatedDirtyEmit();
}

function onRelatedCheckChange(rw, col, ev) {
	rw[col.fieldname] = ev.target.checked ? 1 : 0;
	scheduleRelatedDirtyEmit();
}

function relatedNumberInputValue(rw, col) {
	const v = relatedCellRaw(rw, col);
	if (v == null || v === "") {
		return "";
	}
	return Number(v);
}

function onRelatedNumberInput(rw, col, ev) {
	const s = ev.target.value;
	rw[col.fieldname] = s === "" ? null : Number(s);
	scheduleRelatedDirtyEmit();
}

function relatedDateInputValue(rw, col) {
	const v = relatedCellRaw(rw, col);
	if (v == null || v === "") {
		return "";
	}
	return String(v).slice(0, 10);
}

function onRelatedDateInput(rw, col, ev) {
	rw[col.fieldname] = ev.target.value || null;
	scheduleRelatedDirtyEmit();
}

function onRelatedTextInput(rw, col, ev) {
	rw[col.fieldname] = ev.target.value;
	scheduleRelatedDirtyEmit();
}

function resetRelatedToBaseline() {
	for (const k of Object.keys(relatedState)) {
		const ti = Number(k);
		const st = relatedState[ti];
		if (!st?.baseline || !Array.isArray(st.rows)) {
			continue;
		}
		const copy = JSON.parse(JSON.stringify(st.baseline));
		st.rows.splice(0, st.rows.length);
		for (const r of copy) {
			st.rows.push({ ...r });
		}
	}
	emit("related-dirty", false);
}

async function saveAllRelatedRows() {
	const dn = String(props.rootDocName || "").trim();
	const defn = String(props.definitionName || "").trim();
	const dt = String(props.rootDoctype || "").trim();
	if (!dn || !defn || !dt) {
		return;
	}
	const tabs = props.tabs || [];
	for (let ti = 0; ti < tabs.length; ti++) {
		const tab = tabs[ti];
		const crn = tab?._related?.child_row_name;
		if (!crn) {
			continue;
		}
		const updates = buildRelatedUpdates(ti);
		if (!updates.length) {
			continue;
		}
		await frappeCall("nce_events.api.form_dialog_api.save_form_dialog_related_rows", {
			definition: defn,
			related_row_name: crn,
			root_doctype: dt,
			root_name: dn,
			updates,
		});
		const st = relatedState[ti];
		if (st?.rows) {
			st.baseline = JSON.parse(JSON.stringify(st.rows));
		}
	}
	emit("related-dirty", false);
}

defineExpose({ saveAllRelatedRows, resetRelatedToBaseline });

function relatedLabelColPx(ti) {
	const w = relatedLabelColByTab[ti];
	return typeof w === "number" && Number.isFinite(w) ? w : 200;
}

function onRelatedLabelResizeMove(ev) {
	if (relResizeTabIndex == null) {
		return;
	}
	const dx = ev.clientX - relResizeStartX;
	const w = Math.min(640, Math.max(72, relResizeStartW + dx));
	relatedLabelColByTab[relResizeTabIndex] = w;
}

function onRelatedLabelResizeUp() {
	if (relResizeTabIndex != null) {
		try {
			localStorage.setItem(
				relatedLabelStorageKey(relResizeTabIndex),
				String(relatedLabelColByTab[relResizeTabIndex]),
			);
		} catch {
			/* ignore quota */
		}
	}
	relResizeTabIndex = null;
	window.removeEventListener("mousemove", onRelatedLabelResizeMove);
	window.removeEventListener("mouseup", onRelatedLabelResizeUp);
}

function onRelatedLabelResizeDown(ti, ev) {
	relResizeTabIndex = ti;
	relResizeStartX = ev.clientX;
	relResizeStartW = relatedLabelColPx(ti);
	window.addEventListener("mousemove", onRelatedLabelResizeMove);
	window.addEventListener("mouseup", onRelatedLabelResizeUp);
}

onUnmounted(() => {
	window.removeEventListener("mousemove", onRelatedLabelResizeMove);
	window.removeEventListener("mouseup", onRelatedLabelResizeUp);
});
</script>

<style scoped>
.ppv2-fd-body {
	flex: 1 1 auto;
	overflow-y: auto;
	overflow-x: hidden;
	padding: 16px;
}
.ppv2-fd-loading {
	text-align: center;
	padding: 32px;
	color: var(--text-muted);
	font-size: var(--font-size-base);
}
.ppv2-fd-error {
	text-align: center;
	padding: 32px;
	color: #c0392b;
	font-size: var(--font-size-base);
}
.ppv2-fd-tab-bar {
	display: flex;
	gap: 4px;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border-color);
}
.ppv2-fd-tab-btn {
	padding: 6px 14px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	color: var(--text-color);
	font-size: var(--font-size-base, 14px);
	font-weight: var(--font-weight-bold, 600);
	cursor: pointer;
}
.ppv2-fd-tab-active {
	background: var(--bg-header);
	color: var(--text-header);
	border-color: var(--bg-header);
}
.ppv2-fd-tab-panels {
	display: grid;
	overflow: visible;
}
.ppv2-fd-tab-panel {
	grid-area: 1 / 1;
	visibility: hidden;
	pointer-events: none;
	overflow: visible;
}
.ppv2-fd-tab-panel-active {
	visibility: visible;
	pointer-events: auto;
}
.ppv2-fd-section {
	margin-bottom: 16px;
}
.ppv2-fd-section-label {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold);
	color: var(--text-color);
	margin: 0 0 8px;
}
.ppv2-fd-section-desc {
	font-size: var(--font-size-sm);
	color: var(--text-muted);
	margin: 0 0 8px;
}
.ppv2-fd-columns {
	display: grid;
	gap: 12px;
	overflow: visible;
}
.ppv2-fd-columns > div {
	min-width: 0;
	overflow: visible;
}
.ppv2-fd-validation-error {
    margin-top: 8px;
    padding: 8px 12px;
    background: #fef0f0;
    border: 1px solid #e74c3c;
    border-radius: var(--border-radius-sm, 4px);
    color: #c0392b;
    font-size: var(--font-size-sm);
}
.ppv2-fd-related-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    color: var(--text-muted);
}
.ppv2-fd-related-placeholder-text {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-related-placeholder-sub {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    margin-top: 8px;
}
.ppv2-fd-related-preview {
    padding: 4px 0 12px;
}
.ppv2-fd-related-meta {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    margin: 0 0 12px;
}
.ppv2-fd-related-meta-link {
    font-weight: normal;
}
.ppv2-fd-related-warn {
    font-size: var(--font-size-sm);
    color: #a67c00;
    margin: 0 0 12px;
}
.ppv2-fd-related-sizer-row {
	display: flex;
	align-items: stretch;
	height: 6px;
	margin: 0 0 8px;
	position: relative;
	user-select: none;
}
.ppv2-fd-related-sizer-spacer {
	flex-shrink: 0;
	pointer-events: none;
}
.ppv2-fd-related-sizer-grip {
	width: 10px;
	margin-left: -5px;
	flex-shrink: 0;
	padding: 0;
	border: none;
	border-radius: 2px;
	background: transparent;
	cursor: col-resize;
}
.ppv2-fd-related-sizer-grip:hover,
.ppv2-fd-related-sizer-grip:focus-visible {
	background: var(--border-color, #dfe2e5);
	outline: none;
}
.ppv2-fd-related-field-row {
	display: grid;
	grid-template-columns: minmax(0, var(--ppv2-fd-rel-lbl, 200px)) minmax(0, 1fr);
	align-items: start;
	column-gap: 10px;
	padding: 6px 8px;
	margin-bottom: 4px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	font-size: var(--font-size-sm);
}
.ppv2-fd-related-fn {
	color: var(--text-color);
	min-width: 0;
	overflow-wrap: anywhere;
	word-break: break-word;
}
.ppv2-fd-related-ft {
	color: var(--text-muted);
	min-width: 0;
	overflow-wrap: anywhere;
	word-break: break-word;
	text-align: right;
}
.ppv2-fd-related-placeholder-meta {
	margin: 0 0 8px;
	text-align: center;
}
.ppv2-fd-related-root {
	min-height: 0;
}
.ppv2-fd-related-hint {
	font-size: var(--font-size-sm);
	color: var(--text-muted);
	margin: 0 0 12px;
}
.ppv2-fd-related-rows-loading,
.ppv2-fd-related-rows-err {
	font-size: var(--font-size-sm);
	margin: 0 0 12px;
}
.ppv2-fd-related-rows-err {
	color: #c0392b;
}
.ppv2-fd-related-table-wrap {
	max-height: min(52vh, 520px);
	overflow: auto;
	margin: 0 0 12px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
}
.ppv2-fd-related-table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size-sm, 13px);
}
.ppv2-fd-related-th {
	text-align: left;
	padding: 8px 10px;
	background: var(--bg-header, #f0f4f8);
	color: var(--text-header, #36414c);
	font-weight: var(--font-weight-bold, 600);
	border-bottom: 1px solid var(--border-color);
	position: sticky;
	top: 0;
	z-index: 1;
}
.ppv2-fd-related-td {
	padding: 6px 10px;
	border-bottom: 1px solid var(--border-color);
	vertical-align: middle;
	min-width: 4rem;
}
.ppv2-fd-related-td:last-child {
	border-right: none;
}
.ppv2-fd-related-cell-text {
	color: var(--text-color);
	word-break: break-word;
}
.ppv2-fd-related-select {
	max-width: 100%;
	min-width: 6rem;
	padding: 4px 8px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	color: var(--text-color);
	font-size: inherit;
}
.ppv2-fd-related-inp,
.ppv2-fd-related-textarea {
	max-width: 100%;
	width: 100%;
	box-sizing: border-box;
	padding: 4px 8px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	color: var(--text-color);
	font-size: inherit;
	font-family: inherit;
}
.ppv2-fd-related-textarea {
	resize: vertical;
	min-height: 2.5rem;
}
.ppv2-fd-related-check {
	width: 1rem;
	height: 1rem;
	accent-color: var(--bg-header, #2490ef);
}
.ppv2-fd-related-empty {
	margin: 10px 12px 12px;
	font-size: var(--font-size-sm);
	color: var(--text-muted);
}
.ppv2-fd-related-schema {
	margin-top: 8px;
	font-size: var(--font-size-sm);
}
.ppv2-fd-related-schema-sum {
	cursor: pointer;
	color: var(--text-muted);
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-related-placeholder-compact {
	min-height: 0;
	flex-direction: column;
	padding: 8px 0 0;
}
</style>
