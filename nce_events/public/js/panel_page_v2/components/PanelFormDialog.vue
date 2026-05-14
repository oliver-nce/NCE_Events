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
		<div class="ppv2-form-dialog ppv2-fd-dialog-root" :class="'ppv2-fd-size-' + form.dialogSize.value">
			<div
				v-if="readbackFooterPhase === 'readback-waiting'"
				class="ppv2-fd-readback-overlay"
				@click.stop
			>
				<div class="ppv2-fd-readback-spinner">{{ readbackUpdatingText }}</div>
			</div>
			<PanelFormDialogHeader
				:row-nav-enabled="rowNavEnabledEffective"
				:can-navigate-prev="canNavigatePrev"
				:can-navigate-next="canNavigateNext"
				:row-nav-label="rowNavLabel"
				:title="form.dialogTitle.value"
				:closable="headerClosable"
				@close="onCancel"
				@nav-prev="onNavPrevClick"
				@nav-next="onNavNextClick"
			/>
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
			v-model:active-tab="activeTab"
			@field-change="onFieldChange"
			@link-change="onLinkChange"
			@related-dirty="onRelatedDirty"
		/>
			<PanelFormDialogFooter
				:footer-phase="readbackFooterPhase"
				:buttons="form.buttons.value"
				:definition-name="definitionName"
				:doc-name="docName"
				:submit-hide-if="footerSubmitHideIf"
				:submit-hide-if-sql="footerSubmitHideSql"
				:submit-label="footerSubmitLabel"
				:saving="form.saving.value"
				:is-dirty="footerIsDirty"
				@cancel="onCancel"
				@revert="onRevert"
				@submit="onSubmit"
				@custom-button="onPlaceholderButton"
				@readback-show-changes="onReadbackShowChanges"
				@readback-close="onReadbackFinalClose"
			/>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted, toRef, computed, provide, nextTick } from "vue";
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
import { normalizeDocForWooEventsPublish } from "../utils/wooPublishDocNormalize.js";
import { readLiveFieldValue } from "../utils/formDialogLiveScrape.js";
import {
	confirmDiscardIfDirty,
	createRowNavKeydownHandler,
} from "../composables/useFormDialogChrome.js";
import { useBackdropPointerDismiss } from "../composables/useBackdropPointerDismiss.js";
import {
	fetchReadbackConfig,
	waitForWpReadbackFreshDoc,
} from "../composables/wpReadbackFlow.js";


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
	/** Refetch open panel for this doctype after WC publish (Form Dialog Button script). */
	reloadPanelAfterPublish: { type: Function, default: null },
	/** Where the captured definition lives: 'form_dialog' (default) or 'panel_action'. */
	definitionSource: { type: String, default: "form_dialog" },
});

const emit = defineEmits(["close", "saved", "nav-prev", "nav-next", "readback-merged"]);

const activeTab = ref(0);
const fdBodyRef = ref(null);
const backdropRef = ref(null);
const relatedDirty = ref(false);
/** Bumped from this dialog when user clicks Show changes (related grids refetch). */
const internalReloadTick = ref(0);
/** Footer + chrome: normal | readback-waiting | readback-show-changes | readback-close-only */
const readbackFooterPhase = ref("normal");

const readbackUpdatingText =
	typeof window.__ === "function" ? window.__("Updating") + "…" : "Updating…";

const headerClosable = computed(
	() =>
		readbackFooterPhase.value !== "readback-waiting" &&
		readbackFooterPhase.value !== "readback-show-changes",
);

const rowNavEnabledEffective = computed(
	() => props.rowNavEnabled && readbackFooterPhase.value === "normal",
);

const form = usePanelFormDialog({
	definitionName: toRef(props, "definitionName"),
	doctype: toRef(props, "doctype"),
	docName: toRef(props, "docName"),
	requiredFields: toRef(props, "requiredFields"),
	definitionSource: toRef(props, "definitionSource"),
});

/** Frappe Date/Datetime controls only emit into formData on change; blur commits open pickers. */
async function flushFrappeDateControlsIntoFormData() {
	const root = fdBodyRef.value?.$el;
	if (root?.querySelectorAll) {
		root.querySelectorAll(".ppv2-fd-datetime-frappe input").forEach((el) => {
			if (typeof el.blur === "function") {
				el.blur();
			}
		});
	}
	await nextTick();
	if (document.activeElement && typeof document.activeElement.blur === "function") {
		document.activeElement.blur();
	}
	await nextTick();
}

// Provide the raw ref so Date/Link controls can read .value synchronously
// in their Frappe df.change() callback — bypasses Vue prop propagation delay.
provide("fdSyncingFromLoad", form.syncingFromLoad);

const showFdLoadDebug = ref(false);
watch(
	() => props.open,
	(o) => {
		if (o) {
			showFdLoadDebug.value = isFdLoadDebugEnabled();
			readbackFooterPhase.value = "normal";
			internalReloadTick.value = 0;
		}
	},
	{ immediate: true },
);

const loadDebugRows = computed(() => form.loadDebugLog.value);

const footerIsDirty = computed(() => form.isDirty.value || relatedDirty.value);

function onReadbackFinalClose() {
	readbackFooterPhase.value = "normal";
	emit("close");
}

function onCancel() {
	if (
		readbackFooterPhase.value === "readback-waiting" ||
		readbackFooterPhase.value === "readback-show-changes"
	) {
		return;
	}
	if (readbackFooterPhase.value === "readback-close-only") {
		onReadbackFinalClose();
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

async function onReadbackShowChanges() {
	internalReloadTick.value += 1;
	await nextTick();
	try {
		await form.load();
		await nextTick();
		relatedDirty.value = false;
		readbackFooterPhase.value = "readback-close-only";
	} catch {
		/* keep current form */
	}
}

function onRevert() {
	if (readbackFooterPhase.value !== "normal") return;
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
	};
	if (typeof frappe !== "undefined" && frappe.confirm) {
		frappe.confirm(msg, proceed, () => {});
	} else if (window.confirm(msg)) {
		proceed();
	}
}

function onNavPrevClick() {
	if (readbackFooterPhase.value !== "normal") return;
	if (!props.canNavigatePrev) return;
	confirmDiscardIfDirty(() => footerIsDirty.value, () => emit("nav-prev"));
}

function onNavNextClick() {
	if (readbackFooterPhase.value !== "normal") return;
	if (!props.canNavigateNext) return;
	confirmDiscardIfDirty(() => footerIsDirty.value, () => emit("nav-next"));
}

const onFormDialogKeydown = createRowNavKeydownHandler({
	getOpen: () => props.open,
	getCanPrev: () => props.canNavigatePrev && readbackFooterPhase.value === "normal",
	getCanNext: () => props.canNavigateNext && readbackFooterPhase.value === "normal",
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
}

async function onLinkChange({ fieldname, value }) {
	form.formData[fieldname] = value;
	await form.handleFetchFrom(fieldname, value);
}

async function onSubmit() {
	try {
		const onSubmitMethod = (form.definition.value?.on_submit_method || "").trim();
		if (onSubmitMethod) {
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
				return;
			}
			await flushFrappeDateControlsIntoFormData();
			const raw = JSON.parse(JSON.stringify(form.formData));
			let doc = { doctype: props.doctype, ...raw };
			if (props.doctype === "Events") {
				const root = fdBodyRef.value?.$el;
				const liveFirst = readLiveFieldValue(root, "first_session_date");
				if (liveFirst != null) raw.first_session_date = liveFirst;
				const liveSessions = readLiveFieldValue(root, "number_of_sessions");
				if (liveSessions != null) raw.number_of_sessions = liveSessions;
				doc = normalizeDocForWooEventsPublish({ doctype: props.doctype, ...raw });
			}
			form.saving.value = true;
			try {
				const r = await frappeCall(
					onSubmitMethod,
					{ doc },
					{ freeze: true, freeze_message: __("Submitting…") },
				);
				if (!r?.ok) {
					const msg = r?.message || __("Submit failed");
					form.validationError.value = msg;
					if (typeof frappe !== "undefined" && frappe.msgprint) {
						frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
					}
					return;
				}
				/* Server handled persistence (e.g. Woo + clear Single). Sync UI from DB — no Document.save in Vue. */
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
					await props.reloadPanelAfterPublish();
				}
				/* Do not emit saved — no Frappe form save; host must not run onFormDialogSaved panel refresh. */
				emit("close");
			} catch (e) {
				const msg = e?.message || String(e) || __("Submit failed");
				form.validationError.value = msg;
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
				}
			} finally {
				form.saving.value = false;
			}
			return;
		}

		// If the Form Dialog definition has a presubmit script and the record already
		// has a numeric name (linked to an external system), call it BEFORE saving to
		// Frappe so change-detection compares against the old stored DB values.
		const submitHookMethod = (form.definition.value?.custom_presubmit_script || "").trim();
		let hookResult = null;
		if (submitHookMethod && String(form.formData.name || "").match(/^\d+$/)) {
			await flushFrappeDateControlsIntoFormData();
			const raw = JSON.parse(JSON.stringify(form.formData));
			if (props.doctype === "Events") {
				const root = fdBodyRef.value?.$el;
				const liveFirst = readLiveFieldValue(root, "first_session_date");
				if (liveFirst != null) raw.first_session_date = liveFirst;
				const liveSessions = readLiveFieldValue(root, "number_of_sessions");
				if (liveSessions != null) raw.number_of_sessions = liveSessions;
			}
			const doc = props.doctype === "Events"
				? normalizeDocForWooEventsPublish({ doctype: props.doctype, ...raw })
				: { doctype: props.doctype, ...raw };
			try {
				hookResult = await frappeCall(submitHookMethod, { doc });
			} catch (hookErr) {
				const msg = hookErr?.message || String(hookErr) || "Update failed";
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({ title: "WooCommerce", message: msg, indicator: "red" });
				}
				// Hook failure does not block the Frappe save
			}
		}

		const result = await form.save();
		try {
			await fdBodyRef.value?.saveAllRelatedRows?.();
		} catch (relErr) {
			const m = extractServerMessage(relErr);
			if (typeof frappe !== "undefined" && frappe.msgprint) {
				frappe.msgprint({
					title: "Related rows",
					message: m,
					indicator: "red",
				});
			}
			throw relErr;
		}

		if (hookResult && !hookResult.skipped) {
			if (typeof frappe !== "undefined" && frappe.show_alert) {
				frappe.show_alert({ message: "WooCommerce product updated", indicator: "green" }, 5);
			}
		}

		const cfg = await fetchReadbackConfig(props.doctype);
		if (cfg.enabled === 1) {
			const oldRowName = props.docName;
			const savedName =
				result?.name != null && String(result.name).trim() !== ""
					? String(result.name).trim()
					: null;
			readbackFooterPhase.value = "readback-waiting";
			try {
				const fresh = await waitForWpReadbackFreshDoc(props.doctype, result, oldRowName, cfg);
				emit("readback-merged", {
					fresh,
					oldRowName,
					savedName,
				});
				await nextTick();
				readbackFooterPhase.value = "readback-show-changes";
			} catch (e) {
				readbackFooterPhase.value = "normal";
				const msg = e?.message || String(e) || __("Read-back wait failed");
				if (typeof frappe !== "undefined" && frappe.msgprint) {
					frappe.msgprint({ title: __("Error"), message: msg, indicator: "red" });
				}
			}
		} else {
			emit("saved");
		}
	} catch {
		// validationError (root) or related save error — stay open
	}
}

async function onPlaceholderButton(btn) {
	const script = String(btn?.button_script || "").trim();

	if (props.doctype === "Events" && script === "update_events_to_website") {
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
			await flushFrappeDateControlsIntoFormData();
			const raw = JSON.parse(JSON.stringify(form.formData));
			const root = fdBodyRef.value?.$el;
			const liveFirst = readLiveFieldValue(root, "first_session_date");
			if (liveFirst != null) {
				raw.first_session_date = liveFirst;
			}
			const liveSessions = readLiveFieldValue(root, "number_of_sessions");
			if (liveSessions != null) {
				raw.number_of_sessions = liveSessions;
			}
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
						message: `<pre style="white-space:pre-wrap;max-height:65vh;overflow:auto;text-align:left;font-size:12px;">${escapeForPreHtml(body)}</pre>`,
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
	background: var(--bg-card);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
	display: flex;
	flex-direction: column;
	max-height: 90vh;
	overflow: hidden;
	position: relative;
}
.ppv2-fd-readback-overlay {
	position: absolute;
	inset: 0;
	z-index: 20;
	background: color-mix(in srgb, var(--bg-card) 88%, transparent);
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: all;
}
.ppv2-fd-readback-spinner {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-color);
	padding: 16px 24px;
	border-radius: var(--border-radius-sm, 6px);
	background: var(--bg-card);
	border: 1px solid var(--border-color);
	box-shadow: var(--shadow);
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
/* Load debug overlay — enable with localStorage nce_fd_load_debug = "1" */
.ppv2-fd-load-debug {
	position: fixed;
	right: 12px;
	bottom: 12px;
	z-index: 1060;
	max-width: min(420px, 92vw);
	max-height: 45vh;
	font-size: 11px;
	font-family: ui-monospace, monospace;
	pointer-events: auto;
}
.ppv2-fd-load-debug-inner {
	background: #1a1d24;
	color: #e8eaed;
	border: 1px solid #3d4450;
	border-radius: 6px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.ppv2-fd-load-debug-hd {
	padding: 8px 10px;
	background: #252830;
	font-weight: 600;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 8px;
}
.ppv2-fd-load-debug-hint {
	font-weight: 400;
	opacity: 0.75;
	font-size: 10px;
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
	border-bottom: 1px solid #2e323c;
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
	font-size: 10px;
}
.ppv2-fd-load-debug-e {
	grid-column: 1 / -1;
	color: #ff8b8b;
	font-size: 10px;
	margin-top: 2px;
}
.ppv2-fd-load-debug-ok .ppv2-fd-load-debug-s {
	color: #7dcea0;
}
.ppv2-fd-load-debug-bad .ppv2-fd-load-debug-s {
	color: #f5b7b1;
}
</style>
