<template>
	<div
		ref="floatEl"
		class="ppv2-float"
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

const floatStyle = computed(() => ({
	left: x.value + "px",
	top: y.value + "px",
	width: w.value + "px",
	height: h.value + "px",
	zIndex: z.value,
}));

function bringToFront() {
	z.value = getNextZ();
}

function onMouseDown(e) {
	bringToFront();
	if (e.target.closest && e.target.closest(".ppv2-header")) {
		e.preventDefault();
		startDrag(e);
	}
}

function startDrag(e) {
	bringToFront();
	const sx = e.clientX, sy = e.clientY;
	const ox = x.value, oy = y.value;

	function onMove(ev) {
		x.value = ox + ev.clientX - sx;
		y.value = Math.max(0, oy + ev.clientY - sy);
	}
	function onUp() {
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
	position: fixed;
	display: flex;
	flex-direction: column;
	background: #fafafa;
	border: 1px solid #b0b8c0;
	border-radius: 6px;
	box-shadow: 0 4px 16px rgba(0,0,0,0.15);
	overflow: hidden;
}

.ppv2-float-body {
	flex: 1;
	overflow: auto;
}

.ppv2-float-footer {
	flex-shrink: 0;
	padding: 4px 12px;
	background: #e8ecf0;
	font-size: 11px;
	color: #555;
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
	background: linear-gradient(135deg, transparent 50%, #b0b8c0 50%);
	border-radius: 0 0 6px 0;
}
</style>
