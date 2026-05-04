<template>
	<div class="ppv2-fd-footer">
		<div class="ppv2-fd-custom-buttons">
			<button
				v-for="(btn, bi) in visibleButtons"
				:key="'fd-btn-' + bi + '-' + (btn.label || bi) + '-' + (btn.name || '')"
				type="button"
				class="ppv2-fd-tab-btn"
				@click="$emit('custom-button', btn)"
			>
				{{ btn.label }}
			</button>
		</div>

		<div class="ppv2-fd-action-buttons">
			<button type="button" class="ppv2-fd-tab-btn" @click="$emit('cancel')">Cancel</button>
			<button
				type="button"
				class="ppv2-fd-tab-btn"
				:disabled="saving || !isDirty"
				@click="$emit('revert')"
			>
				Revert
			</button>
			<button
				type="button"
				class="ppv2-fd-tab-btn ppv2-fd-tab-active"
				:disabled="saving"
				@click="$emit('submit')"
			>
				{{ saving ? "Saving…" : "Submit" }}
			</button>
		</div>
	</div>
</template>

<script setup>
import { ref, watch } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

const HIDE_NEVER = "Never";
const HIDE_NOT_SAVED = "Record not saved";
const HIDE_SAVED = "Record saved";
const HIDE_SQL = "SQL expression";

const props = defineProps({
	buttons: { type: Array, default: () => [] },
	/** Form Dialog document name (for hide-rule API). */
	definitionName: { type: String, default: "" },
	/** Root document name; empty when new / unsaved. */
	docName: { type: String, default: null },
	saving: { type: Boolean, default: false },
	isDirty: { type: Boolean, default: false },
});

defineEmits(["cancel", "revert", "submit", "custom-button"]);

const visibleButtons = ref([]);

function localHidden(btn, docName) {
	const m = String(btn.hide_if || HIDE_NEVER);
	const dn = String(docName || "").trim();
	if (!m || m === HIDE_NEVER) return false;
	if (m === HIDE_NOT_SAVED) return !dn;
	if (m === HIDE_SAVED) return !!dn;
	if (m === HIDE_SQL) return null;
	return false;
}

function needsSqlServer(btn) {
	const m = String(btn.hide_if || "");
	if (m === HIDE_SQL) return true;
	return m.toLowerCase() === "sql_expression";
}

async function refreshVisibleButtons() {
	const raw = props.buttons || [];
	const needServer = raw.some((b) => needsSqlServer(b));
	if (!needServer) {
		const dn = props.docName;
		visibleButtons.value = raw.filter((b) => !localHidden(b, dn));
		return;
	}
	if (!props.definitionName) {
		visibleButtons.value = raw.filter((b) => {
			const lh = localHidden(b, props.docName);
			return lh === null ? true : !lh;
		});
		return;
	}
	try {
		const hiddenMap = await frappeCall(
			"nce_events.api.form_dialog.button_visibility.get_form_dialog_button_hidden_map",
			{
				form_dialog: props.definitionName,
				docname: props.docName || "",
			},
		);
		visibleButtons.value = raw.filter((b) => {
			const id = b.name;
			if (id != null && hiddenMap && Object.prototype.hasOwnProperty.call(hiddenMap, id)) {
				return !hiddenMap[id];
			}
			const lh = localHidden(b, props.docName);
			return lh === null ? true : !lh;
		});
	} catch (e) {
		console.error("[PanelFormDialogFooter] visibility", e);
		visibleButtons.value = raw.filter((b) => {
			const lh = localHidden(b, props.docName);
			return lh === null ? true : !lh;
		});
	}
}

watch(
	() => [props.buttons, props.definitionName, props.docName],
	() => {
		refreshVisibleButtons();
	},
	{ deep: true, immediate: true },
);
</script>

<style scoped>
.ppv2-fd-footer {
	flex-shrink: 0;
	padding: 10px 16px;
	border-top: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}
.ppv2-fd-custom-buttons {
	display: flex;
	gap: 4px;
}
.ppv2-fd-action-buttons {
	display: flex;
	gap: 6px;
	margin-left: auto;
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
.ppv2-fd-action-buttons .ppv2-fd-tab-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
