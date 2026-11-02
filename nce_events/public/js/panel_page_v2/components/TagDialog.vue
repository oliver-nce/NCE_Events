<!--
Draggable Tag Finder dialog to copy merge tags with optional fallback value and HTML filter.

code-index:begin
{
 "purpose": "Draggable Tag Finder dialog to copy merge tags with optional fallback value and HTML filter.",
 "read_when": "When changing tag clipboard copy, fallback filters, or dialog drag and toast behavior.",
 "gotchas": [
  "Toast uses tf-toast class; do not set inline background or color on the toast element."
 ],
 "keywords": ["TagDialog", "copy tag", "clipboard", "fallback", "applyFilters", "isHtml", "baseTag", "drag panel"],
 "format": 1
}
code-index:end
-->

<template>
	<div
		class="tf-tag-panel"
		:style="panelStyle"
		@mousedown="bringToFront"
	>
		<div class="tf-tag-header" @mousedown.prevent="startDrag">
			<span>{{ field.label }}</span>
			<button class="tf-close" @click="$emit('close')">&times;</button>
		</div>
		<div class="tf-tag-body">
			<div class="tf-lbl">Fallback Value</div>
			<input
				v-model="fallback"
				type="text"
				class="tf-input"
				placeholder="e.g. Student (leave empty for none)"
			>

			<div class="tf-actions">
				<label class="tf-check-label">
					<input v-model="isHtml" type="checkbox"> Is this HTML?
				</label>
				<div class="tf-btn-group">
					<button class="btn btn-default btn-sm" @click="$emit('close')">Cancel</button>
					<button class="btn btn-primary btn-sm" @click="onOk">Copy Tag to Clipboard</button>
				</div>
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

function showToast(t, l) {
	const el = document.createElement("div");
	el.textContent = "Tag is on the clipboard";
	el.className = "tf-toast";
	Object.assign(el.style, {
		position: "fixed",
		top: t + "px",
		left: l + "px",
		padding: "10px 18px",
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

function fallbackCopy(text) {
	const ta = document.createElement("textarea");
	ta.value = text;
	ta.style.cssText = "position:fixed;opacity:0";
	document.body.appendChild(ta);
	ta.select();
	document.execCommand("copy");
	ta.remove();
}

function onOk() {
	const tag = displayTag.value;
	const t = top.value, l = left.value;
	emit("close");

	if (navigator.clipboard) {
		navigator.clipboard.writeText(tag).catch(() => fallbackCopy(tag));
	} else {
		fallbackCopy(tag);
	}

	showToast(t, l);
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
	z-index: 100050;
	overflow: hidden;
	background: var(--fg-color, #fff);
	border: 1px solid var(--border-color, #d1d8dd);
	border-radius: var(--border-radius, 6px);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.tf-tag-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	font-weight: 600;
	font-size: var(--font-size-base);
	background: var(--blue-500);
	color: #fff;
	border-radius: 6px 6px 0 0;
	cursor: move;
	user-select: none;
}

.tf-close {
	background: none;
	border: none;
	color: #fff;
	font-size: calc(var(--font-size-base) * 1.35);
	cursor: pointer;
	opacity: 0.9;
}
.tf-close:hover { opacity: 1; }

.tf-tag-body { padding: 12px; }

.tf-lbl {
	font-weight: 600;
	text-transform: uppercase;
	font-size: var(--font-size-xs, 11px);
	color: var(--gray-600);
}

.tf-input {
	width: 100%;
	padding: 4px 8px;
	font-size: var(--font-size-base);
	margin-top: 4px;
	box-sizing: border-box;
	border: 1px solid var(--border-color, #d1d8dd);
	border-radius: var(--border-radius-sm, 4px);
}
.tf-input:focus {
	border-color: var(--blue-500);
	outline: none;
}

.tf-actions {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.tf-check-label { font-size: var(--font-size-sm); }

.tf-btn-group {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
</style>

<style>
.tf-toast {
	background: var(--blue-500);
	color: #fff;
}
</style>
