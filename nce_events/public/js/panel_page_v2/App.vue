<template>
	<div class="ppv2-root">
		<div class="ppv2-top-row">
			<div class="ppv2-zone ppv2-zone-title">{{ pageTitle }}</div>
			<div class="ppv2-zone ppv2-zone-pages">
				<SpaPageSwitcherFloat />
			</div>
		</div>
		<div class="ppv2-bottom-row">
			<div class="ppv2-zone ppv2-zone-actions">
				<ActionsPanel :actions="panelActions" @select="onPanelActionSelect" />
			</div>
			<div class="ppv2-zone ppv2-zone-tables">
		<PanelFloat :init-x="16" :init-y="16" :init-w="900" :init-h="550">
			<template #header>
				<span class="ppv2-title">{{ config?.header_text || panelLabel }}</span>
				<PanelHeaderToolbar
					:loading="loading"
					:show-click-hint="!!config?.open_card_on_click"
					:row-count="rows.length"
					:total="fullTotal"
					@refresh="onRefreshRoot"
					@toggle-filter="rootPanelShowFilter = !rootPanelShowFilter"
					@sheets="onSheets({ doctype: 'WP Tables', parentFilter: {}, rows })"
					@download-csv="
						onDownloadCsv({ doctype: 'WP Tables', parentFilter: {}, rows })
					"
				/>
			</template>
			<PanelTable
				:title="config?.header_text || 'NCE Tables'"
				:columns="columns"
				:rows="rows"
				:total="fullTotal"
				:loading="loading"
				:error="error"
				:config="config || {}"
				:default-filters="config?.default_filters || []"
				:show-filter="rootPanelShowFilter"
				@row-click="onRootRowClick"
				@row-drop="(row) => onRowDrop(null, row)"
				@sheets="onSheets({ doctype: 'WP Tables', parentFilter: {}, rows })"
				@download-csv="
					onDownloadCsv({ doctype: 'WP Tables', parentFilter: {}, rows })
				"
				@filter-change="(f) => onFilterChange(null, f)"
				@refresh="onRefreshRoot"
				@show-filter="rootPanelShowFilter = true"
			/>
			<template #footer>{{ config?.header_text || "NCE Tables" }}</template>
		</PanelFloat>

		<PanelFloat
			v-for="p in openPanels"
			:key="p.id"
			:init-x="p.x"
			:init-y="p.y"
			:init-w="1200"
			:init-h="600"
		>
			<template #header>
				<span class="ppv2-title">{{ floatedPanelTitle(p) }}</span>
				<PanelHeaderToolbar
					:loading="!!p.loading"
					:show-click-hint="!!p.config?.open_card_on_click && !p._find?.mode"
					:row-count="(p._panelRows || p.rows).length"
					:row-count-label="p._find?.mode === 'find' ? '—' : undefined"
					:total="p.fullTotal"
					:find-header-minimal="p._find?.mode === 'find'"
					:show-email="!!p.config?.email_field"
					:show-sms="!!p.config?.sms_field"
					:show-new-record="
						!!p.config?.allow_new_record_creation &&
						!!p.config?.form_dialog &&
						!p._find?.mode
					"
					:show-find="!!p.config?.form_dialog && !p._find?.mode"
					show-close
					@refresh="onRefreshPanel(p)"
					@toggle-filter="p._showFilter = !p._showFilter"
					@sheets="onSheets(p)"
					@download-csv="onDownloadCsv(p)"
					@email="onEmail(p)"
					@sms="onSms(p)"
					@new-record="onNewRecord(p)"
					@find="() => onPanelToolbarFind(p)"
					@close="closePanel(p.id)"
				/>
			</template>
			<div v-if="p._find?.mode" class="ppv2-find-stack">
				<PanelFindActionBar
					:mode="p._find.mode"
					:find-match-active="p._find.findMatchActive"
					:find-or-enabled="!!p._find.hasAnyCriteria"
					:find-duplicate-enabled="(p._find.criteriaRows?.length ?? 0) > 0"
					@find-or="() => onPanelFindOr(p)"
					@find-or-duplicate="() => onPanelFindOrDuplicate(p)"
					@find-perform="() => onPanelFindPerform(p)"
					@find-constrain="() => onPanelFindConstrain(p)"
					@find-extend="() => onPanelFindExtend(p)"
					@find-cancel-criteria="() => onPanelFindCancelCriteria(p)"
					@find-new="() => onPanelFindNew(p)"
					@find-modify="() => onPanelFindModify(p)"
					@find-exit="() => onPanelFindExit(p)"
				/>
				<PanelTable
					class="ppv2-find-stack-table"
					:title="floatedPanelTitle(p)"
					:columns="panelTableColumns(p)"
					:rows="panelTableRows(p)"
					:total="p.fullTotal"
					:loading="p.loading"
					:error="p.error"
					:config="p.config || {}"
					:default-filters="p.config?.default_filters || []"
					:show-email="!!p.config?.email_field && p._find?.mode === 'browse'"
					:show-sms="!!p.config?.sms_field && p._find?.mode === 'browse'"
					:show-filter="p._showFilter && p._find?.mode !== 'find'"
					:search-only-columns="[]"
					@close="closePanel(p.id)"
					@row-click="(row) => onDrilledRowClick(p, row)"
					@drill="(ev) => onDrill(ev, p)"
					@sheets="onSheets(p)"
					@download-csv="onDownloadCsv(p)"
					@email="onEmail(p)"
					@sms="onSms(p)"
					@tags="openTagFinder(p)"
					@filter-change="(f) => onFilterChange(p, f)"
					@refresh="onRefreshPanel(p)"
					@email-one="(row) => onEmailOne(p, row)"
					@sms-one="(row) => onSmsOne(p, row)"
					@row-drop="(row) => onRowDrop(p, row)"
					@show-filter="p._showFilter = true"
				>
					<template v-if="p._find.mode === 'find'" #tbody-prefix>
						<PanelFindRow
							v-for="(row, ri) in p._find.criteriaRows"
							:key="'find-row-' + p.id + '-' + ri"
							:columns="panelTableColumns(p)"
							:criteria="row"
							:active="p._find.activeRowIndex === ri"
							:show-or-label="ri > 0"
							@activate-row="p._find.setActiveRowIndex(ri)"
							@update-criterion="
								(fn, val) => p._find.setCriterion(ri, fn, val)
							"
							@find-perform="onPanelFindPerform(p)"
						/>
					</template>
				</PanelTable>
			</div>
			<PanelTable
				v-else
				:title="floatedPanelTitle(p)"
				:columns="p.columns"
				:rows="p._panelRows || p.rows"
				:total="p.fullTotal"
				:loading="p.loading"
				:error="p.error"
				:config="p.config || {}"
				:default-filters="p.config?.default_filters || []"
				:show-email="!!p.config?.email_field"
				:show-sms="!!p.config?.sms_field"
				:show-filter="p._showFilter"
				:search-only-columns="p.config?.search_only_columns || []"
				@close="closePanel(p.id)"
				@row-click="(row) => onDrilledRowClick(p, row)"
				@drill="(ev) => onDrill(ev, p)"
				@sheets="onSheets(p)"
				@download-csv="onDownloadCsv(p)"
				@email="onEmail(p)"
				@sms="onSms(p)"
				@tags="openTagFinder(p)"
				@filter-change="(f) => onFilterChange(p, f)"
				@refresh="onRefreshPanel(p)"
				@email-one="(row) => onEmailOne(p, row)"
				@sms-one="(row) => onSmsOne(p, row)"
				@row-drop="(row) => onRowDrop(p, row)"
				@show-filter="p._showFilter = true"
			/>
			<template #footer>{{ floatedPanelTitle(p) }}</template>
		</PanelFloat>

		<TagFinder
			v-if="tagFinderDoctype"
			:root-doctype="tagFinderDoctype"
			:init-x="tagFinderX"
			:init-y="tagFinderY"
			@close="tagFinderDoctype = ''"
		/>
			</div>
		</div>

		<CardModal
			v-for="(card, i) in cardStack"
			:key="'card-' + card.id"
			:card-def-name="card.cardDefName"
			:doctype="card.doctype"
			:record-name="card.recordName"
			:style="{ zIndex: 1000 + i }"
			@open-card="onOpenCard"
			@close="closeTopCard"
		/>

		<!-- Form Dialog — dual-slot dissolve transition for flicker-free nav -->
		<!-- Slot 0 active -->
		<PanelFormDialog
			v-if="formDialogSlot === 0 && formDialogDefinition"
			:open="true"
			:definition-name="formDialogDefinition"
			:definition-source="formDialogDefinitionSource"
			:doctype="formDialogDoctype"
			:doc-name="formDialogDocName"
			:required-fields="formDialogRequiredFields"
			:reload-panel-after-publish="reloadPanelForFormDialogDoctype"
			:row-nav-enabled="
				formDialogNavInfo.total > 1 || formDialogSourcePanelId != null
			"
			:dialog-load-mode="formDialogDialogLoadMode"
			:find-chrome-phase="formDialogFindChromePhase"
			:find-match-active="formDialogFindActive"
			:find-seed-criteria="formDialogFindSeedCriteria"
			:find-search-only-columns="formDialogFindSearchOnlyColumns"
			:can-navigate-prev="formDialogNavInfo.canPrev"
			:can-navigate-next="formDialogNavInfo.canNext"
			:row-nav-label="formDialogNavLabel"
			:dissolve-opacity="
				formDialogSlot === 0 && formDialogDissolving ? formDialogDissolveOpacity : 1
			"
			:style="{
				zIndex: formDialogSlot === 0 ? 1050 : 1048,
			}"
			@close="onFormDialogClose"
			@saved="onFormDialogSaved"
			@readback-merged="onReadbackMerged"
			@nav-prev="onFormDialogNavPrev"
			@nav-next="onFormDialogNavNext"
		/>
		<!-- Slot 1 pending (behind) -->
		<PanelFormDialog
			v-if="formDialogSlot === 0 && formDialogPendingDefinition"
			:open="true"
			:definition-name="formDialogPendingDefinition"
			:definition-source="formDialogDefinitionSource"
			:doctype="formDialogPendingDoctype"
			:doc-name="formDialogPendingDocName"
			:required-fields="formDialogRequiredFields"
			:reload-panel-after-publish="reloadPanelForFormDialogDoctype"
			:dialog-load-mode="formDialogDialogLoadMode"
			:find-chrome-phase="formDialogFindChromePhase"
			:find-match-active="formDialogFindActive"
			:find-seed-criteria="formDialogFindSeedCriteria"
			:find-search-only-columns="formDialogFindSearchOnlyColumns"
			:row-nav-enabled="false"
			:can-navigate-prev="false"
			:can-navigate-next="false"
			:row-nav-label="''"
			:dissolve-opacity="1"
			:style="{ zIndex: 1048 }"
			@close="onFormDialogClose"
			@saved="onFormDialogSaved"
			@readback-merged="onReadbackMerged"
			@nav-prev="onFormDialogNavPrev"
			@nav-next="onFormDialogNavNext"
		/>
		<!-- Slot 1 active -->
		<PanelFormDialog
			v-if="formDialogSlot === 1 && formDialogDefinition"
			:open="true"
			:definition-name="formDialogDefinition"
			:definition-source="formDialogDefinitionSource"
			:doctype="formDialogDoctype"
			:doc-name="formDialogDocName"
			:required-fields="formDialogRequiredFields"
			:reload-panel-after-publish="reloadPanelForFormDialogDoctype"
			:row-nav-enabled="
				formDialogNavInfo.total > 1 || formDialogSourcePanelId != null
			"
			:dialog-load-mode="formDialogDialogLoadMode"
			:find-chrome-phase="formDialogFindChromePhase"
			:find-match-active="formDialogFindActive"
			:find-seed-criteria="formDialogFindSeedCriteria"
			:find-search-only-columns="formDialogFindSearchOnlyColumns"
			:can-navigate-prev="formDialogNavInfo.canPrev"
			:can-navigate-next="formDialogNavInfo.canNext"
			:row-nav-label="formDialogNavLabel"
			:dissolve-opacity="
				formDialogSlot === 1 && formDialogDissolving ? formDialogDissolveOpacity : 1
			"
			:style="{
				zIndex: formDialogSlot === 1 ? 1050 : 1048,
			}"
			@close="onFormDialogClose"
			@saved="onFormDialogSaved"
			@readback-merged="onReadbackMerged"
			@nav-prev="onFormDialogNavPrev"
			@nav-next="onFormDialogNavNext"
		/>
		<!-- Slot 0 pending (behind) -->
		<PanelFormDialog
			v-if="formDialogSlot === 1 && formDialogPendingDefinition"
			:open="true"
			:definition-name="formDialogPendingDefinition"
			:definition-source="formDialogDefinitionSource"
			:doctype="formDialogPendingDoctype"
			:doc-name="formDialogPendingDocName"
			:required-fields="formDialogRequiredFields"
			:reload-panel-after-publish="reloadPanelForFormDialogDoctype"
			:dialog-load-mode="formDialogDialogLoadMode"
			:find-chrome-phase="formDialogFindChromePhase"
			:find-match-active="formDialogFindActive"
			:find-seed-criteria="formDialogFindSeedCriteria"
			:find-search-only-columns="formDialogFindSearchOnlyColumns"
			:row-nav-enabled="false"
			:can-navigate-prev="false"
			:can-navigate-next="false"
			:row-nav-label="''"
			:dissolve-opacity="1"
			:style="{ zIndex: 1048 }"
			@close="onFormDialogClose"
			@saved="onFormDialogSaved"
			@readback-merged="onReadbackMerged"
			@nav-prev="onFormDialogNavPrev"
			@nav-next="onFormDialogNavNext"
		/>
	</div>
</template>

<script setup>
// v2026-05-30
import { ref, reactive, computed, onMounted, onUnmounted, inject } from "vue";
import { useNceCardStack, parseOpenCardOpts } from "./composables/useNceCardStack.js";
import { usePanelFormDialogHost } from "./composables/usePanelFormDialogHost.js";
import { usePanelActions } from "./composables/usePanelActions.js";
import { usePanel } from "./composables/usePanel.js";
import { useSendDialogs } from "./composables/useSendDialogs.js";
import PanelFloat from "./components/PanelFloat.vue";
import PanelTable from "./components/PanelTable.vue";
import PanelHeaderToolbar from "./components/PanelHeaderToolbar.vue";
import TagFinder from "./components/TagFinder.vue";
import CardModal from "./nce_cards/CardModal.vue";
import PanelFormDialog from "./components/PanelFormDialog.vue";
import ActionsPanel from "./components/ActionsPanel.vue";
import SpaPageSwitcherFloat from "./components/SpaPageSwitcherFloat.vue";
import PanelFindActionBar from "./components/PanelFindActionBar.vue";
import PanelFindRow from "./components/PanelFindRow.vue";
import { useFindPanel } from "./composables/useFindPanel.js";
import { buildFindColumns } from "./utils/findColumns.js";

const panelMode = inject("panelMode", null);
const panelLabel = inject("panelLabel", "NCE Tables");
const pageTitle = inject("pageTitle", "");
const rootFilter = panelMode ? { doctype_source: panelMode } : {};

const rootPanel = usePanel("WP Tables", rootFilter);
const {
	config,
	columns: rawColumns,
	rows,
	total,
	fullTotal,
	loading,
	error,
	load,
	reload,
} = rootPanel;
const rootPanelShowFilter = ref(false);

// Hide nce_name — it duplicates frappe_doctype in the root panel.
// Also strip is_link from frappe_doctype so clicking opens the next panel (via row-click)
// rather than navigating to the Frappe desk form view.
const columns = computed(() =>
	(rawColumns.value || [])
		.filter((c) => c.fieldname !== "nce_name")
		.map((c) => (c.fieldname === "frappe_doctype" ? { ...c, is_link: false } : c))
);

const openPanels = reactive([]);
let panelCounter = 0;
const dropStack = reactive([]);
const tagFinderDoctype = ref("");
const tagFinderX = ref(0);
const tagFinderY = ref(80);

const {
	showFormDialog,
	formDialogDocName,
	formDialogDefinition,
	formDialogDoctype,
	formDialogDefinitionSource,
	formDialogRequiredFields,
	formDialogSourcePanelId,
	formDialogDialogLoadMode,
	formDialogFindChromePhase,
	formDialogFindSeedCriteria,
	formDialogFindSearchOnlyColumns,
	formDialogNavInfo,
	formDialogNavLabel,
	formDialogFindActive,
	onFormDialogNavPrev,
	onFormDialogNavNext,
	openFormDialogFromPanelRow,
	openFormDialogForNewRecord,
	openFormDialogStandalone,
	onFormDialogClose,
	onFormDialogSaved,
	onReadbackMerged,
	reloadPanelForFormDialogDoctype,
	// Dual-slot dissolve
	formDialogSlot,
	formDialogPendingDocName,
	formDialogPendingDefinition,
	formDialogPendingDoctype,
	formDialogDissolving,
	formDialogDissolveOpacity,
} = usePanelFormDialogHost(openPanels);

function refreshPanelByDoctype(doctype) {
	const panel = openPanels.find((p) => p.doctype === doctype);
	if (panel?._reload) panel._reload();
}

const { actions: panelActions, loadActions, executeAction: runPanelAction } = usePanelActions({
	openFormDialogStandalone,
	refreshPanelByDoctype,
	scope: panelMode,
});

async function onPanelActionSelect(action) {
	await runPanelAction(action);
}

const { cardStack, openCardModal, closeTopCard, onOpenCard } = useNceCardStack();

const { onEmail, onSms, onEmailOne, onSmsOne } = useSendDialogs();

function onRowDrop(panel, row) {
	const arr = panel ? panel.rows : rows.value;
	const idx = arr.findIndex((r) => r.name === row.name);
	if (idx >= 0) {
		arr.splice(idx, 1);
		dropStack.push({ panel, row, idx });
	}
}

function undoDrop() {
	if (!dropStack.length) return;
	const { panel, row, idx } = dropStack.pop();
	const arr = panel ? panel.rows : rows.value;
	const insertAt = Math.min(idx, arr.length);
	arr.splice(insertAt, 0, row);
}

function onKeyDown(e) {
	if ((e.ctrlKey || e.metaKey) && e.key === "z") {
		if (!dropStack.length) return;
		e.preventDefault();
		undoDrop();
		return;
	}
}

onMounted(() => {
	load();
	loadActions();
	window.addEventListener("keydown", onKeyDown);
	window._nce_open_tag_finder = (dt, x, y) => {
		if (!dt) return;
		if (typeof x === "number") tagFinderX.value = x;
		if (typeof y === "number") tagFinderY.value = y;
		tagFinderDoctype.value = dt;
	};
	window._nce_close_tag_finder = () => {
		tagFinderDoctype.value = "";
	};
	window._nce_open_card = (opts) => {
		const parsed = parseOpenCardOpts(opts);
		if (parsed) {
			openCardModal(parsed.cardDefName, parsed.doctype, parsed.recordName);
		}
	};
	window._nce_close_top_card = () => {
		closeTopCard();
	};
	window._nce_refresh_panel = (doctype) => {
		refreshPanelByDoctype(doctype);
	};
	window._nce_close_form_dialog = () => {
		onFormDialogClose();
	};
	// Reusable utility: drop a single row from the open panel for `panelDoctype`.
	// The app only ever opens one panel per root table, so doctype uniquely
	// identifies the panel. Returns true if a matching row was removed.
	window._nce_remove_panel_row = (panelDoctype, name) => {
		const p = openPanels.find((panel) => panel.doctype === panelDoctype);
		if (!p) return false;
		const nameStr = String(name);
		const notMatch = (r) => String(r.name) !== nameStr;
		const existed =
			(Array.isArray(p._allRows?.value) && p._allRows.value.some((r) => !notMatch(r))) ||
			(Array.isArray(p._panelRows?.value) && p._panelRows.value.some((r) => !notMatch(r))) ||
			(Array.isArray(p.rows) && p.rows.some((r) => !notMatch(r)));
		if (!existed) return false;
		// Purge the underlying unfiltered cache too so re-filtering can't bring it back.
		if (Array.isArray(p._allRows?.value)) {
			p._allRows.value = p._allRows.value.filter(notMatch);
		}
		if (Array.isArray(p._panelRows?.value)) {
			p._panelRows.value = p._panelRows.value.filter(notMatch);
		}
		if (Array.isArray(p.rows)) {
			p.rows = p.rows.filter(notMatch);
		}
		if (p.total > 0) p.total--;
		if (p.fullTotal > 0) p.fullTotal--;
		return true;
	};
});

onUnmounted(() => {
	window.removeEventListener("keydown", onKeyDown);
	delete window._nce_open_tag_finder;
	delete window._nce_close_tag_finder;
	delete window._nce_open_card;
	delete window._nce_close_top_card;
	delete window._nce_refresh_panel;
	delete window._nce_close_form_dialog;
	delete window._nce_remove_panel_row;
});

/** Child float header: "Enrollments" or "Enrollments for {parent title}" when drilled with context. */
function floatedPanelTitle(p) {
	const base = p.config?.header_text || p.doctype || "";
	const suffix = (p.parentContextTitle || "").trim();
	let title = suffix ? `${base} for ${suffix}` : base;
	if (p._find?.mode === "find") title += " — Find";
	else if (p._find?.mode === "browse") title += " — Found";
	return title;
}

function panelTableColumns(p) {
	if (p._find?.mode && p._findColumns?.length) return p._findColumns;
	return p.columns;
}

function panelTableRows(p) {
	if (p._find?.mode === "find") return [];
	return p._panelRows || p.rows;
}

function panelApplyFoundSet(p, foundRows) {
	if (p._panelApi) p._panelApi.setFoundSet(foundRows);
}

function panelClearFind(p) {
	if (p._panelApi) p._panelApi.clearFoundSet();
	p._findColumns = null;
}

function panelFindMsgNoCriteria() {
	const msg =
		typeof window.__ === "function"
			? window.__("Enter at least one search criterion.")
			: "Enter at least one search criterion.";
	if (typeof frappe !== "undefined" && frappe.msgprint) frappe.msgprint(msg);
}

function onPanelFindPerform(p) {
	if (!p._find?.performFind((rows) => panelApplyFoundSet(p, rows))) {
		panelFindMsgNoCriteria();
	}
}

function onPanelFindConstrain(p) {
	if (!p._find?.performFindConstrain((rows) => panelApplyFoundSet(p, rows))) {
		panelFindMsgNoCriteria();
	}
}

function onPanelFindExtend(p) {
	if (!p._find?.extendFind((rows) => panelApplyFoundSet(p, rows))) {
		panelFindMsgNoCriteria();
	}
}

function onPanelFindCancelCriteria(p) {
	p._find.cancelFindCriteria(
		(rows) => panelApplyFoundSet(p, rows),
		() => panelClearFind(p)
	);
}

function onPanelFindNew(p) {
	p._findColumns = buildFindColumns(p);
	p._find.newFind(p._findColumns);
	p._showFilter = false;
}

function onPanelFindExit(p) {
	p._find.exitFind(() => panelClearFind(p));
}

function onPanelFindModify(p) {
	p._findColumns = buildFindColumns(p);
	p._find.modifyFind(p._findColumns);
}

function onPanelFindOr(p) {
	p._findColumns = buildFindColumns(p);
	if (!p._find?.addOrRow(p._findColumns)) {
		panelFindMsgNoCriteria();
	}
}

function onPanelFindOrDuplicate(p) {
	p._findColumns = buildFindColumns(p);
	if (!p._find?.duplicateOrRow(p._findColumns)) {
		const msg =
			typeof window.__ === "function"
				? window.__("Click a find row to duplicate, then try again.")
				: "Click a find row to duplicate, then try again.";
		if (typeof frappe !== "undefined" && frappe.msgprint) frappe.msgprint(msg);
	}
}

function onPanelToolbarFind(p) {
	if (!p?.config?.form_dialog) {
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint({
				title: __("Find"),
				message: __(
					"Link a Form Dialog on this Page Panel (Dialogs tab) to search from the panel.",
				),
				indicator: "orange",
			});
		}
		return;
	}
	if (p._find?.mode === "find") return;
	p._findColumns = buildFindColumns(p);
	p._find.activate(p._allRows, p._findColumns);
	p._showFilter = false;
}

function nextPos(parentId) {
	/* Find the parent panel's position and offset from it */
	if (parentId === "root") {
		/* Offset from the root WP Tables panel (matches :init-x / :init-y on root PanelFloat) */
		return { x: 16 + 80, y: 16 + 24 };
	}
	const parent = openPanels.find((p) => p.id === parentId);
	if (parent) {
		return { x: parent.x + 80, y: parent.y + 24 };
	}
	/* Fallback */
	return { x: 140, y: 120 };
}

function openTagFinder(panel) {
	tagFinderDoctype.value = panel.doctype;
	tagFinderX.value = panel.x + 20;
	tagFinderY.value = panel.y;
}

async function openPanel(doctype, parentFilter = {}, parentId = null, parentContextTitle = "") {
	const existingIdx = openPanels.findIndex((p) => p.doctype === doctype);
	if (existingIdx >= 0) closePanel(openPanels[existingIdx].id);

	const pos = nextPos(parentId);
	const id = ++panelCounter;
	const p = reactive({
		id,
		doctype,
		parentFilter,
		parentId,
		parentContextTitle: (parentContextTitle || "").trim(),
		config: null,
		columns: [],
		rows: [],
		total: 0,
		fullTotal: 0,
		loading: true,
		error: null,
		x: pos.x,
		y: pos.y,
		_setFilters: null,
		_reload: null,
		_showFilter: false,
		_floatRef: null,
		_find: useFindPanel(),
		_findColumns: null,
		_panelApi: null,
	});
	openPanels.push(p);

	try {
		const panel = usePanel(doctype, parentFilter);
		p._panelApi = panel;
		await panel.load();
		p.config = panel.config.value;
		p.columns = panel.columns.value;
		// Keep a live reference so background batch appends stay reactive
		p._panelRows = panel.rows;
		p.rows = panel.rows.value;
		p.total = panel.total.value;
		p.fullTotal = panel.fullTotal.value;
		p._allRows = panel.allRows; // live ref — full unfiltered row set, used by client-side Find
		p._setFilters = (uf) => {
			panel.setFilters(uf);
		};
		p._reload = async () => {
			p.loading = true;
			try {
				await panel.reload();
				p.config = panel.config.value;
				p.columns = panel.columns.value;
				p.rows = panel.rows.value;
				p.total = panel.total.value;
				p.fullTotal = panel.fullTotal.value;
				if (p._find?.mode === "browse" && p._find.foundSetActive) {
					p._findColumns = buildFindColumns(p);
					p._find.reapplyLastFind(
						(rows) => panelApplyFoundSet(p, rows),
						p._findColumns
					);
				}
			} finally {
				p.loading = false;
			}
		};
	} catch (e) {
		p.error = String(e);
	} finally {
		p.loading = false;
	}
}

function closePanel(id) {
	const children = openPanels.filter((p) => p.parentId === id);
	children.forEach((c) => closePanel(c.id));
	const idx = openPanels.findIndex((p) => p.id === id);
	if (idx >= 0) openPanels.splice(idx, 1);
}

function onRootRowClick(row) {
	const doctype = row.frappe_doctype || row.name;
	if (!doctype) return;
	openPanel(doctype, {}, "root");
}

async function onDrill(ev, parentPanel) {
	const filter = {};
	if (ev.linkField && ev.rowName) {
		filter[ev.linkField] = ev.rowName;
	}
	try {
		const r = await new Promise((resolve) => {
			frappe.db
				.get_value("Card Definition", { root_doctype: ev.doctype, is_default: 1 }, "name")
				.then((val) => resolve(val))
				.catch(() => resolve(null));
		});
		const cardDefName =
			typeof r === "object" && r?.name ? r.name : typeof r === "string" ? r : null;
		if (cardDefName && ev.rowName) {
			openCardModal(cardDefName, ev.doctype, ev.rowName);
			return;
		}
	} catch (e) {
		/* fall through to panel */
	}
	let parentContextTitle = "";
	const tf = (parentPanel.config?.title_field || "").trim();
	if (tf && ev.parentRow && ev.parentRow[tf] != null && String(ev.parentRow[tf]).trim() !== "") {
		parentContextTitle = String(ev.parentRow[tf]).trim();
	}
	openPanel(ev.doctype, filter, parentPanel.id, parentContextTitle);
}

function onDrilledRowClick(p, row) {
	if (!row?.name) return;

	if (openFormDialogFromPanelRow(p, row)) {
		return;
	}

	if (!p.config?.open_card_on_click) return;
	const slug = p.doctype.toLowerCase().replace(/ /g, "-");
	const url = `${window.location.origin}/app/${slug}/${encodeURIComponent(row.name)}`;
	window.open(url, "_blank");
}

function onFilterChange(panel, userFilters) {
	if (!panel) {
		rootPanel.setFilters(userFilters);
	} else if (panel._find?.mode === "browse" && panel._panelApi && panel._find.foundRows) {
		const source = panel._find.foundRows;
		const rows = Array.isArray(source) ? source : source.value || [];
		panel._panelApi.setFiltersOnFoundSet(userFilters, rows);
	} else if (panel._setFilters) {
		panel._setFilters(userFilters);
	}
}

function onRefreshRoot() {
	console.log("[PanelReload] onRefreshRoot called, loading.value:", loading.value);
	rootPanel.reload();
}

function onRefreshPanel(panel) {
	console.log(
		"[PanelReload] onRefreshPanel called for",
		panel.doctype,
		"has _reload:",
		!!panel._reload
	);
	if (panel._reload) {
		panel._reload();
	}
}

function onNewRecord(panel) {
	if (!openFormDialogForNewRecord(panel) && typeof frappe !== "undefined" && frappe.msgprint) {
		frappe.msgprint({
			title: __("New record"),
			message: __(
				"Link a Form Dialog on this Page Panel (Dialogs tab) to create records from the panel.",
			),
			indicator: "orange",
		});
	}
}

/** Same row list the table shows: drilled panels use `_panelRows` when set (live ref), else `rows`. */
function panelDisplayRowsForExport(panelPayload) {
	if (!panelPayload) return [];
	const pr = panelPayload._panelRows;
	if (Array.isArray(pr)) return pr;
	const r = panelPayload.rows;
	return Array.isArray(r) ? r : [];
}

function filteredPanelExportArgs(panelPayload) {
	const displayRows = panelDisplayRowsForExport(panelPayload);
	const filteredRowNames = displayRows
		.map((row) => row.name)
		.filter((n) => n != null && String(n).trim() !== "");
	return {
		root_doctype: panelPayload.doctype,
		filters: JSON.stringify(panelPayload.parentFilter || {}),
		filtered_row_names: JSON.stringify(filteredRowNames),
	};
}

/** Fetch public CSV URL same-origin → blob → save as filename (better than navigating away). */
function triggerCsvBrowserDownload(absUrl, filename, rowsExported) {
	fetch(absUrl, { credentials: "same-origin" })
		.then((res) => {
			if (!res.ok) throw new Error(res.statusText);
			return res.blob();
		})
		.then((blob) => {
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = blobUrl;
			a.download = filename || "panel-export.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(blobUrl);
			frappe.show_alert({
				message: __("Downloaded CSV ({0} rows)", [rowsExported]),
				indicator: "green",
			});
		})
		.catch(() => {
			frappe.show_alert({
				message: __("Could not download CSV"),
				indicator: "red",
			});
		});
}

function onDownloadCsv(panelPayload) {
	frappe.call({
		method: "nce_events.api.panel_api_pkg.panel_data.export_panel_data",
		args: filteredPanelExportArgs(panelPayload),
		callback(r) {
			const msg = r.message;
			if (!msg?.url) {
				frappe.show_alert({ message: __("Export failed"), indicator: "red" });
				return;
			}
			const url = window.location.origin + msg.url;
			triggerCsvBrowserDownload(url, msg.filename || "panel-export.csv", msg.rows_exported);
		},
	});
}

function onSheets(panelPayload) {
	frappe.call({
		method: "nce_events.api.panel_api_pkg.panel_data.export_panel_data",
		args: filteredPanelExportArgs(panelPayload),
		callback(r) {
			if (!r.message) return;
			const url = window.location.origin + r.message.url;
			const formula = `=IMPORTDATA("${url}")`;
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(formula).then(() => {
					frappe.show_alert({
						message: __("Link copied — paste in Google Sheets"),
						indicator: "green",
					});
				});
			} else {
				frappe.show_alert({
					message: __("Exported {0} rows", [r.message.rows_exported]),
					indicator: "green",
				});
			}
		},
	});
}
</script>

<style scoped>
/*
 * 4-zone SPA layout
 *   ┌──────────────── 1/3 ────────────────┬──────────── 2/3 ─────────────┐
 *   │  Zone 1 — Title                     │  Zone 2 — Pages float        │
 *   ├── --ppv2-left-col ──┬───────────────┴── 1fr (remainder) ───────────┤
 *   │  Zone 3 — Actions   │  Zone 4 — Table panels, drill-downs, etc.    │
 *   └─────────────────────┴──────────────────────────────────────────────┘
 *
 * Bottom row has its own column split, so the left "Actions" column can be
 * tight (Actions panel width + 40px) while the top row keeps a 1/3 ↔ 2/3 split
 * for title / page switcher.
 */
.ppv2-root {
	position: relative;
	width: 100%;
	height: calc(100vh - 60px);
	display: flex;
	flex-direction: column;
	/* Actions panel init width (200) + 40 px breathing room */
	--ppv2-left-col: 240px;
}

.ppv2-top-row {
	display: grid;
	grid-template-columns: 1fr 2fr;
	height: 71px;
	flex-shrink: 0;
}

.ppv2-bottom-row {
	display: grid;
	grid-template-columns: var(--ppv2-left-col) 1fr;
	flex: 1;
	min-height: 0;
}

.ppv2-zone {
	position: relative;
	overflow: visible;
	min-width: 0;
	min-height: 0;
}

.ppv2-find-stack {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.ppv2-find-stack-table {
	flex: 1;
	min-height: 0;
}

.ppv2-find-stack-table :deep(.ppv2-panel) {
	height: 100%;
}

.ppv2-zone-title {
	padding: 12px 16px;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	font-size: 24pt;
	font-weight: var(--font-weight-bold, 600);
	font-family: var(--font-family);
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
