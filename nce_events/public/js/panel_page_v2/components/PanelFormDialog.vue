<template>
	<div v-if="open" class="ppv2-form-dialog-backdrop" @click.self="onCancel">
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
		<div class="ppv2-form-dialog" :class="'ppv2-fd-size-' + form.dialogSize.value">
			<PanelFormDialogHeader
				:row-nav-enabled="rowNavEnabled"
				:can-navigate-prev="canNavigatePrev"
				:can-navigate-next="canNavigateNext"
				:row-nav-label="rowNavLabel"
				:title="form.dialogTitle.value"
				@close="onCancel"
				@nav-prev="onNavPrevClick"
				@nav-next="onNavNextClick"
			/>
			<PanelFormDialogBody
				:loading="form.loading.value"
				:error="form.error.value"
				:tabs="form.tabs.value"
				:validation-error="form.validationError.value"
				:form-data="form.formData"
				:is-field-visible="form.isFieldVisible"
				:is-field-mandatory="form.isFieldMandatory"
				:is-field-read-only="form.isFieldReadOnly"
				v-model:active-tab="activeTab"
				@field-change="onFieldChange"
				@link-change="onLinkChange"
			/>
			<PanelFormDialogFooter
				:buttons="form.buttons.value"
				:saving="form.saving.value"
				@cancel="onCancel"
				@submit="onSubmit"
				@custom-button="onPlaceholderButton"
			/>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted, toRef, computed, provide } from "vue";
import {
	isFdLoadDebugEnabled,
	FD_LOAD_DEBUG_STORAGE_KEY,
} from "../utils/formDialogLoadDebug.js";
import PanelFormDialogHeader from "./PanelFormDialogHeader.vue";
import PanelFormDialogBody from "./PanelFormDialogBody.vue";
import PanelFormDialogFooter from "./PanelFormDialogFooter.vue";
import { usePanelFormDialog } from "../composables/usePanelFormDialog.js";
import {
	confirmDiscardIfDirty,
	createRowNavKeydownHandler,
} from "../composables/useFormDialogChrome.js";

const props = defineProps({
	open: { type: Boolean, default: false },
	definitionName: { type: String, required: true },
	doctype: { type: String, required: true },
	docName: { type: String, default: null },
	rowNavEnabled: { type: Boolean, default: false },
	canNavigatePrev: { type: Boolean, default: false },
	canNavigateNext: { type: Boolean, default: false },
	rowNavLabel: { type: String, default: "" },
});

const emit = defineEmits(["close", "saved", "nav-prev", "nav-next"]);

const activeTab = ref(0);

const form = usePanelFormDialog({
	definitionName: toRef(props, "definitionName"),
	doctype: toRef(props, "doctype"),
	docName: toRef(props, "docName"),
});

// Provide the raw ref so Date/Link controls can read .value synchronously
// in their Frappe df.change() callback — bypasses Vue prop propagation delay.
provide("fdSyncingFromLoad", form.syncingFromLoad);

const showFdLoadDebug = ref(false);
watch(
	() => props.open,
	(o) => {
		if (o) showFdLoadDebug.value = isFdLoadDebugEnabled();
	},
	{ immediate: true },
);

const loadDebugRows = computed(() => form.loadDebugLog.value);

function onCancel() {
	confirmDiscardIfDirty(() => form.isDirty.value, () => {
		form.revert();
		emit("close");
	});
}

function onNavPrevClick() {
	if (!props.canNavigatePrev) return;
	confirmDiscardIfDirty(() => form.isDirty.value, () => emit("nav-prev"));
}

function onNavNextClick() {
	if (!props.canNavigateNext) return;
	confirmDiscardIfDirty(() => form.isDirty.value, () => emit("nav-next"));
}

const onFormDialogKeydown = createRowNavKeydownHandler({
	getOpen: () => props.open,
	getCanPrev: () => props.canNavigatePrev,
	getCanNext: () => props.canNavigateNext,
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
		const result = await form.save();
		emit("saved", result);
		emit("close");
	} catch {
		// validationError is set by the composable — stay open
	}
}

function onPlaceholderButton(btn) {
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
	z-index: 1050;
}
.ppv2-form-dialog {
	background: var(--bg-card);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
	display: flex;
	flex-direction: column;
	max-height: 90vh;
	overflow: hidden;
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
