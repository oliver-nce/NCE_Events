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
				:disabled="saving || loading || !isDirty"
				@click="$emit('revert')"
			>
				Revert
			</button>
			<button
				v-if="submitVisible"
				type="button"
				class="ppv2-fd-tab-btn ppv2-fd-tab-active"
				:disabled="saving || loading"
				@click="$emit('submit')"
			>
				{{ savingSubmitText }}
			</button>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
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
	/** Same options as Form Dialog Button \"Hide If\" — controls default Submit. */
	submitHideIf: { type: String, default: "Never" },
	submitHideIfSql: { type: String, default: "" },
	/** Custom label for the primary footer's Submit button (Form Dialog / Panel Action). */
	submitLabel: { type: String, default: "" },
	saving: { type: Boolean, default: false },
	/** True while form.load() is in flight — avoid submit/revert with stale modified. */
	loading: { type: Boolean, default: false },
	isDirty: { type: Boolean, default: false },
});

defineEmits(["cancel", "revert", "submit", "custom-button"]);

const savingSubmitText = computed(() => {
	if (!props.saving) {
		const sl = String(props.submitLabel || "").trim();
		return sl || "Submit";
	}
	const sl = String(props.submitLabel || "").trim();
	if (sl) return `${sl}…`;
	return "Saving…";
});

const visibleButtons = ref([]);
const submitVisible = ref(true);

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

function submitHideLocal(docName) {
	return localHidden({ hide_if: String(props.submitHideIf || HIDE_NEVER) }, docName);
}

function submitNeedsSqlServer() {
	const m = String(props.submitHideIf || "");
	if (m === HIDE_SQL) return true;
	return m.toLowerCase() === "sql_expression";
}

async function refreshFooterVisibility() {
	const raw = props.buttons || [];
	const dn = props.docName;
	const needButtonsSql = raw.some((b) => needsSqlServer(b));
	const needSubmitSql = submitNeedsSqlServer();
	const needApi =
		Boolean(props.definitionName) &&
		Boolean(props.definitionName.trim()) &&
		(needButtonsSql || needSubmitSql);

	let hiddenMap = null;
	let submitHiddenFlag = /** @type {boolean|null} */ (null);
	if (needApi) {
		try {
			const payload = await frappeCall(
				"nce_events.api.form_dialog.button_visibility.get_form_dialog_footer_visibility",
				{
					form_dialog: props.definitionName,
					docname: dn || "",
				},
			);
			hiddenMap = payload && typeof payload.buttons === "object" ? payload.buttons : null;
			if (payload && typeof payload.submit_hidden !== "undefined" && payload.submit_hidden !== null) {
				submitHiddenFlag = Boolean(payload.submit_hidden);
			}
		} catch (e) {
			console.error("[PanelFormDialogFooter] visibility", e);
		}
	}

	visibleButtons.value = raw.filter((b) => {
		const lh = localHidden(b, dn);
		if (lh !== null) return !lh;
		if (hiddenMap != null && b.name != null && Object.prototype.hasOwnProperty.call(hiddenMap, b.name)) {
			return !hiddenMap[b.name];
		}
		return true;
	});

	let hideSubmit;
	if (submitHiddenFlag !== null) {
		hideSubmit = submitHiddenFlag;
	} else {
		const sv = submitHideLocal(dn);
		hideSubmit = sv === null ? false : !!sv;
	}
	submitVisible.value = !hideSubmit;
}

watch(
	() => [
		props.buttons,
		props.definitionName,
		props.docName,
		props.submitHideIf,
		props.submitHideIfSql,
		props.submitLabel,
	],
	() => {
		refreshFooterVisibility();
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
