<template>
	<div class="ppv2-fd-header">
		<div class="ppv2-fd-header-main">
			<div v-if="rowNavEnabled" class="ppv2-fd-nav" @mousedown.stop>
				<button
					type="button"
					class="ppv2-fd-nav-btn"
					:disabled="!canNavigatePrev"
					title="Previous record (panel list) — Alt+←"
					aria-label="Previous record"
					@click="$emit('nav-prev')"
				>
					<i class="fa fa-chevron-left"></i>
				</button>
				<span v-if="rowNavLabel" class="ppv2-fd-nav-pos">{{ rowNavLabel }}</span>
				<button
					type="button"
					class="ppv2-fd-nav-btn"
					:disabled="!canNavigateNext"
					title="Next record (panel list) — Alt+→"
					aria-label="Next record"
					@click="$emit('nav-next')"
				>
					<i class="fa fa-chevron-right"></i>
				</button>
			</div>
			<span class="ppv2-fd-title">{{ title }}</span>
		</div>
		<button class="ppv2-fd-close" type="button" @click="$emit('close')">&times;</button>
	</div>
</template>

<script setup>
defineProps({
	rowNavEnabled: { type: Boolean, default: false },
	canNavigatePrev: { type: Boolean, default: false },
	canNavigateNext: { type: Boolean, default: false },
	rowNavLabel: { type: String, default: "" },
	title: { type: String, default: "" },
});

defineEmits(["close", "nav-prev", "nav-next"]);
</script>

<style scoped>
.ppv2-fd-header {
	padding: 10px 16px;
	background: var(--bg-header);
	color: var(--text-header);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-shrink: 0;
}
.ppv2-fd-header-main {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	flex: 1;
}
.ppv2-fd-nav {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 0;
}
.ppv2-fd-nav-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid color-mix(in srgb, var(--text-header) 28%, transparent);
	border-radius: var(--border-radius-sm, 4px);
	background: color-mix(in srgb, var(--text-header) 10%, transparent);
	color: var(--text-header);
	cursor: pointer;
	font-size: 12px;
}
.ppv2-fd-nav-btn:hover:not(:disabled) {
	background: color-mix(in srgb, var(--text-header) 18%, transparent);
}
.ppv2-fd-nav-btn:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}
.ppv2-fd-nav-pos {
	font-size: 12px;
	font-weight: var(--font-weight-bold, 600);
	opacity: 0.95;
	min-width: 3.2em;
	text-align: center;
	user-select: none;
}
.ppv2-fd-title {
	font-weight: var(--font-weight-bold);
	font-size: 14px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.ppv2-fd-close {
	background: none;
	border: none;
	color: var(--text-header);
	font-size: 20px;
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
	opacity: 0.8;
}
.ppv2-fd-close:hover {
	opacity: 1;
}
</style>
