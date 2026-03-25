<template>
	<div
		class="tf-float"
		:style="floatStyle"
		@mousedown="bringToFront"
	>
		<div class="tf-header" @mousedown.prevent="startDrag">
			<span>Tag Finder: {{ rootDoctype }}</span>
			<button class="tf-close" @click="$emit('close')">&times;</button>
		</div>

		<div ref="bodyEl" class="tf-body">
			<TagColumn
				v-for="(col, ci) in finder.columns"
				:key="ci"
				:col="col"
				:col-index="ci"
				:columns="finder.columns"
				@navigate="(f) => onNavigate(f, ci)"
				@select-field="(f) => onSelectField(f, ci)"
			/>
		</div>

		<div class="tf-footer" @mousedown.prevent="startDrag">
			Tag Finder: {{ rootDoctype }}
		</div>

		<div class="tf-resize-handle" @mousedown.prevent="startResize"></div>

		<Teleport to="body">
			<TagDialog
				v-for="(td, ti) in tagDialogs"
				:key="ti"
				:field="td.field"
				:base-tag="td.baseTag"
				:path="td.path"
				:apply-filters="finder.applyFilters"
				:init-top="100 + ti * 24"
				:init-left="160 + ti * 24"
				@close="tagDialogs.splice(ti, 1)"
			/>
		</Teleport>
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useTagFinder } from "../composables/useTagFinder.js";
import TagColumn from "./TagColumn.vue";
import TagDialog from "./TagDialog.vue";

const props = defineProps({
	rootDoctype: { type: String, required: true },
	initX: { type: Number, default: -1 },
	initY: { type: Number, default: 80 },
});

defineEmits(["close"]);

const finder = useTagFinder();
const tagDialogs = reactive([]);
const bodyEl = ref(null);

const x = ref(props.initX >= 0 ? props.initX : window.innerWidth - 560);
const y = ref(props.initY);
const z = ref(10060);
const manualW = ref(null);
const manualH = ref(null);

const floatStyle = computed(() => {
	const s = {
		left: x.value + "px",
		top: y.value + "px",
		zIndex: z.value,
	};
	if (manualW.value) s.width = manualW.value + "px";
	if (manualH.value) s.maxHeight = manualH.value + "px";
	return s;
});

function bringToFront() { z.value = z.value + 1; }

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
	const panel = e.target.parentElement;
	const ow = panel.offsetWidth, oh = panel.offsetHeight;
	function onMove(ev) {
		manualW.value = Math.max(260, ow + ev.clientX - sx);
		manualH.value = Math.max(200, oh + ev.clientY - sy);
	}
	function onUp() {
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}

onMounted(() => {
	finder.loadColumn(props.rootDoctype, null, null, 0);
});

async function onNavigate(field, colIdx) {
	finder.columns[colIdx].activeField = field.fieldname;
	await finder.loadColumn(
		field.options,
		field.fieldname,
		field.is_table ? "Table" : "Link",
		colIdx + 1,
	);
	await nextTick();
	if (bodyEl.value) bodyEl.value.scrollLeft = bodyEl.value.scrollWidth;
	if (!manualW.value) return;
	// auto-widen if user hasn't resized or content exceeds current width
}

function onSelectField(field, colIdx) {
	const baseTag = finder.buildTag(colIdx, field);
	const path = field.is_pronoun
		? `${finder.columns[0]?.doctype || ""} \u2192 ${field.fieldname} (pronoun)`
		: finder.buildPath(colIdx, field);
	tagDialogs.push({ field, baseTag, path });
}
</script>

<style scoped>
.tf-float {
	position: fixed;
	width: fit-content;
	min-width: 260px;
	max-width: 90vw;
	max-height: 70vh;
	background: var(--bg-surface);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
	display: flex;
	flex-direction: column;
}

.tf-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	background: var(--bg-header);
	color: var(--text-header);
	font-weight: 600;
	font-size: var(--font-size-base);
	border-radius: var(--border-radius) var(--border-radius) 0 0;
	cursor: move;
	user-select: none;
}

.tf-close {
	background: none;
	border: none;
	color: var(--text-header);
	font-size: 18px;
	cursor: pointer;
	opacity: 0.8;
}
.tf-close:hover { opacity: 1; }

.tf-body {
	flex: 1;
	display: flex;
	overflow-x: auto;
	overflow-y: hidden;
}

.tf-footer {
	padding: 4px 12px;
	background: var(--bg-header);
	font-size: var(--font-size-sm);
	color: var(--text-muted);
	text-align: center;
	cursor: move;
	user-select: none;
	border-radius: 0 0 var(--border-radius) var(--border-radius);
}

.tf-resize-handle {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 16px;
	height: 16px;
	cursor: nwse-resize;
	background: linear-gradient(135deg, transparent 50%, var(--border-color) 50%, var(--border-color) 60%, transparent 60%, transparent 75%, var(--border-color) 75%, var(--border-color) 85%, transparent 85%);
	border-radius: 0 0 var(--border-radius) 0;
}
</style>
