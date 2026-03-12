<template>
	<div class="tf-tag-panel" :style="{ top: top + 'px', left: left + 'px' }" @mousedown="bringToFront">
		<div class="tf-tag-header" @mousedown.prevent="startDrag">
			<span>{{ field.label }}</span>
			<button class="tf-close" @click="$emit('close')">&times;</button>
		</div>
		<div class="tf-tag-body">
			<div class="tf-lbl">Field</div>
			<div class="tf-val">{{ field.label }} <span style="color:#8D949A;">({{ field.fieldname }})</span></div>

			<div class="tf-lbl">Path</div>
			<div class="tf-val tf-path">{{ path }}</div>

			<div class="tf-lbl">Fallback Value</div>
			<input v-model="fallback" type="text" class="tf-input" placeholder="e.g. Student (leave empty for none)">

			<div class="tf-lbl">Tag</div>
			<pre class="tf-pre" @click="selectPre">{{ displayTag }}</pre>

			<div class="tf-actions">
				<label class="tf-check-label">
					<input v-model="isHtml" type="checkbox"> Is this HTML?
				</label>
				<span class="tf-btn-group">
					<button class="btn btn-default btn-sm" @click="insertAtCursor">Insert at Cursor</button>
					<button class="btn btn-primary btn-sm" @click="copyTag">Copy to Clipboard</button>
				</span>
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
const z = ref(10080);

const displayTag = computed(() => props.applyFilters(props.baseTag, fallback.value, isHtml.value));

function bringToFront() { z.value = z.value + 1; }

function selectPre(e) {
	const range = document.createRange();
	range.selectNodeContents(e.target);
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
}

function copyTag() {
	if (navigator.clipboard) {
		navigator.clipboard.writeText(displayTag.value).then(() => {
			frappe.show_alert({ message: __("Tag copied"), indicator: "green" });
			emit("close");
		});
	}
}

function insertAtCursor() {
	frappe.show_alert({ message: __("Use Copy and paste into your message"), indicator: "orange" });
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
	width: 380px;
	background: #fff;
	border: 1px solid #b0b8c0;
	border-radius: 6px;
	box-shadow: 0 4px 16px rgba(0,0,0,0.18);
	z-index: 10080;
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
	margin-top: 8px;
}
.tf-lbl:first-child { margin-top: 0; }

.tf-val { font-size: 12px; color: #333; margin-top: 2px; }
.tf-path { font-size: 11px; word-break: break-word; }

.tf-input {
	width: 100%;
	padding: 4px 8px;
	font-size: 12px;
	border: 1px solid #d1d8dd;
	border-radius: 4px;
	margin-top: 4px;
}

.tf-pre {
	background: #f5f7fa;
	border: 1px solid #d1d8dd;
	border-radius: 4px;
	padding: 8px;
	font-size: 11px;
	white-space: pre-wrap;
	word-break: break-all;
	margin-top: 4px;
	cursor: pointer;
}

.tf-actions {
	margin-top: 10px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 6px;
}
.tf-check-label { font-size: 11px; }
.tf-btn-group { display: flex; gap: 6px; }
</style>
