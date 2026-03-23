<template>
	<div
		ref="floatEl"
		class="ppv2-float"
		:class="{ 'ppv2-float--dragging': isDragging, 'ppv2-float--resizing': isResizing }"
		:style="floatStyle"
		@mousedown="onMouseDown"
	>
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
const isDragging = ref(false);
const isResizing = ref(false);

/*
 * Position via transform: translate3d() — this is composited on the GPU
 * and does NOT trigger layout or repaint on the rest of the document.
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

function onMouseDown(e) {
	bringToFront();
	if (e.target.closest && e.target.closest("button, a, input, select, textarea")) return;
	if (e.target.closest && e.target.closest(".ppv2-header")) {
		e.preventDefault();
		startDrag(e);
	}
}

function startDrag(e) {
	bringToFront();
	const sx = e.clientX, sy = e.clientY;
	const ox = x.value, oy = y.value;
	isDragging.value = true;

	function onMove(ev) {
		x.value = ox + ev.clientX - sx;
		y.value = Math.max(0, oy + ev.clientY - sy);
	}
	function onUp() {
		isDragging.value = false;
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
	isResizing.value = true;

	function onMove(ev) {
		w.value = Math.max(300, ow + ev.clientX - sx);
		h.value = Math.max(200, oh + ev.clientY - sy);
	}
	function onUp() {
		isResizing.value = false;
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

/*
 * During drag: freeze pointer-events on children so the table doesn't
 * try to respond to hover/scroll while being moved. This is the
 * professional alternative to outline-only dragging — the content
 * stays visible but is inert, and transform movement is free.
 */
.ppv2-float--dragging > .ppv2-float-body {
	pointer-events: none;
}

/*
 * During resize: same idea — prevent child interaction while sizing
 * to avoid layout thrash from hover effects inside the table.
 */
.ppv2-float--resizing > .ppv2-float-body {
	pointer-events: none;
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

.ppv2-float :deep(.ppv2-header) {
	cursor: move;
	user-select: none;
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
