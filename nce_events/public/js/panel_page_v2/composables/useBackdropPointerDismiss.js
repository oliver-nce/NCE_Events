import { onUnmounted } from "vue";

/**
 * Dismiss a modal backdrop only on a true click — i.e. both mousedown AND the
 * synthesised click originated on the backdrop itself.
 *
 * Why this works for text-selection overshoot:
 *   - mousedown starts on a field inside the dialog → @mousedown.self does NOT fire
 *     → armed stays false
 *   - User drags, releases on backdrop → browser synthesises a click whose target
 *     is the nearest common ancestor (the backdrop), but @click.self handler checks
 *     armed === false → no dismiss.
 *
 * True backdrop click: mousedown.self arms → click.self sees armed=true → dismiss.
 */
export function useBackdropPointerDismiss(backdropElRef, onDismiss) {
	let armed = false;

	function onMouseDownSelf(e) {
		if (e.button !== 0) return;
		armed = true;
	}

	function onClickSelf() {
		const was = armed;
		armed = false;
		if (was) onDismiss();
	}

	function disarm() {
		armed = false;
	}

	onUnmounted(disarm);

	return { onMouseDownSelf, onClickSelf, disarm };
}
