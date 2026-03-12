<template>
	<div class="tf-column">
		<div class="tf-col-header">
			{{ col.doctype }}
			<span class="tf-col-count">{{ col.fields.length }} fields</span>
		</div>
		<div class="tf-tiles">
			<div
				v-for="f in col.fields"
				:key="f.fieldname"
				:class="tileClass(f)"
				:title="isCircular(f) ? `Circular: ${f.options} already visited` : ''"
				@click="onTileClick(f)"
			>
				<div class="tf-tile-top">
					<span class="tf-tile-label">{{ f.label }}</span>
					<span v-if="(f.is_link || f.is_table) && !isCircular(f)" class="tf-tile-arrow">&#9654;</span>
				</div>
				<div class="tf-tile-meta">
					<span class="tf-tile-fieldname">{{ f.fieldname }}</span>
					<span class="tf-tile-badge">{{ badgeText(f) }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
const props = defineProps({
	col: { type: Object, required: true },
	visited: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["navigate", "select-field"]);

function isCircular(f) {
	return (f.is_link || f.is_table) && f.options && props.visited[f.options];
}

function tileClass(f) {
	const cls = ["tf-tile"];
	if (f.is_pronoun) cls.push("tf-tile-pronoun");
	else if (isCircular(f)) cls.push("tf-tile-circular");
	else if (f.is_link) cls.push("tf-tile-link");
	else if (f.is_table) cls.push("tf-tile-table");
	if (props.col.activeField === f.fieldname) cls.push("tf-tile-active");
	return cls.join(" ");
}

function badgeText(f) {
	if (f.is_pronoun) return "pronoun";
	let text = f.fieldtype;
	if ((f.is_link || f.is_table) && f.options) text += ` \u2192 ${f.options}`;
	return text;
}

function onTileClick(f) {
	if (isCircular(f)) return;
	if (f.is_link || f.is_table) {
		emit("navigate", f);
	} else {
		emit("select-field", f);
	}
}
</script>

<style scoped>
.tf-column {
	min-width: 220px;
	max-width: 260px;
	flex-shrink: 0;
	border-right: 1px solid #d1d8dd;
	display: flex;
	flex-direction: column;
}

.tf-col-header {
	padding: 8px 10px;
	background: #E3F0FC;
	color: #105EAD;
	font-weight: 600;
	font-size: 12px;
	border-bottom: 2px solid #A2CCF6;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.tf-col-count {
	font-weight: 400;
	font-size: 10px;
	opacity: 0.7;
}

.tf-tiles {
	flex: 1;
	overflow-y: auto;
	padding: 4px;
}

.tf-tile {
	padding: 6px 8px;
	margin: 2px 0;
	border-radius: 4px;
	cursor: pointer;
	border: 1px solid transparent;
	transition: background 0.1s;
}
.tf-tile:hover { background: #EAF3FD; }

.tf-tile-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.tf-tile-label { font-size: 12px; font-weight: 500; color: #333; }
.tf-tile-arrow { color: #126BC4; font-size: 10px; }

.tf-tile-meta {
	display: flex;
	justify-content: space-between;
	margin-top: 2px;
}
.tf-tile-fieldname { font-size: 10px; color: #8D949A; }
.tf-tile-badge { font-size: 9px; color: #8D949A; background: #f0f2f4; padding: 1px 4px; border-radius: 3px; }

.tf-tile-link { border-left: 3px solid #126BC4; }
.tf-tile-table { border-left: 3px solid #e67e22; }
.tf-tile-pronoun { border-left: 3px solid #9b59b6; }
.tf-tile-circular { opacity: 0.4; cursor: not-allowed; }
.tf-tile-active { background: #D4E8FC; border-color: #126BC4; }
</style>
