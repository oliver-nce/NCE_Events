<template>
	<div
		class="tf-tag-panel theme-bg-surface theme-border theme-rounded theme-shadow-theme"
		:style="panelStyle"
		@mousedown="bringToFront"
	>
		<div class="tf-tag-header theme-bg-primary" @mousedown.prevent="startDrag">
			<span>{{ field.label }}</span>
			<button class="tf-close" @click="$emit('close')">&times;</button>
		</div>
		<div class="tf-tag-body">
			<div class="tf-lbl theme-text-xs theme-text-muted">Fallback Value</div>
			<input
				v-model="fallback"
				type="text"
				class="tf-input theme-border-input-border theme-rounded-sm"
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
	// Theme contract: theme-bg-primary sets background + paired fg — do not set inline background/color.
	el.className = "theme-bg-primary";
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
	font-family: Arial, sans-serif;
	overflow: hidden;
}

.tf-tag-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	font-weight: 600;
	font-size: 13px;
	border-radius: 6px 6px 0 0;
	cursor: move;
	user-select: none;
}

.tf-close {
	background: none;
	border: none;
	color: var(--nce-color-primary-fg);
	font-size: 18px;
	cursor: pointer;
	opacity: 0.9;
}
.tf-close:hover { opacity: 1; }

.tf-tag-body { padding: 12px; }

.tf-lbl {
	font-weight: 600;
	text-transform: uppercase;
}

.tf-input {
	width: 100%;
	padding: 4px 8px;
	font-size: 12px;
	margin-top: 4px;
	box-sizing: border-box;
}
.tf-input:focus {
	border-color: var(--nce-color-focus);
	outline: none;
}

.tf-actions {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.tf-check-label { font-size: 11px; }

.tf-btn-group {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
</style>
