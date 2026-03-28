<template>
	<div
		ref="floatEl"
		class="ppv2-float"
		:style="floatStyle"
	>
		<div class="ppv2-float-header" @mousedown.prevent="startDrag">
			<slot name="header" />
		</div>

		<div class="ppv2-float-body">
			<slot />
		</div>

		<div class="ppv2-float-footer" @mousedown.prevent="startDrag">
			<slot name="footer" />
		</div>

		<div class="ppv2-resize-handle" @mousedown.prevent="startResize" />
	</div>
</template>

<script>
let _globalZ = 100;
function getNextZ() { return ++_globalZ; }
</script>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
	initX: { type: Number, default: 40 },
	initY: { type: Number, default: 60 },
	initW: { type: Number, default: 900 },
	initH: { type: Number, default: 550 },
});

const emit = defineEmits(["close"]);

const x = ref(props.initX);
const y = ref(props.initY);
const w = ref(props.initW);
const h = ref(props.initH);
const z = ref(getNextZ());
const floatEl = ref(null);

/*
 * Position via transform: translate3d() — this is composited on the GPU
 * and does NOT trigger layout or repaint of siblings during drag.
 * Width/height still need layout but only change during resize, not drag.
 */
const floatStyle = computed(() => ({
	transform: `translate3d(${x.value}px, ${y.value}px, 0)`,
	width: w.value + "px",
	height: h.value + "px",
	zIndex: z.value,
}));

function bringToFront() {
	z.value = getNextZ();
}

function startDrag(e) {
	const sx = e.clientX, sy = e.clientY;
	const ox = x.value, oy = y.value;
	const el = floatEl.value;

	function onMove(ev) {
		// Write directly to the DOM — bypasses Vue reactivity entirely
		// so the table never re-renders during drag
		const nx = ox + ev.clientX - sx;
		const ny = Math.max(0, oy + ev.clientY - sy);
		el.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
	}
	function onUp(ev) {
		const dx = Math.abs(ev.clientX - sx);
		const dy = Math.abs(ev.clientY - sy);
		// Click (<10px movement) — bring to front
		if (dx < 10 && dy < 10) {
			bringToFront();
		}
		// Now write back to Vue refs once so it knows the final position
		x.value = ox + ev.clientX - sx;
		y.value = Math.max(0, oy + ev.clientY - sy);
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}

function startResize(e) {
	bringToFront();
	const sx = e.clientX, sy = e.clientY;
	const ow = w.value, oh = h.value;
	const el = floatEl.value;

	function onMove(ev) {
		w.value = Math.max(300, ow + ev.clientX - sx);
		h.value = Math.max(200, oh + ev.clientY - sy);
	}
	function onUp() {
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}
</script>

<style scoped>
.ppv2-float {
	/*
	 * position: fixed + translate3d for movement.
	 * left/top stay at 0 — all positioning is via transform.
	 */
	position: fixed;
	left: 0;
	top: 0;
	display: flex;
	flex-direction: column;
	background: var(--bg-surface);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
	overflow: hidden;

	/* GPU layer promotion — avoids repaint of siblings during drag */
	will-change: transform;

	/* Scope layout/paint/style to this subtree */
	contain: layout style;
}

.ppv2-float-header {
	flex-shrink: 0;
	padding: 5px 8px;
	background: var(--bg-header);
	color: var(--text-header);
	display: flex;
	align-items: center;
	justify-content: space-between;
	cursor: move;
	user-select: none;
}

.ppv2-float-body {
	flex: 1;
	overflow: auto;
}

.ppv2-float-footer {
	flex-shrink: 0;
	padding: 4px 12px;
	background: var(--bg-header);
	font-size: var(--font-size-sm);
	color: var(--text-muted);
	cursor: move;
	user-select: none;
	text-align: center;
}

.ppv2-resize-handle {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 16px;
	height: 16px;
	cursor: nwse-resize;
	background: linear-gradient(135deg, transparent 50%, var(--border-color) 50%);
	border-radius: 0 0 var(--border-radius) 0;
}
</style>
