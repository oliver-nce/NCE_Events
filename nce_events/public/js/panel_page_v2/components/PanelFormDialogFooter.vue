<template>
	<div class="ppv2-fd-footer">
		<!-- WP read-back: wait — no buttons (spinner is on dialog overlay) -->
		<template v-if="footerPhase === 'readback-waiting'" />

		<!-- WP read-back: user reloads form + related grids -->
		<template v-else-if="footerPhase === 'readback-show-changes'">
			<div class="ppv2-fd-readback-actions">
				<button
					type="button"
					class="ppv2-fd-tab-btn ppv2-fd-tab-active bg-primary border-primary"
					@click="$emit('readback-show-changes')"
				>
					{{ __("Show changes") }}
				</button>
			</div>
		</template>

		<!-- WP read-back: done — single Close -->
		<template v-else-if="footerPhase === 'readback-close-only'">
			<div class="ppv2-fd-readback-actions">
				<button type="button" class="ppv2-fd-tab-btn ppv2-fd-tab-active bg-primary border-primary" @click="$emit('readback-close')">
					{{ __("Close") }}
				</button>
			</div>
		</template>

		<!-- FileMaker-style find: criteria entry -->
		<template v-else-if="footerPhase === 'normal' && findChromePhase === 'criteria'">
			<div class="ppv2-fd-find-footer-only">
				<button
					type="button"
					class="ppv2-fd-tab-btn ppv2-fd-tab-active bg-primary border-primary"
					@click="$emit('find-perform')"
				>
					{{ __("Perform Find") }}
				</button>
				<!-- Only shown when there is an active found set to narrow -->
				<button
					v-if="findMatchActive"
					type="button"
					class="ppv2-fd-tab-btn"
					@click="$emit('find-perform-constrain')"
				>
					{{ __("Constrain Found Set") }}
				</button>
				<button type="button" class="ppv2-fd-tab-btn" @click="$emit('find-cancel')">
					{{ __("Cancel Find") }}
				</button>
			</div>
		</template>

		<template v-else>
			<div v-if="findChromePhase === 'post-find'" class="ppv2-fd-find-followup">
				<button type="button" class="ppv2-fd-tab-btn" @click="$emit('find-modify')">
					{{ __("Modify Find") }}
				</button>
				<button type="button" class="ppv2-fd-tab-btn" @click="$emit('find-constrain')">
					{{ __("Constrain Found Set") }}
				</button>
				<button type="button" class="ppv2-fd-tab-btn" @click="$emit('find-show-all')">
					{{ __("Show All") }}
				</button>
			</div>

			<div class="ppv2-fd-custom-buttons">
				<button
					v-for="(btn, bi) in visibleButtons"
					:key="'fd-btn-' + bi + '-' + (btn.label || bi) + '-' + (btn.name || '')"
					type="button"
					class="ppv2-fd-tab-btn"
					:disabled="browseActionsLocked"
					@click="$emit('custom-button', btn)"
				>
					{{ btn.label }}
				</button>
			</div>

			<div class="ppv2-fd-action-buttons">
				<button
					type="button"
					class="ppv2-fd-tab-btn"
					:disabled="browseActionsLocked"
					@click="$emit('cancel')"
				>
					Cancel
				</button>
				<button
					type="button"
					class="ppv2-fd-tab-btn"
					:disabled="saving || browseActionsLocked || !isDirty"
					@click="$emit('revert')"
				>
					Revert
				</button>
				<button
					v-if="submitVisible"
					type="button"
					class="ppv2-fd-tab-btn ppv2-fd-tab-active bg-primary border-primary"
					:disabled="saving || browseActionsLocked"
					@click="$emit('submit', { shift: $event.shiftKey })"
				>
					{{ savingSubmitText }}
				</button>
			</div>
		</template>
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
	/** normal | readback-waiting | readback-show-changes | readback-close-only */
	footerPhase: {
		type: String,
		default: "normal",
	},
	buttons: { type: Array, default: () => [] },
	definitionName: { type: String, default: "" },
	docName: { type: String, default: null },
	submitHideIf: { type: String, default: "Never" },
	submitHideIfSql: { type: String, default: "" },
	submitLabel: { type: String, default: "" },
	saving: { type: Boolean, default: false },
	isDirty: { type: Boolean, default: false },
	/** Disable footer actions while in FileMaker-style find layout (use header Cancel Find). */
	browseActionsLocked: { type: Boolean, default: false },
	/** `none` | `criteria` | `post-find` — drives find footer bands */
	findChromePhase: { type: String, default: "none" },
	/** True when a found set is active — enables Constrain Found Set in criteria phase. */
	findMatchActive: { type: Boolean, default: false },
});

defineEmits([
	"cancel",
	"revert",
	"submit",
	"custom-button",
	"readback-show-changes",
	"readback-close",
	"find-perform",
	"find-perform-constrain",
	"find-cancel",
	"find-constrain",
	"find-modify",
	"find-show-all",
]);

function __(s) {
	return typeof window.__ === "function" ? window.__(s) : s;
}

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
		props.footerPhase,
		props.findChromePhase,
	],
	() => {
		if (props.footerPhase !== "normal") return;
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
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-height: 48px;
	box-sizing: border-box;
}
.ppv2-fd-find-footer-only {
	display: flex;
	width: 100%;
	justify-content: flex-end;
	gap: 8px;
}
.ppv2-fd-find-followup {
	display: flex;
	width: 100%;
	flex-wrap: wrap;
	gap: 6px;
	padding-bottom: 4px;
	border-bottom: 1px dashed var(--border-color);
	margin-bottom: 2px;
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
.ppv2-fd-readback-actions {
	display: flex;
	width: 100%;
	justify-content: flex-end;
}
.ppv2-fd-tab-btn {
	padding: 6px 14px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	font-size: var(--font-size-base, 14px);
	font-weight: var(--font-weight-bold, 600);
	cursor: pointer;
}
.ppv2-fd-action-buttons .ppv2-fd-tab-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
