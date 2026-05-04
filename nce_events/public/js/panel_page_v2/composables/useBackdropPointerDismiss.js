import { onUnmounted } from "vue";

/** Primary (= left) mouse, or pen/touch taps. */
function allowPointerDownDismiss(e) {
	if (e.pointerType === "mouse") {
		return e.button === 0;
	}
	return e.pointerType === "touch" || e.pointerType === "pen";
}

/** Matching release for dismiss (mouseup / pointer up). */
function allowPointerUpDismiss(e) {
	if (e.pointerType === "mouse") {
		return e.button === 0;
	}
	return e.pointerType === "touch" || e.pointerType === "pen";
}

/**
 * Replace @click.self on a modal backdrop so text-selection drags that end on the dimmed region
 * do not close the dialog. Dismiss runs only when pointerdown **and** pointerup both hit the same
 * backdrop element (Vue `.self` semantics).
 */
export function useBackdropPointerDismiss(backdropElRef, onDismiss) {
	let armed = false;
	let listenerActive = false;

	function onWindowPointerUp(e) {
		if (listenerActive) {
			window.removeEventListener("pointerup", onWindowPointerUp, true);
			listenerActive = false;
		}

		const bd = backdropElRef?.value ?? null;
		const wasArmed = armed;
		armed = false;

		if (!bd || !wasArmed) return;
		if (!allowPointerUpDismiss(e)) return;
		if (e.target !== bd) return;
		onDismiss();
	}

	function onBackdropPointerDownSelf(e) {
		const bd = backdropElRef?.value ?? null;
		if (!bd || e.target !== bd) return;
		if (!allowPointerDownDismiss(e)) return;

		if (listenerActive) {
			window.removeEventListener("pointerup", onWindowPointerUp, true);
			listenerActive = false;
		}
		armed = true;
		window.addEventListener("pointerup", onWindowPointerUp, { capture: true });
		listenerActive = true;
	}

	function disarm() {
		armed = false;
		if (listenerActive) {
			window.removeEventListener("pointerup", onWindowPointerUp, true);
			listenerActive = false;
		}
	}

	onUnmounted(disarm);

	return { onBackdropPointerDownSelf, disarm };
}
