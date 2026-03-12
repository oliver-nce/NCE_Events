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
				:visited="finder.visited"
				@navigate="(f) => onNavigate(f, ci)"
				@select-field="(f) => onSelectField(f, ci)"
			/>
		</div>

		<div class="tf-footer" @mousedown.prevent="startDrag">
			Tag Finder: {{ rootDoctype }}
		</div>

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
	</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useTagFinder } from "../composables/useTagFinder.js";
import TagColumn from "./TagColumn.vue";
import TagDialog from "./TagDialog.vue";

const props = defineProps({
	rootDoctype: { type: String, required: true },
});

defineEmits(["close"]);

const finder = useTagFinder();
const tagDialogs = reactive([]);
const bodyEl = ref(null);

const x = ref(window.innerWidth - 560);
const y = ref(80);
const z = ref(10060);

const floatStyle = computed(() => ({
	left: x.value + "px",
	top: y.value + "px",
	zIndex: z.value,
}));

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
	width: 520px;
	max-height: 70vh;
	background: #fafafa;
	border: 1px solid #b0b8c0;
	border-radius: 6px;
	box-shadow: 0 4px 16px rgba(0,0,0,0.15);
	display: flex;
	flex-direction: column;
}

.tf-header {
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

.tf-body {
	flex: 1;
	display: flex;
	overflow-x: auto;
	overflow-y: hidden;
}

.tf-footer {
	padding: 4px 12px;
	background: #e8ecf0;
	font-size: 11px;
	color: #555;
	text-align: center;
	cursor: move;
	user-select: none;
	border-radius: 0 0 6px 6px;
}
</style>
