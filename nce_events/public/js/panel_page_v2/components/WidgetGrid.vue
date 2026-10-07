<!--
CSS grid layout placing field and display widgets on the panel page v2 canvas.

code-index:begin
{
 "purpose": "CSS grid layout placing field and display widgets on the panel page v2 canvas.",
 "read_when": "When changing widget grid placement, cell sizing, or adding new widget types.",
 "gotchas": [],
 "keywords": ["WidgetGrid", "widget grid", "FieldWidget", "DisplayWidget", "gridColumns", "cellSize", "save-field"],
 "format": 1
}
code-index:end
-->

<template>
	<div class="widget-grid" :style="gridStyle">
		<div
			v-for="widget in widgets"
			:key="widget.id || widget.type + '-' + widget.x + '-' + widget.y"
			class="widget-item"
			:style="widgetStyle(widget)"
		>
			<component
				:is="widgetMap[widget.type]"
				:config="widget.config"
				:record="record"
				:meta="meta"
				:resolved-hops="resolvedHops"
				:scripts="scripts"
				@save-field="(...args) => $emit('save-field', ...args)"
				@open-card="(...args) => $emit('open-card', ...args)"
			/>
		</div>
	</div>
</template>

<script setup>
import { computed } from "vue";
import FieldWidget from "./FieldWidget.vue";
import DisplayWidget from "./DisplayWidget.vue";

const props = defineProps({
	widgets: { type: Array, required: true },
	gridColumns: { type: Number, default: 12 },
	gridRows: { type: Number, default: 10 },
	cellSize: { type: Number, default: 50 },
	record: { type: Object, default: null },
	meta: { type: Object, default: () => ({}) },
	resolvedHops: { type: Object, default: () => ({}) },
	scripts: { type: Array, default: () => [] },
});

defineEmits(["save-field", "open-card"]);

const widgetMap = {
	field: FieldWidget,
	display: DisplayWidget,
};

const gridStyle = computed(() => ({
	display: "grid",
	gridTemplateColumns: `repeat(${props.gridColumns}, ${props.cellSize}px)`,
	gridTemplateRows: `repeat(${props.gridRows}, ${props.cellSize}px)`,
	gap: "4px",
}));

function widgetStyle(w) {
	return {
		gridColumn: `${w.x + 1} / span ${w.w}`,
		gridRow: `${w.y + 1} / span ${w.h}`,
		overflow: "hidden",
	};
}
</script>

<style scoped>
.widget-grid {
	position: relative;
}
.widget-item {
	min-width: 0;
	min-height: 0;
}
</style>
