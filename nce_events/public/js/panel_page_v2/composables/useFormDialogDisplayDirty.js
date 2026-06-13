import { ref, watch, onUnmounted, nextTick } from "vue";
import {
	captureDisplayBaseline,
	diffDisplayBaseline,
	blurFocusedFrappeWidget,
	isBaselineField,
} from "../utils/formDialogDisplayBaseline.js";

/**
 * KISS dirty: cache displayed control values at load/save; compare on input/change.
 *
 * @param {object} opts
 * @param {import('vue').Ref} opts.fdBodyRef — PanelFormDialogBody component ref
 * @param {ReturnType<typeof import('./usePanelFormDialog.js').usePanelFormDialog>} opts.form
 */
export function useFormDialogDisplayDirty({ fdBodyRef, form }) {
	const displayBaseline = ref({});
	const displayDirty = ref(false);
	const changedDisplayFields = ref([]);

	let listenerRoot = null;
	let rafId = null;

	function writableFields() {
		return (form.allFields.value || []).filter(
			(f) =>
				isBaselineField(f) && form.isFieldVisible(f) && !form.isFieldReadOnly(f),
		);
	}

	function writableFieldnames() {
		return new Set(writableFields().map((f) => f.fieldname));
	}

	function captureCurrentDisplay() {
		const root = fdBodyRef.value?.$el;
		if (!root) {
			return {};
		}
		return captureDisplayBaseline(root, writableFields());
	}

	function recomputeDirty() {
		if (form.loading.value || form.syncingFromLoad?.value) {
			displayDirty.value = false;
			changedDisplayFields.value = [];
			return;
		}
		const current = captureCurrentDisplay();
		const { dirty, changedFields } = diffDisplayBaseline(
			displayBaseline.value,
			current,
		);
		displayDirty.value = dirty;
		changedDisplayFields.value = changedFields;
	}

	function scheduleRecompute() {
		if (rafId != null) {
			cancelAnimationFrame(rafId);
		}
		rafId = requestAnimationFrame(() => {
			rafId = null;
			recomputeDirty();
		});
	}

	function onBodyEvent() {
		if (form.syncingFromLoad?.value || form.loading.value) {
			return;
		}
		scheduleRecompute();
	}

	function attachListeners() {
		detachListeners();
		const root = fdBodyRef.value?.$el;
		if (!root) {
			return;
		}
		listenerRoot = root;
		for (const ev of ["input", "change", "focusout"]) {
			root.addEventListener(ev, onBodyEvent, true);
		}
	}

	function detachListeners() {
		if (!listenerRoot) {
			return;
		}
		for (const ev of ["input", "change", "focusout"]) {
			listenerRoot.removeEventListener(ev, onBodyEvent, true);
		}
		listenerRoot = null;
	}

	async function captureBaselineFromDom() {
		await nextTick();
		await nextTick();
		displayBaseline.value = captureCurrentDisplay();
		recomputeDirty();
	}

	async function refreshBaselineAfterLoad() {
		attachListeners();
		await captureBaselineFromDom();
	}

	async function refreshBaselineAfterRevert() {
		await nextTick();
		await nextTick();
		await captureBaselineFromDom();
	}

	/** Before save: commit focused Frappe date/link picker only. */
	async function commitFocusedFrappeWidget() {
		const root = fdBodyRef.value?.$el;
		if (!root) {
			return null;
		}
		const blurred = blurFocusedFrappeWidget(root, writableFieldnames());
		if (blurred) {
			await nextTick();
			scheduleRecompute();
		}
		return blurred;
	}

	watch(
		() => form.loading.value,
		(isLoading) => {
			if (!isLoading && !form.error.value) {
				refreshBaselineAfterLoad();
			} else if (isLoading) {
				displayDirty.value = false;
				changedDisplayFields.value = [];
				displayBaseline.value = {};
			}
		},
	);

	watch(
		() => form.syncingFromLoad?.value,
		(syncing, wasSyncing) => {
			if (wasSyncing && !syncing) {
				scheduleRecompute();
			}
		},
	);

	onUnmounted(() => {
		detachListeners();
		if (rafId != null) {
			cancelAnimationFrame(rafId);
		}
	});

	return {
		displayBaseline,
		displayDirty,
		changedDisplayFields,
		scheduleRecompute,
		refreshBaselineAfterRevert,
		commitFocusedFrappeWidget,
		recomputeDirty,
	};
}
