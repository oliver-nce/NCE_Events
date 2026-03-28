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

// Full-screen overlay prevents expensive hit-testing on table DOM during drag/resize
function _addOverlay(cursor) {
	const overlay = document.createElement("div");
	overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;cursor:${cursor};`;
	document.body.appendChild(overlay);
	return overlay;
}

function startDrag(e) {
	const sx = e.clientX, sy = e.clientY;
	const ox = x.value, oy = y.value;
	const el = floatEl.value;
	const overlay = _addOverlay("move");

	function onMove(ev) {
		// Write directly to the DOM — bypasses Vue reactivity entirely
		// so the table never re-renders during drag
		const nx = ox + ev.clientX - sx;
		const ny = Math.max(0, oy + ev.clientY - sy);
		el.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
	}
	function onUp(ev) {
		document.body.removeChild(overlay);
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
	const overlay = _addOverlay("nwse-resize");

	function onMove(ev) {
		// Write directly to the DOM — bypasses Vue reactivity entirely
		// so the table never re-renders during resize
		const nw = Math.max(300, ow + ev.clientX - sx);
		const nh = Math.max(200, oh + ev.clientY - sy);
		el.style.width = nw + "px";
		el.style.height = nh + "px";
	}
	function onUp(ev) {
		document.body.removeChild(overlay);
		// Now write back to Vue refs once so it knows the final size
		w.value = Math.max(300, ow + ev.clientX - sx);
		h.value = Math.max(200, oh + ev.clientY - sy);
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

/* ── Header slot content (rendered by App.vue) ── */

.ppv2-float-header :deep(.ppv2-title) {
	font-weight: var(--font-weight-bold);
	font-size: 14px;
}

.ppv2-float-header :deep(.ppv2-click-hint) {
	font-size: var(--font-size-sm);
	opacity: 0.7;
	font-style: italic;
	margin-left: var(--spacing-sm);
}

.ppv2-float-header :deep(.ppv2-header-controls) {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.ppv2-float-header :deep(.ppv2-hdr-btn) {
	background: none;
	border: none;
	color: var(--text-header);
	font-size: 18px;
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
	opacity: 0.8;
}
.ppv2-float-header :deep(.ppv2-hdr-btn:hover) { opacity: 1; }

.ppv2-float-header :deep(.ppv2-hdr-btn--refreshing) {
	color: var(--color-secondary) !important;
	opacity: 1;
}
.ppv2-float-header :deep(.ppv2-hdr-btn--refreshing .fa-refresh) {
	animation: ppv2-spin 0.8s linear infinite;
}
@keyframes ppv2-spin {
	from { transform: rotate(0deg); }
	to   { transform: rotate(360deg); }
}

.ppv2-float-header :deep(.ppv2-count) {
	font-size: var(--font-size-sm);
	opacity: 0.8;
}

.ppv2-float-header :deep(.ppv2-close-btn) {
	font-size: 20px;
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
