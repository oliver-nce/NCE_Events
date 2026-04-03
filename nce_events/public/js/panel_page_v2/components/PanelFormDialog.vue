<template>
	<div v-if="open" class="ppv2-form-dialog-backdrop" @click.self="onCancel">
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
				:syncing-from-load="form.syncingFromLoad.value"
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
import { ref, watch, onUnmounted, toRef, nextTick } from "vue";
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

/** Serialize prev/next: each waits for prior reload (load + syncingFromLoad) to finish. */
let rowNavChain = Promise.resolve();

function enqueueRowNav(direction) {
	rowNavChain = rowNavChain
		.then(async () => {
			await form.waitUntilLoadSettled();
			if (direction === "prev" && !props.canNavigatePrev) return;
			if (direction === "next" && !props.canNavigateNext) return;
			confirmDiscardIfDirty(() => form.isDirty.value, () =>
				emit(direction === "prev" ? "nav-prev" : "nav-next"),
			);
			await nextTick();
			await form.waitUntilLoadSettled();
		})
		.catch(() => {});
}

function onCancel() {
	confirmDiscardIfDirty(() => form.isDirty.value, () => {
		form.revert();
		emit("close");
	});
}

function onNavPrevClick() {
	enqueueRowNav("prev");
}

function onNavNextClick() {
	enqueueRowNav("next");
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
			rowNavChain = Promise.resolve();
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
	rowNavChain = Promise.resolve();
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
</style>
