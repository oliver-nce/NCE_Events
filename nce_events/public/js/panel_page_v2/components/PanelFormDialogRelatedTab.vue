<template>
	<!-- Related DocType tab: data table + optional field-metadata details -->
	<div v-if="tab._related" class="ppv2-fd-related-root">
		<div class="ppv2-fd-related-meta-row">
			<p class="ppv2-fd-related-meta theme-text-muted">
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
			<button
				type="button"
				class="btn btn-default btn-sm ppv2-fd-related-go-to"
				:disabled="!goToEnabled || goToBusy"
				title="Open panel for this related list"
				@click="onGoToPanel"
			>
				Go to
			</button>
		</div>
		<p v-if="tab._related.captureError" class="ppv2-fd-related-warn">
			Schema note: {{ tab._related.captureError }}
		</p>

		<p v-if="!tab._related.child_row_name" class="ppv2-fd-related-hint theme-text-muted">
			Related tab is missing a server row id. Re-save the Form Dialog from Desk.
		</p>
		<p v-else-if="!rootDocName" class="ppv2-fd-related-hint theme-text-muted">
			Save the document to load related rows.
		</p>
		<template v-else>
			<div v-if="relatedState[ti]?.loading" class="ppv2-fd-related-rows-loading theme-text-muted">
				Loading related rows…
			</div>
			<div v-else-if="relatedState[ti]?.error" class="ppv2-fd-related-rows-err theme-text-danger">
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
								{{ col.label || col.fieldname
								}}<span
									v-if="relatedColumnMandatory(col)"
									class="ppv2-fd-reqd theme-text-danger"
									aria-hidden="true"
								>
									*
								</span>
							</th>
							<th
								v-if="(relatedState[ti].actions || []).length"
								class="ppv2-fd-related-th ppv2-fd-related-th-actions"
							>
								Actions
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
								:class="{
									'ppv2-fd-related-td--editable': isRelatedColEditable(col),
									'ppv2-fd-related-td--dirty': isRelatedCellDirty(ti, rw, col),
									'theme-text-danger': isRelatedCellDirty(ti, rw, col),
								}"
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
									v-else-if="
										isRelatedColEditable(col) && isRelatedNumberField(col)
									"
									type="number"
									class="ppv2-fd-related-inp"
									:value="relatedNumberInputValue(rw, col)"
									@input="onRelatedNumberInput(rw, col, $event)"
								/>
								<input
									v-else-if="
										isRelatedColEditable(col) && col.fieldtype === 'Date'
									"
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
							<td
								v-if="(relatedState[ti].actions || []).length"
								class="ppv2-fd-related-td ppv2-fd-related-td-actions"
							>
								<button
									v-for="act in relatedState[ti].actions"
									:key="act.action_id"
									type="button"
									class="btn btn-default btn-xs ppv2-fd-related-action-btn"
									:disabled="actionRunningKey === actionRunKey(act, rw)"
									@click="onRelatedActionClick(act, rw)"
								>
									{{ act.label || act.method }}
								</button>
							</td>
						</tr>
					</tbody>
				</table>
				<p v-if="!(relatedState[ti].rows || []).length" class="ppv2-fd-related-empty theme-text-muted">
					No related records.
				</p>
			</div>
		</template>

		<div
			v-if="actionModal.open"
			class="ppv2-fd-action-modal-backdrop"
			@click.self="closeActionModal"
		>
			<div class="ppv2-fd-action-modal" role="dialog" aria-modal="true">
				<h4 class="ppv2-fd-action-modal-title">{{ actionModal.title }}</h4>
				<p v-if="actionModal.confirm" class="ppv2-fd-action-modal-confirm theme-text-muted">
					{{ actionModal.confirm }}
				</p>
				<div
					v-for="pa in actionModal.promptArgs"
					:key="pa.arg"
					class="ppv2-fd-action-modal-field"
				>
					<label class="ppv2-fd-action-modal-label">
						{{ pa.label || pa.arg
						}}<span v-if="pa.reqd" class="ppv2-fd-reqd theme-text-danger" aria-hidden="true"> *</span>
					</label>
					<input
						type="text"
						class="ppv2-fd-related-inp"
						:value="String(actionModal.values[pa.arg] ?? '')"
						@input="actionModal.values[pa.arg] = $event.target.value"
					/>
				</div>
				<p v-if="actionModal.error" class="ppv2-fd-action-modal-error theme-text-danger">{{ actionModal.error }}</p>
				<div class="ppv2-fd-action-modal-actions">
					<button type="button" class="btn btn-default btn-sm" @click="closeActionModal">
						Cancel
					</button>
					<button
						type="button"
						class="btn btn-primary btn-sm"
						:disabled="actionModal.running"
						@click="submitActionModal"
					>
						{{ actionModal.running ? "Running…" : "Run" }}
					</button>
				</div>
			</div>
		</div>

		<details v-if="tab.sections && tab.sections.length" class="ppv2-fd-related-schema">
			<summary class="ppv2-fd-related-schema-sum theme-text-muted">Field metadata</summary>
			<div
				class="ppv2-fd-related-preview"
				:style="{ '--ppv2-fd-rel-lbl': relatedLabelColPx(ti) + 'px' }"
			>
				<div class="ppv2-fd-related-sizer-row" title="Drag to resize the label column">
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
								<span class="ppv2-fd-related-fn">
									{{ field.label || field.fieldname
									}}<span
										v-if="relatedColumnMandatory(field)"
										class="ppv2-fd-reqd theme-text-danger"
										aria-hidden="true"
									>
										*
									</span>
								</span>
								<span class="ppv2-fd-related-ft theme-text-muted">{{ field.fieldtype }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</details>
		<div v-else class="ppv2-fd-related-placeholder ppv2-fd-related-placeholder-compact theme-text-muted">
			<p class="ppv2-fd-related-placeholder-text">
				{{ tab._related.label || tab._related.doctype }}
			</p>
			<p v-if="!tab._related.captureError" class="ppv2-fd-related-placeholder-sub theme-text-muted">
				No field layout stored for this tab.
			</p>
		</div>
	</div>
</template>

<script setup>
import { reactive, ref, watch, onUnmounted, nextTick, computed } from "vue";
import { frappeCall } from "../utils/frappeCall.js";
import {
	buildRelatedTabPanelFilter,
	canGoToRelatedPanel,
} from "../utils/formDialogRelatedGoTo.js";

const props = defineProps({
	ti: { type: Number, required: true },
	tab: { type: Object, required: true },
	definitionName: { type: String, default: "" },
	rootDoctype: { type: String, default: "" },
	rootDocName: { type: String, default: null },
	/** Bumped by host (e.g. after WP read-back) to trigger a fresh server fetch. */
	reloadTick: { type: Number, default: 0 },
	/** True while Go to is saving pending edits before navigation. */
	goToBusy: { type: Boolean, default: false },
	formData: { type: Object, required: true },
	originalFormData: { type: Object, default: null },
});

const emit = defineEmits(["related-dirty", "go-to-panel"]);

/** Related table column: show red asterisk when child DocType marks field mandatory (`reqd`). */
function relatedColumnMandatory(col) {
	if (!col || col.reqd == null) {
		return false;
	}
	return Number(col.reqd) === 1 || col.reqd === true || col.reqd === "1";
}

/** @type {Record<number, { loading?: boolean, error?: string|null, rows?: object[], columns?: object[], actions?: object[], fetchKey?: string }>} */
const relatedState = reactive({});
/** @type {Record<number, number>} */
const relatedSeq = reactive({});

const goToEnabled = computed(() =>
	canGoToRelatedPanel(props.tab, props.rootDocName, relatedState, props.ti),
);

function onGoToPanel() {
	const rel = props.tab?._related;
	if (!rel?.doctype) {
		return;
	}
	const parentFilter = buildRelatedTabPanelFilter(
		rel,
		props.rootDocName,
		relatedState[props.ti]?.rows || [],
	);
	if (!parentFilter) {
		if (typeof frappe !== "undefined" && frappe.show_alert) {
			frappe.show_alert({
				message: "No related rows to open in the panel.",
				indicator: "orange",
			});
		}
		return;
	}
	emit("go-to-panel", {
		doctype: rel.doctype,
		related: {
			link_field: rel.link_field,
			hop_chain: rel.hop_chain,
		},
		ti: props.ti,
	});
}

const actionModal = reactive({
	open: false,
	title: "",
	confirm: "",
	promptArgs: [],
	values: {},
	error: null,
	running: false,
	action: null,
	row: null,
});

const actionRunningKey = ref(null);

function actionRunKey(act, rw) {
	return `${act?.action_id || ""}:${rw?.name ?? ""}`;
}

function closeActionModal() {
	actionModal.open = false;
	actionModal.running = false;
	actionModal.error = null;
	actionModal.action = null;
	actionModal.row = null;
	actionModal.promptArgs = [];
	actionModal.values = {};
}

function formatActionResultSummary(result) {
	if (!result || typeof result !== "object") {
		return "Action completed.";
	}
	const data = result.data || result;
	const parts = [];
	if (data.message) {
		parts.push(String(data.message));
	}
	if (data.after && typeof data.after === "object") {
		if (data.after.credit != null) {
			parts.push(`Credit: ${data.after.credit}`);
		}
		if (data.after.charged != null) {
			parts.push(`Charged: ${data.after.charged}`);
		}
	}
	return parts.length ? parts.join(" · ") : "Action completed.";
}

function handleExchangeActionResult(result, enrollmentId, elapsedMs) {
	const o = result.outcome || {};
	const e = (s) => (typeof frappe !== "undefined" ? frappe.utils.escape_html(String(s ?? "")) : String(s ?? ""));
	const money = (n) => (n != null ? `$${parseFloat(n).toFixed(2)}` : "—");

	const rows = [
		["Player", o.player_name],
		["Switched from", o.old_event_name],
		["Switched to", o.new_event_name],
		["New order #", o.new_order_id],
		["Credit issued", money(o.credit_issued)],
		["Credit applied", money(o.credit_applied)],
		o.amount_charged_to_card ? ["Charged to card", money(o.amount_charged_to_card)] : null,
		o.amount_still_due ? ["Amount still due", money(o.amount_still_due)] : null,
	]
		.filter(Boolean)
		.map(
			([label, val]) =>
				`<tr><td style="padding:3px 12px 3px 0;color:#6c757d">${e(label)}</td><td style="padding:3px 0"><strong>${e(val)}</strong></td></tr>`,
		)
		.join("");

	const footer =
		o.status === "payment_required"
			? `<p class="theme-text-muted" style="margin-top:12px">The new enrollment will appear here when ${money(o.amount_still_due)} has been paid by the customer.</p>`
			: `<p class="theme-text-muted" style="margin-top:12px">The new enrollment will appear here within ~10 minutes.</p>`;

	const summary = result.summary ? `<p style="margin-bottom:10px">${e(result.summary)}</p>` : "";

	let rawJson = "";
	try {
		rawJson = JSON.stringify(result, null, 2);
	} catch (err) {
		rawJson = String(result);
	}
	const elapsedText =
		typeof elapsedMs === "number" && isFinite(elapsedMs)
			? `<p class="theme-text-muted" style="margin-top:8px;font-size:11px">API round-trip: ${(elapsedMs / 1000).toFixed(2)}s (${Math.round(elapsedMs)} ms)</p>`
			: "";
	const rawSection = `<details style="margin-top:12px"><summary style="cursor:pointer;color:#6c757d">Full API response</summary><pre style="margin-top:8px;max-height:300px;overflow:auto;background:#f6f8fa;border:1px solid #e1e4e8;border-radius:4px;padding:8px;font-size:11px;white-space:pre-wrap;word-break:break-word">${e(rawJson)}</pre></details>`;

	if (typeof frappe !== "undefined" && frappe.msgprint) {
		frappe.msgprint({
			title: "Event Switch Successful",
			message: `${summary}<table style="width:100%">${rows}</table><hr>${footer}${elapsedText}${rawSection}`,
			indicator: "green",
		});
	}
	// The deleted record is the enrollment we were editing (root doc). Fall back to
	// the server-reported old order item id if the click-time capture was empty.
	const removeName = enrollmentId || (o.old_order_item_id != null ? String(o.old_order_item_id) : "");
	if (removeName) window._nce_remove_panel_row?.(props.rootDoctype || "Enrollments", removeName);
	window._nce_close_form_dialog?.();
}

async function runPortalAction(act, rw, promptValues) {
	const defn = String(props.definitionName || "").trim();
	const dt = String(props.rootDoctype || "").trim();
	const dn = String(props.rootDocName || "").trim();
	const crn = props.tab?._related?.child_row_name;
	if (!defn || !dt || !dn || !crn || !rw?.name) {
		throw new Error("Missing context for portal action");
	}
	return frappeCall("nce_events.api.form_dialog.portal_actions.run_portal_action", {
		definition: defn,
		context_kind: "related",
		related_row_name: crn,
		root_doctype: dt,
		root_name: dn,
		child_name: String(rw.name),
		action_id: act.action_id,
		prompt_values: promptValues || {},
	});
}

async function submitActionModal() {
	if (!actionModal.action || !actionModal.row) {
		return;
	}
	for (const pa of actionModal.promptArgs || []) {
		if (pa.reqd && !String(actionModal.values[pa.arg] ?? "").trim()) {
			actionModal.error = `${pa.label || pa.arg} is required.`;
			return;
		}
	}
	actionModal.error = null;
	actionModal.running = true;
	const key = actionRunKey(actionModal.action, actionModal.row);
	actionRunningKey.value = key;
	// Capture the enrollment being edited (root doc) before the async call —
	// this is the record the exchange deletes, and the row to drop from the panel.
	const enrollmentId = String(props.rootDocName || "").trim();
	const startedAt = (typeof performance !== "undefined" ? performance.now() : Date.now());
	try {
		const r = await runPortalAction(actionModal.action, actionModal.row, { ...actionModal.values });
		const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
		closeActionModal();
		if (r?.result?.outcome) {
			handleExchangeActionResult(r.result, enrollmentId, elapsedMs);
		} else {
			if (typeof frappe !== "undefined" && frappe.show_alert) {
				frappe.show_alert({
					message: formatActionResultSummary(r?.result),
					indicator: "green",
				});
			}
			await fetchRelatedForTab(props.ti);
		}
	} catch (e) {
		actionModal.error = e?.message || String(e) || "Action failed";
	} finally {
		actionModal.running = false;
		actionRunningKey.value = null;
	}
}

function onRelatedActionClick(act, rw) {
	const promptArgs = Array.isArray(act.promptArgs) ? act.promptArgs : [];
	const needsModal = promptArgs.length > 0 || !!act.confirm;
	if (!needsModal) {
		actionModal.action = act;
		actionModal.row = rw;
		void submitActionModalDirect(act, rw);
		return;
	}
	actionModal.open = true;
	actionModal.title = act.label || act.method || "Action";
	actionModal.confirm = act.confirm || "";
	actionModal.promptArgs = promptArgs;
	actionModal.values = {};
	actionModal.error = null;
	actionModal.running = false;
	actionModal.action = act;
	actionModal.row = rw;
}

async function submitActionModalDirect(act, rw) {
	const key = actionRunKey(act, rw);
	actionRunningKey.value = key;
	// Capture the enrollment being edited (root doc) before the async call.
	const enrollmentId = String(props.rootDocName || "").trim();
	const startedAt = (typeof performance !== "undefined" ? performance.now() : Date.now());
	try {
		const r = await runPortalAction(act, rw, {});
		const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
		if (r?.result?.outcome) {
			handleExchangeActionResult(r.result, enrollmentId, elapsedMs);
		} else {
			if (typeof frappe !== "undefined" && frappe.show_alert) {
				frappe.show_alert({
					message: formatActionResultSummary(r?.result),
					indicator: "green",
				});
			}
			await fetchRelatedForTab(props.ti);
		}
	} catch (e) {
		if (typeof frappe !== "undefined" && frappe.show_alert) {
			frappe.show_alert({
				message: e?.message || String(e) || "Action failed",
				indicator: "red",
			});
		}
	} finally {
		actionRunningKey.value = null;
		actionModal.action = null;
		actionModal.row = null;
	}
}

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
	const saved = readSavedRelatedLabelWidth(props.ti);
	if (saved != null) {
		relatedLabelColByTab[props.ti] = saved;
	} else if (props.tab.sections && props.tab.sections.length) {
		relatedLabelColByTab[props.ti] = defaultRelatedLabelWidthForTab(props.tab);
	} else {
		relatedLabelColByTab[props.ti] = 200;
	}
}

// Per-instance watch of props.tab; runs the same initialization as the parent's props.tabs watch.
watch(
	() => props.tab,
	() => {
		syncRelatedLabelWidthsFromTabs();
		clearAllRelatedFetch();
		fetchRelatedForTab(props.ti);
	},
	{ deep: true, immediate: true }
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
	const tab = props.tab;
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
		const msg = await frappeCall(
			"nce_events.api.form_dialog.related_rows.get_form_dialog_related_rows",
			{
				definition: String(props.definitionName).trim(),
				related_row_name: tab._related.child_row_name,
				root_doctype: String(props.rootDoctype).trim(),
				root_name: String(props.rootDocName).trim(),
				limit: 500,
			}
		);
		if (relatedSeq[ti] !== seq) {
			return;
		}
		relatedState[ti].fetchKey = fk;
		const rawRows = Array.isArray(msg.rows) ? msg.rows : [];
		relatedState[ti].baseline = JSON.parse(JSON.stringify(rawRows));
		relatedState[ti].rows = rawRows.map((r) => ({ ...r }));
		relatedState[ti].columns = Array.isArray(msg.columns) ? msg.columns : [];
		relatedState[ti].actions = Array.isArray(msg.actions) ? msg.actions : [];
		emit("related-dirty", false);
	} catch (e) {
		if (relatedSeq[ti] !== seq) {
			return;
		}
		relatedState[ti].rows = [];
		relatedState[ti].baseline = [];
		relatedState[ti].columns = [];
		relatedState[ti].actions = [];
		relatedState[ti].error = e?.message || String(e) || "Failed to load related rows";
	} finally {
		if (relatedSeq[ti] === seq) {
			relatedState[ti].loading = false;
		}
	}
}

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

function baselineRowForRelated(ti, name) {
	const st = relatedState[ti];
	if (!st?.baseline || name == null || name === "") {
		return null;
	}
	return st.baseline.find((b) => b.name === name) ?? null;
}

function isRelatedCellDirty(ti, rw, col) {
	if (!isRelatedColEditable(col) || rw?.name == null || rw.name === "") {
		return false;
	}
	const base = baselineRowForRelated(ti, rw.name);
	if (!base) {
		return false;
	}
	return !valuesEqual(rw[col.fieldname], base[col.fieldname]);
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
	if ((a === 0 || a === "0" || a === false) && (b === 0 || b === "0" || b === false)) {
		return true;
	}
	if ((a === 1 || a === "1" || a === true) && (b === 1 || b === "1" || b === true)) {
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
		return [];
	}
	const tab = props.tab;
	const crn = tab?._related?.child_row_name;
	if (!crn) {
		return [];
	}
	const updates = buildRelatedUpdates(props.ti);
	if (!updates.length) {
		return [];
	}
	const r = await frappeCall("nce_events.api.form_dialog.related_rows.save_form_dialog_related_rows", {
		definition: defn,
		related_row_name: crn,
		root_doctype: dt,
		root_name: dn,
		updates,
	});
	const st = relatedState[props.ti];
	if (st?.rows) {
		st.baseline = JSON.parse(JSON.stringify(st.rows));
	}
	emit("related-dirty", false);
	return Array.isArray(r?.sync_job_ids) ? r.sync_job_ids : [];
}

/** Refetch this grid whenever the host bumps reloadTick (e.g. after WP read-back). */
watch(
	() => props.reloadTick,
	(tick, prev) => {
		if (!tick || tick === prev) return;
		if (!props.tab?._related?.child_row_name) return;
		if (!String(props.rootDocName || "").trim()) return;
		fetchRelatedForTab(props.ti);
	},
);

/** Refetch grid when parent bumps ``reloadTick`` or calls ``reloadRelatedFromServer`` */
function reloadRelatedFromServer() {
	if (!props.tab?._related?.child_row_name) return;
	const dn = String(props.rootDocName || "").trim();
	if (!dn) return;
	fetchRelatedForTab(props.ti);
}

function getDisplayRows() {
	return relatedState[props.ti]?.rows || [];
}

defineExpose({
	saveAllRelatedRows,
	resetRelatedToBaseline,
	reloadRelatedFromServer,
	getDisplayRows,
});

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
				String(relatedLabelColByTab[relResizeTabIndex])
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
.ppv2-fd-related-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 120px;
}
.ppv2-fd-related-placeholder-text {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-related-placeholder-sub {
	font-size: var(--font-size-sm);
	margin-top: 8px;
}
.ppv2-fd-related-preview {
	padding: 4px 0 12px;
}
.ppv2-fd-related-meta-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin: 0 0 12px;
}
.ppv2-fd-related-meta {
	font-size: var(--font-size-sm);
	margin: 0;
	flex: 1;
	min-width: 0;
}
.ppv2-fd-related-go-to {
	flex-shrink: 0;
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
	min-width: 0;
	overflow-wrap: anywhere;
	word-break: break-word;
}
.ppv2-fd-related-fn .ppv2-fd-reqd {
	font-weight: 700;
}
.ppv2-fd-related-ft {
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
	margin: 0 0 12px;
}
.ppv2-fd-related-rows-loading,
.ppv2-fd-related-rows-err {
	font-size: var(--font-size-sm);
	margin: 0 0 12px;
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
	font-size: var(--font-size-base);
}
.ppv2-fd-related-th {
	text-align: left;
	padding: 6px 8px;
	background: var(--bg-header, #f0f4f8);
	color: var(--text-header, #36414c);
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold, 600);
	border-bottom: 1px solid var(--border-color);
	position: sticky;
	top: 0;
	z-index: 1;
}
.ppv2-fd-related-th .ppv2-fd-reqd {
	font-weight: 700;
}
.ppv2-fd-related-td {
	padding: 4px 8px;
	border-bottom: 1px solid var(--border-color);
	vertical-align: middle;
	min-width: 4rem;
}
.ppv2-fd-related-td:last-child {
	border-right: none;
}
.ppv2-fd-related-td--editable .ppv2-fd-related-select,
.ppv2-fd-related-td--editable .ppv2-fd-related-inp,
.ppv2-fd-related-td--editable .ppv2-fd-related-textarea,
.ppv2-fd-related-td--editable .ppv2-fd-related-cell-text {
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-related-td--dirty .ppv2-fd-related-check {
	accent-color: var(--nce-color-danger);
}
.ppv2-fd-related-cell-text {
	font-size: var(--font-size-base);
	word-break: break-word;
}
.ppv2-fd-related-select {
	max-width: 100%;
	min-width: 6rem;
	min-height: 2.25em;
	padding: 5px 8px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	font-size: var(--font-size-base);
	font-family: var(--font-family, inherit);
	box-sizing: border-box;
}
.ppv2-fd-related-inp,
.ppv2-fd-related-textarea {
	max-width: 100%;
	width: 100%;
	box-sizing: border-box;
	padding: 5px 8px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	font-size: var(--font-size-base);
	font-family: var(--font-family, inherit);
}
.ppv2-fd-related-textarea {
	resize: vertical;
	min-height: 2.25em;
}
.ppv2-fd-related-check {
	width: 1.1rem;
	height: 1.1rem;
	accent-color: var(--bg-header, #2490ef);
}
.ppv2-fd-related-empty {
	margin: 10px 12px 12px;
	font-size: var(--font-size-sm);
}
.ppv2-fd-related-schema {
	margin-top: 8px;
	font-size: var(--font-size-sm);
}
.ppv2-fd-related-schema-sum {
	cursor: pointer;
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-related-placeholder-compact {
	min-height: 0;
	flex-direction: column;
	padding: 8px 0 0;
}
.ppv2-fd-related-th-actions,
.ppv2-fd-related-td-actions {
	white-space: nowrap;
	min-width: 6rem;
}
.ppv2-fd-related-action-btn {
	margin-right: 4px;
	margin-bottom: 2px;
}
.ppv2-fd-action-modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.35);
	z-index: 1200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}
.ppv2-fd-action-modal {
	background: var(--bg-card, #fff);
	border-radius: var(--border-radius-sm, 6px);
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
	padding: 16px 18px;
	min-width: min(420px, 92vw);
	max-width: 520px;
}
.ppv2-fd-action-modal-title {
	margin: 0 0 10px;
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-action-modal-confirm {
	margin: 0 0 12px;
	font-size: var(--font-size-sm);
}
.ppv2-fd-action-modal-field {
	margin-bottom: 10px;
}
.ppv2-fd-action-modal-label {
	display: block;
	margin-bottom: 4px;
	font-size: var(--font-size-sm);
}
.ppv2-fd-action-modal-error {
	margin: 8px 0 0;
	font-size: var(--font-size-sm);
}
.ppv2-fd-action-modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 14px;
}
</style>
