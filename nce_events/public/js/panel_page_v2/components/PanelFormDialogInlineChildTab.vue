<template>
	<div v-if="tab._inlineChild" class="ppv2-fd-inline-root">
		<p class="ppv2-fd-related-meta">
			{{ tab._inlineChild.child_doctype }}
			<span class="ppv2-fd-related-meta-link"> · {{ tab._inlineChild.parent_fieldname }}</span>
		</p>
		<p v-if="tab._inlineChild.captureError" class="ppv2-fd-related-warn">
			Schema note: {{ tab._inlineChild.captureError }}
		</p>

		<div v-if="columns.length" class="ppv2-fd-related-table-wrap ppv2-fd-inline-table-wrap theme-border theme-rounded-sm">
			<table class="ppv2-fd-related-table ppv2-fd-inline-table theme-table">
				<colgroup>
					<col v-if="showDeleteColumn" class="ppv2-fd-inline-col-del" />
					<col class="ppv2-fd-inline-col-no" />
					<col
						v-for="(col, ci) in columns"
						:key="'col-' + col.fieldname"
						:class="columnLayouts[ci].colgroupClass"
						:style="columnLayouts[ci].colStyle || undefined"
					/>
				</colgroup>
				<thead>
					<tr>
						<th v-if="showDeleteColumn" class="ppv2-fd-related-th ppv2-fd-inline-del-head" aria-hidden="true" />
						<th class="ppv2-fd-related-th ppv2-fd-inline-no-head">No.</th>
						<th
							v-for="(col, ci) in columns"
							:key="col.fieldname"
							class="ppv2-fd-related-th"
							:class="columnLayouts[ci].headerClass"
						>
							{{ col.label || col.fieldname
							}}<span v-if="columnMandatory(col)" class="ppv2-fd-reqd theme-text-danger" aria-hidden="true"> *</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(rw, ri) in rows" :key="rowKey(rw, ri)">
						<td v-if="showDeleteColumn" class="ppv2-fd-related-td ppv2-fd-inline-del-cell">
							<button
								type="button"
								class="ppv2-fd-inline-del-btn theme-text-danger"
								:disabled="readOnlyHost"
								@click="removeRow(ri)"
							>
								×
							</button>
						</td>
						<td class="ppv2-fd-related-td ppv2-fd-inline-no-cell">{{ ri + 1 }}</td>
						<td
							v-for="(col, ci) in columns"
							:key="col.fieldname"
							class="ppv2-fd-related-td"
							:class="[
								columnLayouts[ci].cellClass,
								{
									'ppv2-fd-related-td--editable': isColEditableForRow(rw, col),
								},
							]"
						>
							<button
								v-if="isInlineActionButtonColumn(col)"
								type="button"
								class="btn btn-default btn-xs ppv2-fd-inline-action-btn"
								:disabled="readOnlyHost || !isActionButtonEnabled(rw, col)"
								@click="onActionButton(rw, col)"
							>
								{{ col.label || col.fieldname }}
							</button>
							<PanelFormLinkField
								v-else-if="col.fieldtype === 'Link' && isColEditableForRow(rw, col)"
								:field="{ fieldname: col.fieldname, options: col.options }"
								:model-value="cellRaw(rw, col)"
								:read-only="readOnlyHost"
								@change="onLinkFieldChange(rw, col, $event)"
							/>
							<select
								v-else-if="isSelectColumn(col)"
								class="ppv2-fd-related-select"
								:value="String(cellRaw(rw, col) ?? '')"
								:disabled="readOnlyHost || !isColEditableForRow(rw, col)"
								@change="onSelectChange(rw, col, $event)"
							>
								<option value="">—</option>
								<option v-for="opt in selectOptions(col)" :key="opt" :value="opt">{{ opt }}</option>
							</select>
							<input
								v-else-if="col.fieldtype === 'Check'"
								type="checkbox"
								class="ppv2-fd-related-check"
								:disabled="readOnlyHost || !isColEditableForRow(rw, col)"
								:checked="cellTruthy(rw, col)"
								@change="onCheckChange(rw, col, $event)"
							/>
							<input
								v-else-if="isColEditableForRow(rw, col) && isNumberField(col)"
								type="number"
								class="ppv2-fd-related-inp"
								:value="numberInputValue(rw, col)"
								@input="onNumberInput(rw, col, $event)"
							/>
							<input
								v-else-if="isColEditableForRow(rw, col) && col.fieldtype === 'Date'"
								type="date"
								class="ppv2-fd-related-inp"
								:value="dateInputValue(rw, col)"
								@input="onDateInput(rw, col, $event)"
							/>
							<textarea
								v-else-if="isColEditableForRow(rw, col) && isLongText(col)"
								class="ppv2-fd-related-textarea"
								rows="2"
								:value="String(cellRaw(rw, col) ?? '')"
								@input="onTextInput(rw, col, $event)"
							/>
							<input
								v-else-if="isColEditableForRow(rw, col)"
								type="text"
								class="ppv2-fd-related-inp"
								:value="String(cellRaw(rw, col) ?? '')"
								@input="onTextInput(rw, col, $event)"
							/>
							<span v-else class="ppv2-fd-related-cell-text">{{ formatCell(rw, col) }}</span>
						</td>
					</tr>
				</tbody>
			</table>
			<p v-if="!rows.length" class="ppv2-fd-related-empty">No rows yet.</p>
			<div v-if="showAddRow" class="ppv2-fd-inline-actions">
				<button type="button" class="btn btn-default btn-xs" @click="addRow">
					Add Row
				</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed } from "vue";
import { listViewColumnsForGrid } from "../utils/formDialogPortalColumns.js";
import { isPortalGridColumnEditable } from "../utils/portalColumnEditable.js";
import {
	buildInlineColumnLayout,
	isInlineActionButtonColumn,
} from "../utils/inlineChildTableLayout.js";
import { openManageFieldsDialog } from "../utils/accessProfileManageFields.js";
import PanelFormLinkField from "./PanelFormLinkField.vue";

const props = defineProps({
	tab: { type: Object, required: true },
	formData: { type: Object, required: true },
	readOnlyHost: { type: Boolean, default: false },
	readOnlyFields: { type: Array, default: () => [] },
});

const ic = computed(() => props.tab._inlineChild || {});
const pfn = computed(() => String(ic.value.parent_fieldname || "").trim());
const childDoctype = computed(() => String(ic.value.child_doctype || "").trim());
const cannotAddRows = computed(() => ic.value.cannotAddRows === true);
const cannotDeleteRows = computed(() => ic.value.cannotDeleteRows === true);

const portalEditOpts = computed(() => ({
	readOnlyFields: props.readOnlyFields,
	linkField: pfn.value,
	readOnlyHost: props.readOnlyHost,
}));

const parsedInfo = computed(() => {
	const raw = ic.value.info;
	if (raw == null || !String(raw).trim()) {
		return {};
	}
	try {
		const o = typeof raw === "string" ? JSON.parse(raw) : raw;
		return o && typeof o === "object" ? o : {};
	} catch {
		return {};
	}
});

const metaFields = computed(() => {
	const fields = parsedInfo.value?.fields;
	return Array.isArray(fields) ? fields : [];
});

const nameFieldLabel = computed(() => String(parsedInfo.value?.name_field_label || "").trim());

const columns = computed(() =>
	listViewColumnsForGrid(metaFields.value, ic.value.portal_field_config || "", {
		nameFieldLabel: nameFieldLabel.value,
	}),
);

const columnLayouts = computed(() => buildInlineColumnLayout(columns.value));

const hasEditableColumn = computed(() =>
	columns.value.some(
		(c) => !isInlineActionButtonColumn(c) && isPortalGridColumnEditable(c, portalEditOpts.value),
	),
);

const showDeleteColumn = computed(
	() => hasEditableColumn.value && !cannotDeleteRows.value,
);

const showAddRow = computed(
	() => hasEditableColumn.value && !props.readOnlyHost && !cannotAddRows.value,
);

const rows = computed(() => {
	const k = pfn.value;
	if (!k || !props.formData) {
		return [];
	}
	let v = props.formData[k];
	if (!Array.isArray(v)) {
		v = [];
		props.formData[k] = v;
	}
	return v;
});

function rowKey(rw, ri) {
	return String(rw?.name != null ? rw.name : `new-${ri}`);
}

function isRowLocal(rw) {
	if (rw?.__islocal) {
		return true;
	}
	const n = rw?.name;
	if (n == null || n === "") {
		return true;
	}
	return String(n).startsWith("new-");
}

function columnMandatory(col) {
	if (!col || col.reqd == null) {
		return false;
	}
	return Number(col.reqd) === 1 || col.reqd === true || col.reqd === "1";
}

function isColEditable(col) {
	return isPortalGridColumnEditable(col, portalEditOpts.value);
}

function isColEditableForRow(rw, col) {
	if (!isColEditable(col)) {
		return false;
	}
	const roDep = String(col.read_only_depends_on || "").trim();
	if (roDep.includes("__islocal") && !isRowLocal(rw)) {
		return false;
	}
	return true;
}

function isActionButtonEnabled(rw, col) {
	if (col.fieldname === "manage_fields") {
		return (
			cellTruthy(rw, { fieldname: "restrict_write" }) &&
			Boolean(String(cellRaw(rw, { fieldname: "document_type" }) || "").trim())
		);
	}
	const dep = String(col.depends_on || "").trim();
	if (dep.includes("restrict_write")) {
		return cellTruthy(rw, { fieldname: "restrict_write" });
	}
	return true;
}

function isNumberField(col) {
	const ft = col?.fieldtype;
	return ft === "Int" || ft === "Float" || ft === "Currency";
}

function isLongText(col) {
	return col?.fieldtype === "Text" || col?.fieldtype === "Long Text";
}

function cellRaw(rw, col) {
	return rw[col.fieldname];
}

function cellTruthy(rw, col) {
	const v = cellRaw(rw, col);
	return v === 1 || v === true || v === "1" || v === "Yes";
}

function formatCell(rw, col) {
	const v = cellRaw(rw, col);
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

function isSelectColumn(col) {
	return col.fieldtype === "Select" || col.fieldtype === "Autocomplete";
}

function selectOptions(col) {
	const raw = col.options || "";
	return String(raw)
		.split("\n")
		.map((s) => s.trim())
		.filter(Boolean);
}

function numberInputValue(rw, col) {
	const v = cellRaw(rw, col);
	if (v == null || v === "") {
		return "";
	}
	return Number(v);
}

function dateInputValue(rw, col) {
	const v = cellRaw(rw, col);
	if (v == null || v === "") {
		return "";
	}
	const s = String(v);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function onSelectChange(rw, col, ev) {
	rw[col.fieldname] = ev.target.value || null;
}

function onCheckChange(rw, col, ev) {
	const checked = ev.target.checked ? 1 : 0;
	rw[col.fieldname] = checked;
	if (col.fieldname === "write" && checked) {
		rw.restrict_write = 0;
	}
	if (col.fieldname === "restrict_write" && checked) {
		rw.write = 0;
		if (!cellTruthy(rw, { fieldname: "read" })) {
			rw.read = 1;
		}
	}
}

function onNumberInput(rw, col, ev) {
	const s = ev.target.value;
	rw[col.fieldname] = s === "" ? null : Number(s);
}

function onDateInput(rw, col, ev) {
	rw[col.fieldname] = ev.target.value || null;
}

function onTextInput(rw, col, ev) {
	rw[col.fieldname] = ev.target.value;
}

function onLinkFieldChange(rw, col, payload) {
	const v = payload?.value ?? payload;
	rw[col.fieldname] = v || null;
}

function onActionButton(rw, col) {
	if (col.fieldname !== "manage_fields") {
		return;
	}
	const documentType = String(rw.document_type || "").trim();
	if (!documentType) {
		if (typeof frappe !== "undefined") {
			frappe.msgprint(__("Pick a Document Type on this row first."));
		}
		return;
	}
	if (!cellTruthy(rw, { fieldname: "restrict_write" })) {
		if (typeof frappe !== "undefined") {
			frappe.msgprint(__("Manage Fields is available when Restricted Write is checked."));
		}
		return;
	}
	openManageFieldsDialog(documentType);
}

function addRow() {
	const dt = childDoctype.value;
	const k = pfn.value;
	if (!k) {
		return;
	}
	if (!Array.isArray(props.formData[k])) {
		props.formData[k] = [];
	}
	const row = { doctype: dt, __islocal: 1 };
	props.formData[k].push(row);
}

function removeRow(index) {
	const k = pfn.value;
	const arr = props.formData[k];
	if (!Array.isArray(arr)) {
		return;
	}
	arr.splice(index, 1);
}
</script>

<style scoped>
.ppv2-fd-inline-root {
	padding-bottom: 8px;
}
.ppv2-fd-inline-table-wrap {
	width: 100%;
	max-height: min(52vh, 520px);
	overflow: auto;
	margin: 0 0 12px;
}
.ppv2-fd-inline-table {
	table-layout: fixed;
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size-base);
}
.ppv2-fd-inline-table .ppv2-fd-related-th {
	text-align: left;
	padding: 8px 10px;
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold, 600);
	position: sticky;
	top: 0;
	z-index: 1;
	white-space: normal;
	line-height: 1.25;
	vertical-align: bottom;
}
.ppv2-fd-inline-table .ppv2-fd-related-td {
	padding: 6px 10px;
	border-bottom: var(--nce-border-width) solid var(--nce-color-border);
	vertical-align: middle;
}
.ppv2-fd-inline-col-del {
	width: 2.25rem;
}
.ppv2-fd-inline-col-no {
	width: 2.75rem;
}
/* Generic child-table column roles (any inline child DocType). */
.ppv2-fd-child-col-primary {
	width: auto;
	min-width: 10rem;
}
.ppv2-fd-child-col-check {
	width: 6.75rem;
}
.ppv2-fd-child-col-action {
	width: 9.5rem;
}
.ppv2-fd-child-col-numeric {
	width: 6.25rem;
}
.ppv2-fd-child-col-compact {
	width: 7.5rem;
}
.ppv2-fd-child-col-medium {
	width: 8.5rem;
}
.ppv2-fd-child-th-check,
.ppv2-fd-child-td-check,
.ppv2-fd-child-th-numeric,
.ppv2-fd-child-td-numeric {
	text-align: center;
}
.ppv2-fd-child-th-action,
.ppv2-fd-child-td-action {
	text-align: center;
}
.ppv2-fd-child-th-primary,
.ppv2-fd-child-td-primary {
	text-align: left;
}
.ppv2-fd-child-td-primary :deep(.ppv2-fd-link-frappe) {
	width: 100%;
}
.ppv2-fd-child-td-check .ppv2-fd-related-check {
	margin: 0 auto;
	display: block;
}
.ppv2-fd-inline-del-head {
	width: 36px;
}
.ppv2-fd-inline-del-cell {
	width: 36px;
	text-align: center;
	vertical-align: middle;
}
.ppv2-fd-inline-no-head,
.ppv2-fd-inline-no-cell {
	width: 40px;
	text-align: center;
}
.ppv2-fd-inline-del-btn {
	border: none;
	background: transparent;
	font-size: calc(var(--font-size-base) * 1.35);
	line-height: 1;
	cursor: pointer;
	padding: 0 4px;
}
.ppv2-fd-inline-del-btn:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}
.ppv2-fd-inline-actions {
	margin-top: 8px;
}
.ppv2-fd-inline-action-btn {
	white-space: nowrap;
}
</style>
