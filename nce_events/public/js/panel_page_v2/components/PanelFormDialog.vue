<template>
	<div
		ref="backdropRef"
		v-if="open"
		class="ppv2-form-dialog-backdrop"
		:style="{ opacity: dissolveOpacity }"
		@mousedown.self="onBackdropMouseDownSelf"
		@click.self="onBackdropClickSelf"
	>
		<div
			v-if="showFdLoadDebug"
			class="ppv2-fd-load-debug"
			@click.stop
		>
			<div class="ppv2-fd-load-debug-inner">
				<div class="ppv2-fd-load-debug-hd">
					Form load debug
					<span class="ppv2-fd-load-debug-hint">localStorage {{ FD_LOAD_DEBUG_STORAGE_KEY }}=1</span>
				</div>
				<div class="ppv2-fd-load-debug-body">
					<div
						v-for="(row, i) in loadDebugRows"
						:key="i"
						class="ppv2-fd-load-debug-row"
						:class="{ 'ppv2-fd-load-debug-ok': row.ok, 'ppv2-fd-load-debug-bad': !row.ok }"
					>
						<span class="ppv2-fd-load-debug-t">{{ (row.t || "").slice(11, 23) }}</span>
						<span class="ppv2-fd-load-debug-s">{{ row.step }}</span>
						<span class="ppv2-fd-load-debug-d">{{ row.detail }}</span>
						<span v-if="row.err" class="ppv2-fd-load-debug-e">{{ row.err }}</span>
					</div>
				</div>
			</div>
		</div>
		<div
			ref="dialogEl"
			class="ppv2-form-dialog ppv2-fd-dialog-root"
			:class="'ppv2-fd-size-' + form.dialogSize.value"
			:data-nce-theme="themeSlug || undefined"
			:style="dialogStyle"
		>
			<div
				v-if="syncWaiting"
				class="ppv2-fd-readback-overlay"
				@click.stop
			>
				<div class="ppv2-fd-readback-spinner theme-border theme-rounded-sm">{{ syncWaitingText }}</div>
			</div>
			<div
				v-if="deleteSuccessFlash"
				class="ppv2-fd-readback-overlay"
				@click.stop
			>
				<div class="ppv2-fd-readback-spinner theme-border theme-rounded-sm">{{ deleteSuccessFlash }}</div>
			</div>
			<div class="ppv2-fd-drag-handle" @mousedown="startDrag">
				<PanelFormDialogHeader
					:header-bg-class="dialogHeaderBgClass"
					:header-fg-text-class="dialogHeaderFgTextClass"
					:row-nav-enabled="rowNavEnabledEffective"
					:freeze-nav="findCriteriaActive"
					:can-navigate-prev="canNavigatePrev"
					:can-navigate-next="canNavigateNext"
					:row-nav-label="rowNavLabel"
					:title="form.dialogTitle.value"
					:closable="headerClosable"
					@close="onCancel"
					@nav-prev="onNavPrevClick"
					@nav-next="onNavNextClick"
				/>
			</div>
		<PanelFormDialogBody
			ref="fdBodyRef"
			:definition-name="definitionName"
			:root-doctype="doctype"
			:root-doc-name="docName"
			:reload-tick="internalReloadTick"
			:loading="form.loading.value"
			:error="form.error.value"
			:tabs="form.tabs.value"
			:validation-error="form.validationError.value"
			:form-data="form.formData"
			:original-form-data="form.originalData.value"
			:is-field-visible="form.isFieldVisible"
			:is-field-mandatory="form.isFieldMandatory"
			:is-field-read-only="form.isFieldReadOnly"
				:read-only-fields="readOnlyFields"
				:is-field-display-dirty="isFieldDisplayDirty"
				:find-layout-mode="findCriteriaActive"
				:find-criteria="findCriteria"
				:findable-fieldnames="findableFieldnames"
				:read-only-host="findCriteriaActive"
				:go-to-busy="goToPanelBusy"
				v-model:active-tab="activeTab"
				@field-change="onFieldChange"
				@find-criteria-patch="patchFindCriterion"
			@link-change="onLinkChange"
			@related-dirty="onRelatedDirty"
			@go-to-panel="onGoToPanel"
		/>
			<PanelFormDialogFooter
				:buttons="form.buttons.value"
				:definition-name="definitionName"
				:doc-name="docName"
				:custom-action-busy="customActionBusy"
				:submit-hide-if="footerSubmitHideIf"
				:submit-hide-if-sql="footerSubmitHideSql"
				:submit-label="footerSubmitLabel"
				:saving="form.saving.value"
				:sync-waiting="syncWaiting"
				:is-dirty="footerIsDirty"
				:browse-actions-locked="findCriteriaActive"
				:find-chrome-phase="findChromePhase"
				:find-match-active="findMatchActive"
				@cancel="onCancel"
				@revert="onRevert"
				@submit-close="onSubmitClose"
				@submit-refresh="onSubmitRefresh"
				@custom-button="onPlaceholderButton"
				@find-perform="performFindLayout"
				@find-perform-constrain="performConstrainFindLayout"
				@find-cancel="emit('find-cancel-criteria')"
				@find-constrain="emit('find-constrain')"
				@find-modify="emit('find-modify')"
				@find-show-all="emit('find-show-all')"
			/>
			<div class="ppv2-fd-resize-handle" @mousedown.prevent="startResize" />
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted, toRef, computed, provide, nextTick, reactive } from "vue";
import {
	isFdLoadDebugEnabled,
	FD_LOAD_DEBUG_STORAGE_KEY,
} from "../utils/formDialogLoadDebug.js";
import PanelFormDialogHeader from "./PanelFormDialogHeader.vue";
import PanelFormDialogBody from "./PanelFormDialogBody.vue";
import PanelFormDialogFooter from "./PanelFormDialogFooter.vue";
import { usePanelFormDialog } from "../composables/usePanelFormDialog.js";
import { extractServerMessage } from "../composables/frozenFormSave.js";
import { frappeCall } from "../utils/frappeCall.js";
import { ppv2DebugLog, ppv2DebugWarn } from "../utils/ppv2Debug.js";
import { normalizeDocForWooEventsPublish } from "../utils/wooPublishDocNormalize.js";
import { useFormDialogDisplayDirty } from "../composables/useFormDialogDisplayDirty.js";
import {
	confirmDiscardIfDirty,
	createRowNavKeydownHandler,
} from "../composables/useFormDialogChrome.js";
import { useBackdropPointerDismiss } from "../composables/useBackdropPointerDismiss.js";
import {
	pollSyncJobsUntilDone,
	fetchFreshDocAfterSync,
} from "../composables/wpReadbackFlow.js";
import { createSubmitPerfTrace } from "../utils/submitPerfTrace.js";
import {
	isFindSearchableRootField,
	firstNonRelatedTabIndex,
} from "../utils/formDialogFindFields.js";
import { buildRelatedTabPanelFilter } from "../utils/formDialogRelatedGoTo.js";
import {
	promptCancellationFee,
	runProductRefund,
	showRefundActionResult,
} from "../utils/enrollmentWpActions.js";


function escapeForPreHtml(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

const props = defineProps({
	open: { type: Boolean, default: false },
	definitionName: { type: String, required: true },
	doctype: { type: String, required: true },
	docName: { type: String, default: null },
	rowNavEnabled: { type: Boolean, default: false },
	canNavigatePrev: { type: Boolean, default: false },
	canNavigateNext: { type: Boolean, default: false },
	rowNavLabel: { type: String, default: "" },
	dissolveOpacity: { type: Number, default: 1 },
	/** Page Panel Display — root fieldnames required before save */
	requiredFields: { type: Array, default: () => [] },
	/** Page Panel Display — root fieldnames read-only in this dialog */
	readOnlyFields: { type: Array, default: () => [] },
	/** Refetch open panel for this doctype after WC publish (Form Dialog Button script). */
	reloadPanelAfterPublish: { type: Function, default: null },
	/** Where the captured definition lives: 'form_dialog' (default) or 'panel_action'. */
	definitionSource: { type: String, default: "form_dialog" },
	/** `full` | `find-shell` — passed into frozen load (empty criteria shell). */
	dialogLoadMode: { type: String, default: "full" },
	/** Host-driven find UX: `none` | `criteria` | `post-find`. */
	findChromePhase: { type: String, default: "none" },
	/** Optional seed object when entering criteria phase (Modify Find). */
	findSeedCriteria: { type: Object, default: null },
	/** Search-only panel fields to render as extra criteria inputs in Find mode. */
	findSearchOnlyColumns: { type: Array, default: () => [] },
	/** True when a found set is active — passed to footer to enable Constrain Found Set in criteria phase. */
	findMatchActive: { type: Boolean, default: false },
	/** Host opens the related DocType panel (after save + sync poll). */
	onGoToNavigate: { type: Function, default: null },
	/** Opening panel theme slug — scopes dialog palette when set. */
	themeSlug: { type: String, default: "" },
	/** Opening panel dialog_header_bg_class (empty = default theme-bg-primary). */
	dialogHeaderBgClass: { type: String, default: "" },
	dialogHeaderFgTextClass: { type: String, default: "" },
});

const emit = defineEmits([
	"close",
	"saved",
	"nav-prev",
	"nav-next",
	"switch-doc",
	"readback-merged",
	"find-criteria",
	"find-criteria-constrain",
	"find-cancel-criteria",
	"find-show-all",
	"find-modify",
	"find-constrain",
	"go-to-panel",
]);

const activeTab = ref(0);
const findCriteria = reactive({});
const fdBodyRef = ref(null);
const backdropRef = ref(null);
const dialogEl = ref(null);
/** Drag offset from flex-centered origin; reset on each open. */
const dx = ref(0);
const dy = ref(0);
/** Explicit size after corner resize; null = use dialog_size class width + auto height. */
const dlgW = ref(null);
const dlgH = ref(null);

const dialogStyle = computed(() => {
	const s = {
		transform: `translate3d(${dx.value}px, ${dy.value}px, 0)`,
	};
	if (dlgW.value != null) s.width = `${dlgW.value}px`;
	if (dlgH.value != null) s.height = `${dlgH.value}px`;
	return s;
});

function resetDialogPositionAndSize() {
	dx.value = 0;
	dy.value = 0;
	dlgW.value = null;
	dlgH.value = null;
}

function _addDragResizeOverlay(cursor) {
	const overlay = document.createElement("div");
	overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;cursor:${cursor};`;
	document.body.appendChild(overlay);
	return overlay;
}

function startDrag(e) {
	if (
		e.target.closest(
			"button, input, select, textarea, a, [role='button'], .ppv2-fd-nav, .ppv2-fd-close",
		)
	) {
		return;
	}
	e.preventDefault();
	const sx = e.clientX;
	const sy = e.clientY;
	const odx = dx.value;
	const ody = dy.value;
	const el = dialogEl.value;
	if (!el) return;
	const overlay = _addDragResizeOverlay("move");

	function onMove(ev) {
		const ndx = odx + ev.clientX - sx;
		const ndy = ody + ev.clientY - sy;
		el.style.transform = `translate3d(${ndx}px, ${ndy}px, 0)`;
	}
	function onUp(ev) {
		document.body.removeChild(overlay);
		dx.value = odx + ev.clientX - sx;
		dy.value = ody + ev.clientY - sy;
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}

function startResize(e) {
	const el = dialogEl.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	const sx = e.clientX;
	const sy = e.clientY;
	const ow = dlgW.value != null ? dlgW.value : rect.width;
	const oh = dlgH.value != null ? dlgH.value : rect.height;
	const overlay = _addDragResizeOverlay("nwse-resize");

	const outline = document.createElement("div");
	outline.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${ow}px;height:${oh}px;border:1px solid var(--nce-color-primary, #4a5568);z-index:999998;pointer-events:none;box-sizing:border-box;`;
	document.body.appendChild(outline);

	const maxW = Math.floor(window.innerWidth * 0.95);
	const maxH = Math.floor(window.innerHeight * 0.95);
	const minW = 360;
	const minH = 200;

	function onMove(ev) {
		const nw = Math.min(maxW, Math.max(minW, ow + ev.clientX - sx));
		const nh = Math.min(maxH, Math.max(minH, oh + ev.clientY - sy));
		outline.style.width = `${nw}px`;
		outline.style.height = `${nh}px`;
	}
	function onUp(ev) {
		document.body.removeChild(overlay);
		document.body.removeChild(outline);
		dlgW.value = Math.min(maxW, Math.max(minW, ow + ev.clientX - sx));
		dlgH.value = Math.min(maxH, Math.max(minH, oh + ev.clientY - sy));
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}
const relatedDirty = ref(false);
const goToPanelBusy = ref(false);
/** Bumped after Submit and Refresh so related grids refetch. */
const internalReloadTick = ref(0);
/** True while polling WP sync jobs after save — shows overlay, disables footer actions. */
const syncWaiting = ref(false);
const customActionBusy = ref(false);
const deleteSuccessFlash = ref("");


const syncWaitingText =
	typeof window.__ === "function" ? window.__("Updating") + "…" : "Updating…";

const headerClosable = computed(() => !syncWaiting.value && !deleteSuccessFlash.value);

const rowNavEnabledEffective = computed(
	() => props.rowNavEnabled && !syncWaiting.value && !deleteSuccessFlash.value,
);

const findCriteriaActive = computed(() => props.findChromePhase === "criteria");

// Set of fieldnames from panel effective_searchable — only these are enterable in Find mode.
// null when no panel context (allows all searchable fields).
const findableFieldnames = computed(() => {
	const cols = props.findSearchOnlyColumns;
	if (!cols || !cols.length) return null;
	return new Set(cols.map((c) => c.fieldname));
});

const form = usePanelFormDialog({
	definitionName: toRef(props, "definitionName"),
	doctype: toRef(props, "doctype"),
	docName: toRef(props, "docName"),
	requiredFields: toRef(props, "requiredFields"),
	readOnlyFields: toRef(props, "readOnlyFields"),
	definitionSource: toRef(props, "definitionSource"),
	loadMode: toRef(props, "dialogLoadMode"),
});

const {
	displayDirty,
	changedDisplayFields,
	scheduleRecompute: scheduleDisplayDirtyRecompute,
	refreshBaselineAfterRevert,
	commitFocusedFrappeWidget,
} = useFormDialogDisplayDirty({ fdBodyRef, form });

// Provide the raw ref so Date/Link controls can read .value synchronously
// in their Frappe df.change() callback — bypasses Vue prop propagation delay.
provide("fdSyncingFromLoad", form.syncingFromLoad);

const showFdLoadDebug = ref(false);

const loadDebugRows = computed(() => form.loadDebugLog.value);

const footerIsDirty = computed(() => displayDirty.value || relatedDirty.value);

function isFieldDisplayDirty(fieldname) {
	return changedDisplayFields.value.includes(fieldname);
}

function clearFindCriteriaBag() {
	for (const k of Object.keys(findCriteria)) delete findCriteria[k];
}

function patchFindCriterion({ fieldname, value }) {
	if (!fieldname) return;
	findCriteria[fieldname] = value;
}

function syncFindCriteriaFromSeed() {
	clearFindCriteriaBag();
	const seed = props.findSeedCriteria;
	for (const f of form.allFields.value || []) {
		if (!isFindSearchableRootField(f)) continue;
		if (findableFieldnames.value && !findableFieldnames.value.has(f.fieldname)) continue;
		const fn = f.fieldname;
		if (seed && typeof seed === "object" && Object.prototype.hasOwnProperty.call(seed, fn)) {
			const v = seed[fn];
			findCriteria[fn] = v == null ? "" : String(v);
		} else {
			findCriteria[fn] = "";
		}
	}
	const tabs = form.tabs.value || [];
	if (tabs.length && tabs[activeTab.value]?._related) {
		activeTab.value = firstNonRelatedTabIndex(tabs);
	}
}

function performFindLayout() {
	const out = {};
	for (const k of Object.keys(findCriteria)) {
		if (String(findCriteria[k] ?? "").trim() !== "") {
			out[k] = findCriteria[k];
		}
	}
	emit("find-criteria", { ...out });
}

/** Same as performFindLayout but signals host to narrow within the current found set. */
function performConstrainFindLayout() {
	const out = {};
	for (const k of Object.keys(findCriteria)) {
		if (String(findCriteria[k] ?? "").trim() !== "") {
			out[k] = findCriteria[k];
		}
	}
	emit("find-criteria-constrain", { ...out });
}

watch(
	() => ({
		open: props.open,
		phase: props.findChromePhase,
		fieldCount: form.allFields.value?.length ?? 0,
		seedKeys:
			props.findSeedCriteria && typeof props.findSeedCriteria === "object"
				? Object.keys(props.findSeedCriteria).sort().join(",")
				: "",
	}),
	() => {
		if (!props.open || props.findChromePhase !== "criteria") return;
		syncFindCriteriaFromSeed();
	},
);

watch(
	() => props.open,
	(o) => {
		if (!o) {
			clearFindCriteriaBag();
			return;
		}
		resetDialogPositionAndSize();
		showFdLoadDebug.value = isFdLoadDebugEnabled();
		syncWaiting.value = false;
		internalReloadTick.value = 0;
	},
	{ immediate: true },
);

function onCancel() {
	if (props.findChromePhase === "criteria") {
		emit("find-cancel-criteria");
		return;
	}
	if (syncWaiting.value) {
		return;
	}
	confirmDiscardIfDirty(() => footerIsDirty.value, () => {
		form.revert();
		fdBodyRef.value?.resetRelatedToBaseline?.();
		relatedDirty.value = false;
		emit("close");
	});
}

const { onMouseDownSelf: onBackdropMouseDownSelf, onClickSelf: onBackdropClickSelf, disarm: disarmBackdropDismiss } =
	useBackdropPointerDismiss(backdropRef, onCancel);

const footerSubmitHideIf = computed(
	() => (form.definition.value?.submit_hide_if || "Never").trim() || "Never",
);
const footerSubmitHideSql = computed(() =>
	String(form.definition.value?.submit_hide_if_sql || "").trim(),
);

const footerSubmitLabel = computed(() =>
	String(form.definition.value?.submit_label || "").trim(),
);

function onRelatedDirty(v) {
	relatedDirty.value = !!v;
}

async function refreshFormAfterSave() {
	try {
		/* Load root doc first so ``docName`` / link fields are in sync, then bump tick so related tabs refetch. */
		await form.load();
		await nextTick();
		relatedDirty.value = false;
		internalReloadTick.value += 1;
		await nextTick();
		fdBodyRef.value?.reloadRelatedFromServer?.();
		await nextTick();
	} catch {
		/* keep current form */
	}
}

function onRevert() {
	if (findCriteriaActive.value) return;
	if (syncWaiting.value) return;
	if (!footerIsDirty.value || form.saving.value) {
		return;
	}
	const msg =
		typeof window.__ === "function"
			? window.__(
					"Discard all changes to this form and related rows and restore the last loaded values?",
				)
			: "Discard all changes to this form and related rows and restore the last loaded values?";
	const proceed = () => {
		form.revert();
		form.validationError.value = null;
		fdBodyRef.value?.resetRelatedToBaseline?.();
		relatedDirty.value = false;
		refreshBaselineAfterRevert();
	};
	if (typeof frappe !== "undefined" && frappe.confirm) {
		frappe.confirm(msg, proceed, () => {});
	} else if (window.confirm(msg)) {
		proceed();
	}
}

function onNavPrevClick() {
	if (findCriteriaActive.value) return;
	if (syncWaiting.value) return;
	if (!props.canNavigatePrev) return;
	confirmDiscardIfDirty(() => footerIsDirty.value, () => emit("nav-prev"));
}

function onNavNextClick() {
	if (findCriteriaActive.value) return;
	if (syncWaiting.value) return;
	if (!props.canNavigateNext) return;
	confirmDiscardIfDirty(() => footerIsDirty.value, () => emit("nav-next"));
}

const onFormDialogKeydown = createRowNavKeydownHandler({
	getOpen: () => props.open,
	getCanPrev: () =>
		props.canNavigatePrev &&
		!syncWaiting.value &&
		!findCriteriaActive.value,
	getCanNext: () =>
		props.canNavigateNext &&
		!syncWaiting.value &&
		!findCriteriaActive.value,
	onNavPrev: onNavPrevClick,
	onNavNext: onNavNextClick,
});

watch(
	() => ({
		open: props.open,
		docName: props.docName,
		definitionName: props.definitionName,
		doctype: props.doctype,
	}),
	(cur, prev) => {
		if (!cur.open) {
			disarmBackdropDismiss();
			window.removeEventListener("keydown", onFormDialogKeydown, true);
			form.resetWhenClosed();
			return;
		}
		window.removeEventListener("keydown", onFormDialogKeydown, true);
		window.addEventListener("keydown", onFormDialogKeydown, true);

		const wasOpen = prev?.open;
		const opening = !wasOpen;
		const contextChanged =
			opening ||
			cur.docName !== prev?.docName ||
			cur.definitionName !== prev?.definitionName ||
			cur.doctype !== prev?.doctype;
		if (contextChanged) {
			if (opening || cur.docName !== prev?.docName) {
				activeTab.value = 0;
			}
			form.load();
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	window.removeEventListener("keydown", onFormDialogKeydown, true);
	form.resetWhenClosed();
});

function onFieldChange({ fieldname, value }) {
	form.formData[fieldname] = value;
	form.onFieldChange(fieldname);
	scheduleDisplayDirtyRecompute();
}

async function onLinkChange({ fieldname, value }) {
	form.formData[fieldname] = value;
	await form.handleFetchFrom(fieldname, value);
	scheduleDisplayDirtyRecompute();
}

/**
 * Save main form + related grids before Go to. Returns false if blocked.
 * Uses the same Frappe save + related-row APIs as Submit (including sync jobs), but skips
 * the read-back footer UX — sync jobs are polled here so the opened panel sees fresh data.
 * @returns {Promise<{ ok: boolean, mainSaved: boolean, relatedSaved: boolean, syncJobIds: string[] }>}
 */
async function savePendingEditsBeforeNavigate() {
	if (findCriteriaActive.value) {
		return { ok: false, mainSaved: false, relatedSaved: false, syncJobIds: [] };
	}
	await commitFocusedFrappeWidget();
	if (!footerIsDirty.value) {
		return { ok: true, mainSaved: false, relatedSaved: false, syncJobIds: [] };
	}

	const onSubmitMethod = (form.definition.value?.on_submit_method || "").trim();
	if (onSubmitMethod && displayDirty.value) {
		form.validationError.value = __("Use Submit and Close or Submit and Refresh to save this form before opening the panel.");
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint({
				title: __("Save required"),
				message: form.validationError.value,
				indicator: "orange",
			});
		}
		return { ok: false, mainSaved: false, relatedSaved: false, syncJobIds: [] };
	}

	const syncJobIds = [];
	let mainSaved = false;
	let relatedSaved = false;

	if (displayDirty.value) {
		form.validationError.value = null;
		const errors = form.validate();
		if (errors.length) {
			form.validationError.value = errors.map((e) => e.message).join(", ");
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: __("Validation"),
					message: form.validationError.value,
					indicator: "red",
				});
			}
			return { ok: false, mainSaved: false, relatedSaved: false, syncJobIds: [] };
		}
		const result = await form.save();
		mainSaved = true;
		if (Array.isArray(result?.sync_job_ids)) {
			syncJobIds.push(...result.sync_job_ids);
		}
	}

	if (relatedDirty.value) {
		try {
			const relIds = await fdBodyRef.value?.saveAllRelatedRows?.();
			relatedSaved = true;
			relatedDirty.value = false;
			if (Array.isArray(relIds)) {
				syncJobIds.push(...relIds);
			}
		} catch (relErr) {
			const m = extractServerMessage(relErr);
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: __("Related rows"),
					message: m,
					indicator: "red",
				});
			}
			throw relErr;
		}
	}

	return { ok: true, mainSaved, relatedSaved, syncJobIds };
}

async function onGoToPanel(ev) {
	if (findCriteriaActive.value || goToPanelBusy.value) {
		return;
	}
	const doctype = String(ev?.doctype || "").trim();
	if (!doctype || !ev?.related) {
		return;
	}

	goToPanelBusy.value = true;
	form.saving.value = true;
	try {
		const { ok, mainSaved, relatedSaved, syncJobIds } = await savePendingEditsBeforeNavigate();
		if (!ok) {
			return;
		}

		const jobIds = [...new Set((syncJobIds || []).map((id) => String(id).trim()).filter(Boolean))];
		if (jobIds.length) {
			const { anyFailed } = await pollSyncJobsUntilDone(jobIds);
			if (anyFailed && typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: __("Sync error"),
					message: __("One or more sync jobs failed. The panel may show stale data."),
					indicator: "orange",
				});
			}
		}

		const rootName = String(form.formData?.name ?? props.docName ?? "").trim();
		const rows = fdBodyRef.value?.getRelatedRowsForTab?.(ev.ti) ?? [];
		const parentFilter = buildRelatedTabPanelFilter(ev.related, rootName, rows);
		if (!parentFilter) {
			if (typeof frappe !== "undefined" && frappe.show_alert) {
				frappe.show_alert({
					message: __("No related rows to open in the panel."),
					indicator: "orange",
				});
			}
			return;
		}

		if (typeof props.onGoToNavigate === "function") {
			await props.onGoToNavigate({ doctype, parentFilter });
		} else {
			emit("go-to-panel", { doctype, parentFilter });
		}
		if (mainSaved || relatedSaved) {
			emit("saved");
		}
		emit("close");
	} catch (e) {
		const msg = e?.message || extractServerMessage(e) || String(e || "");
		if (msg && typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
		}
	} finally {
		goToPanelBusy.value = false;
		form.saving.value = false;
	}
}

/**
 * Poll WP sync jobs after save, trigger linked read-back syncs, patch panel row.
 * @param {{ alwaysReadback?: boolean }} opts — when true, always fetch fresh doc + linked sync even with no job ids
 * @returns {Promise<boolean>} false when sync failed
 */
async function runSyncReadbackAfterSave({
	result,
	relatedSaveJobIds,
	oldRowName,
	pollLog,
	alwaysReadback = false,
}) {
	const mainJobIds = Array.isArray(result?.sync_job_ids) ? result.sync_job_ids : [];
	const relatedJobIds = Array.isArray(relatedSaveJobIds) ? relatedSaveJobIds : [];
	const allJobIds = [...mainJobIds, ...relatedJobIds];
	ppv2DebugLog("[NCE readback] save complete. mainJobIds:", mainJobIds, "relatedJobIds:", relatedJobIds);

	const savedName =
		result?.name != null && String(result.name).trim() !== ""
			? String(result.name).trim()
			: null;

	if (!allJobIds.length && !alwaysReadback) {
		if (result && (savedName || oldRowName)) {
			emit("readback-merged", { fresh: result, oldRowName, savedName });
		}
		return true;
	}

	if (allJobIds.length) {
		syncWaiting.value = true;
	}
	try {
		if (allJobIds.length) {
			pollLog?.("readback", "poll main + related sync jobs");
			const { anyFailed } = await pollSyncJobsUntilDone(allJobIds, { log: pollLog });
			if (anyFailed) {
				pollLog?.("sync", "one or more main/related jobs failed");
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({
						title: __("Sync error"),
						message: __("One or more sync jobs failed. Check Error Log."),
						indicator: "red",
					});
				}
				return false;
			}
		}

		const freshName = savedName || oldRowName;
		try {
			ppv2DebugLog("[NCE readback] triggering linked DocType syncs for", freshName);
			pollLog?.("linked", `trigger_linked_sync_for_dialog_readback name=${freshName}`);
			const linkedResult = await frappeCall(
				"nce_events.api.form_dialog.sync_related.trigger_linked_sync_for_dialog_readback",
				{
					definition: props.definitionName,
					root_doctype: props.doctype,
					root_name: freshName,
				},
			);
			const linkedJobIds = Array.isArray(linkedResult?.sync_job_ids)
				? linkedResult.sync_job_ids
				: [];
			ppv2DebugLog("[NCE readback] linked sync job_ids:", linkedJobIds);
			pollLog?.("linked", `sync_job_ids count=${linkedJobIds.length}`);
			if (linkedJobIds.length) {
				syncWaiting.value = true;
				pollLog?.("readback", "poll linked sync jobs");
				await pollSyncJobsUntilDone(linkedJobIds, { log: pollLog });
			}
		} catch (err) {
			ppv2DebugWarn("[NCE readback] linked sync failed (non-fatal):", err);
			pollLog?.("linked_error", err?.message || String(err));
		}
		pollLog?.("readback", "fetchFreshDocAfterSync");
		const fresh = await fetchFreshDocAfterSync(props.doctype, freshName);
		emit("readback-merged", { fresh: fresh || result, oldRowName, savedName });
		await nextTick();
		return true;
	} catch (e) {
		const msg = e?.message || String(e) || __("Read-back wait failed");
		pollLog?.("readback_error", msg);
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
		}
		return false;
	} finally {
		syncWaiting.value = false;
	}
}

/**
 * Full Submit-and-Refresh pipeline for a saved record — presubmit hook, save,
 * related rows, WP read-back, form reload. Used after duplicate when the form
 * is already persisted but we still need the complete S&R side effects.
 * @param {{ skipPresubmit?: boolean, skipSave?: boolean, skipRelatedSave?: boolean }} opts
 */
async function runForcedSubmitRefreshReadback({
	initialSyncJobIds = [],
	pollLog,
	skipPresubmit = false,
	skipSave = false,
	skipRelatedSave = false,
} = {}) {
	const submitHookMethod = (form.definition.value?.custom_presubmit_script || "").trim();
	let hookResult = null;
	if (
		!skipPresubmit &&
		submitHookMethod &&
		String(form.formData.name || "").match(/^\d+$/)
	) {
		pollLog?.("presubmit", submitHookMethod);
		const raw = JSON.parse(JSON.stringify(form.formData));
		const doc =
			props.doctype === "Events"
				? normalizeDocForWooEventsPublish({ doctype: props.doctype, ...raw })
				: { doctype: props.doctype, ...raw };
		try {
			hookResult = await frappeCall(submitHookMethod, { doc });
			pollLog?.("presubmit", `ok skipped=${Boolean(hookResult?.skipped)}`);
		} catch (hookErr) {
			const msg = hookErr?.message || String(hookErr) || "Update failed";
			pollLog?.("presubmit_error", msg);
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({ title: "WooCommerce", message: msg, indicator: "red" });
			}
		}
	}

	form.saving.value = true;
	let result = null;
	try {
		if (skipSave) {
			const savedName = String(form.formData?.name || props.docName || "").trim();
			result = {
				name: savedName || undefined,
				sync_job_ids: Array.isArray(initialSyncJobIds) ? [...initialSyncJobIds] : [],
			};
			pollLog?.("save", "skipped (already persisted server-side)");
		} else {
			result = await form.save();
		}
	} finally {
		form.saving.value = false;
	}

	const mergedJobIds = [
		...(Array.isArray(initialSyncJobIds) ? initialSyncJobIds : []),
		...(Array.isArray(result?.sync_job_ids) ? result.sync_job_ids : []),
	];
	result = { ...result, sync_job_ids: mergedJobIds };

	let relatedSaveJobIds = [];
	if (!skipRelatedSave && relatedDirty.value) {
		try {
			const relResult = await fdBodyRef.value?.saveAllRelatedRows?.();
			if (Array.isArray(relResult)) relatedSaveJobIds = relResult;
		} catch (relErr) {
			const m = extractServerMessage(relErr);
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({ title: "Related rows", message: m, indicator: "red" });
			}
			throw relErr;
		}
	}

	if (hookResult && !hookResult.skipped) {
		if (typeof frappe !== "undefined" && frappe.show_alert) {
			frappe.show_alert({ message: "WooCommerce product updated", indicator: "green" }, 5);
		}
	}

	const readbackOk = await runSyncReadbackAfterSave({
		result,
		relatedSaveJobIds,
		oldRowName: props.docName,
		pollLog,
		alwaysReadback: true,
	});
	if (readbackOk) {
		await refreshFormAfterSave();
	}
	return readbackOk;
}

function onSubmitClose(opts) {
	onSubmit({ ...opts, afterSave: "close" });
}

function onSubmitRefresh(opts) {
	onSubmit({ ...opts, afterSave: "refresh" });
}

async function onSubmit(opts = {}) {
	if (findCriteriaActive.value) return;
	const afterSave = opts.afterSave === "refresh" ? "refresh" : "close";
	const perf = createSubmitPerfTrace({ liveDialog: !!opts?.shift });
	perf.push(
		"start",
		`submit(${afterSave}) ${props.doctype} def=${props.definitionName || ""} doc=${props.docName || "(new)"}`,
	);
	const pollLog = (cat, msg) => perf.push(cat, msg);
	try {
		const blurredField = await commitFocusedFrappeWidget();
		perf.push(
			"dirty",
			`blurred=${blurredField || "none"} displayDirty=${displayDirty.value} changed=${changedDisplayFields.value.join(", ") || "none"}`,
		);
		if (!footerIsDirty.value) {
			if (afterSave === "refresh") {
				perf.push("refresh", "clean form — reload only, no save");
				await refreshFormAfterSave();
			} else {
				perf.push("skip", "clean form — submit-close has nothing to save");
			}
			return;
		}
		const onSubmitMethod = (form.definition.value?.on_submit_method || "").trim();
		if (onSubmitMethod) {
			perf.push("branch", "custom on_submit_method");
			form.validationError.value = null;
			const errors = form.validate();
			if (errors.length) {
				form.validationError.value = errors.map((e) => e.message).join(", ");
				perf.push("validation", form.validationError.value);
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({
						title: __("Validation"),
						message: form.validationError.value,
						indicator: "red",
					});
				}
				return;
			}
			perf.push("step", "commitFocusedFrappeWidget (custom submit)");
			const raw = JSON.parse(JSON.stringify(form.formData));
			let doc = { doctype: props.doctype, ...raw };
			if (props.doctype === "Events") {
				doc = normalizeDocForWooEventsPublish({ doctype: props.doctype, ...raw });
			}
			form.saving.value = true;
			try {
				perf.push("api", `calling custom on_submit_method ${onSubmitMethod}`);
				const r = await frappeCall(
					onSubmitMethod,
					{ doc },
					{ freeze: true, freeze_message: __("Submitting…") },
				);
				perf.push("api", `on_submit_method response ok=${Boolean(r?.ok)}`);
				if (!r?.ok) {
					const msg = r?.message || __("Submit failed");
					form.validationError.value = msg;
					perf.push("error", msg);
					if (typeof frappe !== "undefined" && frappe.msgprint) {
						frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
					}
					return;
				}
				/* Server handled persistence (e.g. Woo + clear Single). Sync UI from DB — no Document.save in Vue. */
				perf.push("step", "form.load after custom submit");
				await form.load();
				form.validationError.value = null;
				if (r.clear_ok === 0) {
					if (typeof frappe !== "undefined" && frappe.msgprint) {
						frappe.msgprint({
							title: __("Published"),
							message: __(
								"Product was created but clearing the form failed — open Desk if needed.",
							),
							indicator: "orange",
						});
					}
				} else if (r.wp_id != null) {
					if (typeof frappe !== "undefined" && frappe.msgprint) {
						frappe.msgprint({
							title: __("Published"),
							message: `<p>${__("Product ID")} <strong>${frappe.utils.escape_html(
								String(r.wp_id),
							)}</strong> ${__("created in Woo Commerce")}</p><p>${__(
								"It will appear in the Events panel in a few minutes",
							)}</p>`,
							indicator: "green",
						});
					}
				} else if (typeof frappe !== "undefined" && frappe.show_alert) {
					frappe.show_alert({ message: __("Done"), indicator: "green" }, 5);
				}
				if (typeof props.reloadPanelAfterPublish === "function") {
					perf.push("step", "reloadPanelAfterPublish()");
					await props.reloadPanelAfterPublish();
				}
				if (afterSave === "refresh") {
					perf.push("done", "custom submit refresh path complete");
					await refreshFormAfterSave();
				} else {
					perf.push("done", "custom submit path complete, closing dialog");
					/* Do not emit saved — no Frappe form save; host must not run onFormDialogSaved panel refresh. */
					emit("close");
				}
			} catch (e) {
				const msg = e?.message || String(e) || __("Submit failed");
				form.validationError.value = msg;
				perf.push("error", msg);
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
				}
			} finally {
				form.saving.value = false;
			}
			return;
		}

		perf.push("branch", "standard Frappe save + readback");

		// If the Form Dialog definition has a presubmit script and the record already
		// has a numeric name (linked to an external system), call it BEFORE saving to
		// Frappe so change-detection compares against the old stored DB values.
		const submitHookMethod = (form.definition.value?.custom_presubmit_script || "").trim();
		let hookResult = null;
		if (submitHookMethod && displayDirty.value && String(form.formData.name || "").match(/^\d+$/)) {
			perf.push("step", `presubmit hook ${submitHookMethod}`);
			const raw = JSON.parse(JSON.stringify(form.formData));
			const doc = props.doctype === "Events"
				? normalizeDocForWooEventsPublish({ doctype: props.doctype, ...raw })
				: { doctype: props.doctype, ...raw };
			try {
				hookResult = await frappeCall(submitHookMethod, { doc });
				perf.push("presubmit", `hook returned skipped=${Boolean(hookResult?.skipped)}`);
			} catch (hookErr) {
				const msg = hookErr?.message || String(hookErr) || "Update failed";
				perf.push("presubmit_error", msg);
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({ title: "WooCommerce", message: msg, indicator: "red" });
				}
				// Hook failure does not block the Frappe save
			}
		}

		let result = null;
		if (displayDirty.value) {
			perf.push("save", "form.save() …");
			result = await form.save();
			perf.push(
				"save",
				`form.save ok name=${result?.name ?? "?"} sync_job_ids=${JSON.stringify(result?.sync_job_ids || [])}`,
			);
		} else {
			perf.push("save", "skip form.save (root unchanged)");
			result = { name: form.formData.name, sync_job_ids: [] };
		}
		let relatedSaveJobIds = [];
		if (relatedDirty.value) {
			try {
				perf.push("related", "saveAllRelatedRows() …");
				const relResult = await fdBodyRef.value?.saveAllRelatedRows?.();
				if (Array.isArray(relResult)) relatedSaveJobIds = relResult;
				perf.push("related", `related sync_job_ids=${JSON.stringify(relatedSaveJobIds)}`);
			} catch (relErr) {
				const m = extractServerMessage(relErr);
				perf.push("related_error", m);
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({
						title: "Related rows",
						message: m,
						indicator: "red",
					});
				}
				throw relErr;
			}
		} else {
			perf.push("related", "skip saveAllRelatedRows (unchanged)");
		}

		if (hookResult && !hookResult.skipped) {
			if (typeof frappe !== "undefined" && frappe.show_alert) {
				frappe.show_alert({ message: "WooCommerce product updated", indicator: "green" }, 5);
			}
		}

		const oldRowName = props.docName;
		const readbackOk = await runSyncReadbackAfterSave({
			result,
			relatedSaveJobIds,
			oldRowName,
			pollLog,
		});
		if (!readbackOk) {
			return;
		}

		if (afterSave === "refresh") {
			perf.push("done", "submit refresh path complete");
			await refreshFormAfterSave();
		} else {
			perf.push("saved", "emit saved");
			emit("saved");
		}
	} catch (e) {
		const msg =
			e?.message ||
			extractServerMessage(e) ||
			String(e || "");
		if (msg) perf.push("error", msg);
		// validationError (root) or related save error — stay open
	} finally {
		perf.showCopyDialog();
	}
}

async function runEnrollmentProductRefund() {
	if (findCriteriaActive.value || customActionBusy.value) {
		return;
	}
	if (props.doctype !== "Enrollments") {
		return;
	}
	const enrollmentName = String(props.docName || form.formData?.name || "").trim();
	if (!enrollmentName) {
		return;
	}
	let cancellationFee = null;
	try {
		cancellationFee = await promptCancellationFee({
			title: __("Cancel Registration"),
			primaryLabel: __("Confirm Cancellation"),
			confirmMessage: __(
				"This will cancel the registration in WooCommerce, issue store credit, and remove this enrollment from the panel.",
			),
		});
	} catch {
		return;
	}
	customActionBusy.value = true;
	const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
	try {
		const result = await runProductRefund(enrollmentName, cancellationFee);
		const elapsedMs =
			(typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
		showRefundActionResult(result, enrollmentName, { elapsedMs });
	} catch (e) {
		const msg = extractServerMessage(e) || e?.message || String(e) || __("Cancellation failed");
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
		}
	} finally {
		customActionBusy.value = false;
	}
}

async function onPlaceholderButton(btn) {
	if (findCriteriaActive.value || customActionBusy.value) return;
	const script = String(btn?.button_script || "").trim();
	const scriptToken = (script.split(/\s+/)[0] || "").trim();

	if (props.doctype === "Enrollments" && scriptToken === "execute_product_refund") {
		await runEnrollmentProductRefund();
		return;
	}

	if (props.doctype === "Events" && scriptToken === "duplicate_event") {
		const sourceName = String(form.formData?.name || props.docName || "").trim();
		if (!sourceName) {
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: __("Duplicate Event"),
					message: __("Save this event before duplicating."),
					indicator: "orange",
				});
			}
			return;
		}
		customActionBusy.value = true;
		try {
			await commitFocusedFrappeWidget();
			const raw = JSON.parse(JSON.stringify(form.formData));
			const doc = normalizeDocForWooEventsPublish({ doctype: props.doctype, ...raw });

			// Phase 1 — create WC product + insert sessions
			const r1 = await frappeCall(
				"nce_events.api.events_publish.duplicate_event_start",
				{ source_name: sourceName, doc },
				{ freeze: true, freeze_message: __("Duplicating event — copying sessions…") },
			);
			if (!r1?.ok || !r1?.new_name) {
				throw new Error(extractServerMessage(r1) || __("Duplicate failed"));
			}
			const newName = String(r1.new_name).trim();
			const sessionJobIds = Array.isArray(r1.session_job_ids) ? r1.session_job_ids : [];

			// Wait for all session WP push jobs to finish before inserting Events row
			if (sessionJobIds.length) {
				syncWaiting.value = true;
				const { anyFailed } = await pollSyncJobsUntilDone(sessionJobIds);
				syncWaiting.value = false;
				if (anyFailed) {
					throw new Error(__("One or more session sync jobs failed. Check Error Log."));
				}
			}

			// Phase 2 — insert Events row (sessions are now confirmed in WP)
			const r2 = await frappeCall(
				"nce_events.api.events_publish.duplicate_event_finalize",
				{ new_wp_id: r1.new_wp_id, source_name: sourceName, doc },
				{ freeze: true, freeze_message: __("Inserting event record…") },
			);
			if (!r2?.ok) {
				throw new Error(extractServerMessage(r2) || __("Duplicate finalize failed"));
			}
			const eventsJobIds = Array.isArray(r2.events_job_ids) ? r2.events_job_ids : [];

			// Wait for Events WP push job to finish
			if (eventsJobIds.length) {
				syncWaiting.value = true;
				const { anyFailed } = await pollSyncJobsUntilDone(eventsJobIds);
				syncWaiting.value = false;
				if (anyFailed) {
					throw new Error(__("Event sync job failed. Check Error Log."));
				}
			}

			// Switch to new doc, load form, reload all related tabs
			emit("switch-doc", newName);
			await nextTick();
			await form.load();
			await nextTick();
			internalReloadTick.value += 1;
			await nextTick();
			fdBodyRef.value?.reloadRelatedFromServer?.();

			// Full readback — linked sync pulls all related tables (sessions + any future ones)
			const readbackOk = await runSyncReadbackAfterSave({
				result: { name: newName, sync_job_ids: [] },
				relatedSaveJobIds: [],
				oldRowName: newName,
				alwaysReadback: true,
			});
			if (readbackOk && typeof props.reloadPanelAfterPublish === "function") {
				await props.reloadPanelAfterPublish();
			}
			if (!readbackOk) return;
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: __("Duplicate Event"),
					message: `<p>${frappe.utils.escape_html(
						String(r2.message || `Event duplicated as product id ${newName}.`),
					)}</p>`,
					indicator: "green",
				});
			}
		} catch (e) {
			syncWaiting.value = false;
			const msg =
				extractServerMessage(e) || e?.message || String(e) || __("Duplicate failed");
			form.validationError.value = msg;
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({ title: __("Duplicate Event"), message: msg, indicator: "red" });
			}
		} finally {
			customActionBusy.value = false;
		}
		return;
	}

	if (props.doctype === "Events" && scriptToken === "delete_event") {
		const eventName = String(form.formData?.name || props.docName || "").trim();
		if (!eventName) {
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: __("Delete Event"),
					message: __("Save this event before deleting."),
					indicator: "orange",
				});
			}
			return;
		}
		customActionBusy.value = true;
		try {
			const r = await frappeCall(
				"nce_events.api.events_publish.delete_event",
				{ source_name: eventName },
				{ freeze: true, freeze_message: __("Deleting event…") },
			);
			if (!r?.ok) {
				throw new Error(extractServerMessage(r) || __("Delete failed"));
			}
			const syncJobIds = Array.isArray(r.sync_job_ids) ? r.sync_job_ids : [];
			if (syncJobIds.length) {
				syncWaiting.value = true;
				const { anyFailed } = await pollSyncJobsUntilDone(syncJobIds);
				syncWaiting.value = false;
				if (anyFailed) {
					throw new Error(__("One or more sync jobs failed. Check Error Log."));
				}
			}
			window._nce_remove_panel_row?.("Events", eventName);
			deleteSuccessFlash.value = String(r.message || __("The event has been deleted."));
			await new Promise((resolve) => setTimeout(resolve, 3000));
			deleteSuccessFlash.value = "";
			emit("close");
		} catch (e) {
			syncWaiting.value = false;
			deleteSuccessFlash.value = "";
			const msg = extractServerMessage(e) || e?.message || String(e) || __("Delete failed");
			form.validationError.value = msg;
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({ title: __("Delete Event"), message: msg, indicator: "red" });
			}
		} finally {
			customActionBusy.value = false;
		}
		return;
	}

	if (props.doctype === "Events" && (scriptToken === "freeze_event_sessions" || scriptToken === "unfreeze_event_sessions")) {
		const freezing = scriptToken === "freeze_event_sessions";
		const title = freezing ? __("Freeze Sessions") : __("Unfreeze Sessions");
		customActionBusy.value = true;
		form.saving.value = true;
		try {
			form.formData.session_dates_edit_ok = freezing ? 1 : 0;
			form.formData.sessions_table_edit_ok = freezing ? 1 : 0;
			await form.save();
			await refreshFormAfterSave();
		} catch (e) {
			const msg = extractServerMessage(e) || e?.message || String(e) || __("Save failed");
			form.validationError.value = msg;
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({ title, message: msg, indicator: "red" });
			}
		} finally {
			form.saving.value = false;
			customActionBusy.value = false;
		}
		return;
	}

	if (props.doctype === "Events" && scriptToken === "update_events_to_website") {
		form.validationError.value = null;
		const errors = form.validateForWooPublish();
		if (errors.length) {
			form.validationError.value = errors.map((e) => e.message).join(", ");
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: "Validation",
					message: form.validationError.value,
					indicator: "red",
				});
			}
			return;
		}
		try {
			await commitFocusedFrappeWidget();
			const raw = JSON.parse(JSON.stringify(form.formData));
			const doc = normalizeDocForWooEventsPublish({
				doctype: props.doctype,
				...raw,
			});
			if (WOO_EVENTS_PUBLISH_PREVIEW_ONLY) {
				const r = await frappeCall(
					"nce_events.api.events_publish.preview_publish_events_to_website",
					{ doc },
				);
				const body = JSON.stringify(r, null, 2);
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({
						title: "WooCommerce publish preview (dry run)",
						message: `<pre style="white-space:pre-wrap;max-height:65vh;overflow:auto;text-align:left;font-size:var(--font-size-sm);">${escapeForPreHtml(body)}</pre>`,
						wide: true,
					});
				}
			} else {
				const r = await frappeCall("nce_events.api.events_publish.update_events_to_website", { doc });
				if (typeof props.reloadPanelAfterPublish === "function") {
					await props.reloadPanelAfterPublish();
				}
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({
						title: "Published",
						message: `Event ${r?.name || ""} created on the site.`,
						indicator: "green",
					});
				}
			}
		} catch (e) {
			const msg = e?.message || String(e) || "Publish failed";
			form.validationError.value = msg;
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({ title: "Publish", message: msg, indicator: "red" });
			}
		}
		return;
	}
	if (typeof frappe !== "undefined" && frappe.show_alert) {
		frappe.show_alert({ message: `Button "${btn.label}" — scripts coming soon`, indicator: "blue" });
	}
}
</script>

<style scoped>
.ppv2-form-dialog-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.3s ease;
}
.ppv2-form-dialog {
	background: var(--nce-color-surface);
	border-radius: var(--border-radius);
	box-shadow: var(--nce-shadow);
	display: flex;
	flex-direction: column;
	max-height: 90vh;
	overflow: hidden;
	position: relative;
	will-change: transform;
}
.ppv2-fd-drag-handle {
	flex-shrink: 0;
	cursor: move;
	user-select: none;
}
.ppv2-form-dialog :deep(.ppv2-fd-body) {
	min-height: 0;
}
.ppv2-fd-resize-handle {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 16px;
	height: 16px;
	cursor: nwse-resize;
	background: linear-gradient(135deg, transparent 50%, var(--nce-color-border) 50%);
	border-radius: 0 0 var(--border-radius) 0;
	z-index: 5;
}
.ppv2-fd-readback-overlay {
	position: absolute;
	inset: 0;
	z-index: 20;
	background: color-mix(in srgb, var(--nce-color-surface) 88%, transparent);
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: all;
}
.ppv2-fd-readback-spinner {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-bold);
	padding: 16px 24px;
	border-radius: var(--border-radius-sm, 6px);
	background: var(--nce-color-surface);
	box-shadow: var(--nce-shadow);
}
.ppv2-fd-size-sm {
	width: 400px;
}
.ppv2-fd-size-md {
	width: 540px;
}
.ppv2-fd-size-lg {
	width: 680px;
}
.ppv2-fd-size-xl {
	width: 820px;
}
.ppv2-fd-size-2xl {
	width: 960px;
}
.ppv2-fd-size-3xl {
	width: 1100px;
}
/* Load debug overlay — theme-exempt: dev-only (localStorage nce_fd_load_debug) */
.ppv2-fd-load-debug {
	position: fixed;
	right: 12px;
	bottom: 12px;
	z-index: 1060;
	max-width: min(420px, 92vw);
	max-height: 45vh;
	font-size: var(--font-size-sm); /* theme-exempt: dev overlay monospace */
	font-family: ui-monospace, monospace;
	pointer-events: auto;
}
.ppv2-fd-load-debug-inner {
	background: #1a1d24; /* theme-exempt */
	color: #e8eaed; /* theme-exempt */
	border: 1px solid #3d4450; /* theme-exempt */
	border-radius: 6px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.ppv2-fd-load-debug-hd {
	padding: 8px 10px;
	background: #252830; /* theme-exempt */
	font-weight: 600;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 8px;
}
.ppv2-fd-load-debug-hint {
	font-weight: 400;
	opacity: 0.75;
	font-size: calc(var(--font-size-sm) * 0.9); /* theme-exempt */
}
.ppv2-fd-load-debug-body {
	overflow-y: auto;
	padding: 6px 8px 8px;
	max-height: 38vh;
}
.ppv2-fd-load-debug-row {
	display: grid;
	grid-template-columns: 5.5em 1fr;
	gap: 2px 8px;
	padding: 4px 0;
	border-bottom: 1px solid #2e323c; /* theme-exempt */
	word-break: break-word;
}
.ppv2-fd-load-debug-row:last-child {
	border-bottom: none;
}
.ppv2-fd-load-debug-t {
	grid-column: 1;
	opacity: 0.65;
}
.ppv2-fd-load-debug-s {
	grid-column: 2;
	font-weight: 600;
}
.ppv2-fd-load-debug-d {
	grid-column: 2;
	opacity: 0.9;
	font-size: calc(var(--font-size-sm) * 0.9); /* theme-exempt */
}
.ppv2-fd-load-debug-e {
	grid-column: 1 / -1;
	color: #ff8b8b; /* theme-exempt */
	font-size: calc(var(--font-size-sm) * 0.9); /* theme-exempt */
	margin-top: 2px;
}
.ppv2-fd-load-debug-ok .ppv2-fd-load-debug-s {
	color: #7dcea0; /* theme-exempt */
}
.ppv2-fd-load-debug-bad .ppv2-fd-load-debug-s {
	color: #f5b7b1; /* theme-exempt */
}
</style>
