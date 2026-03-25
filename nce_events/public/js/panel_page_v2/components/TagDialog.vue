<template>
	<div class="tf-tag-panel" :style="panelStyle" @mousedown="bringToFront">
		<div class="tf-tag-header" @mousedown.prevent="startDrag">
			<span>{{ field.label }}</span>
			<button class="tf-close" @click="$emit('close')">&times;</button>
		</div>
		<div class="tf-tag-body">
			<div class="tf-lbl">Fallback Value</div>
			<input v-model="fallback" type="text" class="tf-input" placeholder="e.g. Student (leave empty for none)">

			<div class="tf-actions">
				<label class="tf-check-label">
					<input v-model="isHtml" type="checkbox"> Is this HTML?
				</label>
				<button class="btn btn-primary btn-sm" @click="onOk">OK</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
	field: { type: Object, required: true },
	baseTag: { type: String, required: true },
	path: { type: String, default: "" },
	initTop: { type: Number, default: 100 },
	initLeft: { type: Number, default: 160 },
	applyFilters: { type: Function, required: true },
});

const emit = defineEmits(["close"]);

const fallback = ref("");
const isHtml = ref(false);
const top = ref(props.initTop);
const left = ref(props.initLeft);
const zIndex = ref(100050);

const displayTag = computed(() => props.applyFilters(props.baseTag, fallback.value, isHtml.value));

const panelStyle = computed(() => ({
	top: top.value + "px",
	left: left.value + "px",
	zIndex: zIndex.value,
}));

function bringToFront() { zIndex.value = zIndex.value + 1; }

function showToast() {
	const el = document.createElement("div");
	el.textContent = "Tag is on the clipboard";
	Object.assign(el.style, {
		position: "fixed",
		top: top.value + "px",
		left: left.value + "px",
		padding: "10px 18px",
		background: "#126BC4",
		color: "#fff",
		fontWeight: "600",
		fontSize: "13px",
		borderRadius: "6px",
		boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
		zIndex: "100060",
		pointerEvents: "none",
		opacity: "1",
		transition: "opacity 0.6s ease",
	});
	document.body.appendChild(el);
	setTimeout(() => { el.style.opacity = "0"; }, 1400);
	setTimeout(() => { el.remove(); }, 2000);
}

function onOk() {
	if (!navigator.clipboard) return;
	navigator.clipboard.writeText(displayTag.value).then(() => {
		showToast();
		emit("close");
	});
}

function startDrag(e) {
	const sx = e.clientX, sy = e.clientY;
	const ot = top.value, ol = left.value;
	function onMove(ev) {
		top.value = Math.max(0, ot + ev.clientY - sy);
		left.value = ol + ev.clientX - sx;
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
.tf-tag-panel {
	position: fixed;
	width: 320px;
	background: #fff;
	border: 1px solid #b0b8c0;
	border-radius: 6px;
	box-shadow: 0 4px 16px rgba(0,0,0,0.18);
	z-index: 100050;
	font-family: Arial, sans-serif;
}

.tf-tag-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	background: #126BC4;
	color: #fff;
	font-weight: 600;
	font-size: 13px;
	border-radius: 6px 6px 0 0;
	cursor: move;
	user-select: none;
}

.tf-close {
	background: none;
	border: none;
	color: #fff;
	font-size: 18px;
	cursor: pointer;
	opacity: 0.8;
}
.tf-close:hover { opacity: 1; }

.tf-tag-body { padding: 12px; }

.tf-lbl {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	color: #8D949A;
}

.tf-input {
	width: 100%;
	padding: 4px 8px;
	font-size: 12px;
	border: 1px solid #d1d8dd;
	border-radius: 4px;
	margin-top: 4px;
}

.tf-actions {
	margin-top: 10px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.tf-check-label { font-size: 11px; }
</style>
