<template>
	<div class="ppv2-fd-header">
		<div class="ppv2-fd-header-main">
			<div v-if="rowNavEnabled" class="ppv2-fd-nav" @mousedown.stop>
				<button
					type="button"
					class="ppv2-fd-nav-btn"
					:disabled="!canNavigatePrev || findLayoutMode"
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
					:disabled="!canNavigateNext || findLayoutMode"
					title="Next record (panel list) — Alt+→"
					aria-label="Next record"
					@click="$emit('nav-next')"
				>
					<i class="fa fa-chevron-right"></i>
				</button>

				<!-- Find layout mode: Perform / Cancel -->
				<template v-if="findLayoutMode">
					<button
						type="button"
						class="ppv2-fd-find-action ppv2-fd-find-perform"
						title="Run find with criteria typed in the form"
						@click="$emit('find-layout-perform')"
					>
						{{ __("Perform Find") }}
					</button>
					<button
						type="button"
						class="ppv2-fd-find-action"
						title="Leave find mode without searching"
						@click="$emit('find-layout-cancel')"
					>
						{{ __("Cancel Find") }}
					</button>
				</template>

				<template v-else>
					<button
						type="button"
						class="ppv2-fd-nav-btn ppv2-fd-find-btn"
						:class="{ 'ppv2-fd-find-active': findActive }"
						title="Enter find mode — type criteria in form fields"
						aria-label="Enter find mode"
						@click="$emit('find-layout-enter')"
					>
						<i class="fa fa-search"></i>
					</button>
					<button
						v-if="findActive"
						type="button"
						class="ppv2-fd-nav-btn"
						title="Clear find — show all rows again"
						aria-label="Clear find"
						@click="$emit('find-clear')"
					>
						<i class="fa fa-times"></i>
					</button>
				</template>
			</div>
			<span class="ppv2-fd-title">{{ title }}</span>
		</div>
		<button v-if="closable" class="ppv2-fd-close" type="button" @click="$emit('close')">
			&times;
		</button>
	</div>
</template>

<script setup>
defineProps({
	rowNavEnabled: { type: Boolean, default: false },
	canNavigatePrev: { type: Boolean, default: false },
	canNavigateNext: { type: Boolean, default: false },
	rowNavLabel: { type: String, default: "" },
	title: { type: String, default: "" },
	closable: { type: Boolean, default: true },
	findActive: { type: Boolean, default: false },
	findLayoutMode: { type: Boolean, default: false },
});

defineEmits([
	"close",
	"nav-prev",
	"nav-next",
	"find-clear",
	"find-layout-enter",
	"find-layout-perform",
	"find-layout-cancel",
]);

function __(s) {
	return typeof window.__ === "function" ? window.__(s) : s;
}
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
	flex-wrap: wrap;
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
.ppv2-fd-find-btn.ppv2-fd-find-active {
	background: color-mix(in srgb, var(--text-header) 30%, transparent);
	border-color: color-mix(in srgb, var(--text-header) 60%, transparent);
}
.ppv2-fd-find-action {
	height: 28px;
	padding: 0 10px;
	border: 1px solid color-mix(in srgb, var(--text-header) 35%, transparent);
	border-radius: var(--border-radius-sm, 4px);
	background: color-mix(in srgb, var(--text-header) 12%, transparent);
	color: var(--text-header);
	cursor: pointer;
	font-size: 12px;
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-fd-find-action:hover {
	background: color-mix(in srgb, var(--text-header) 22%, transparent);
}
.ppv2-fd-find-perform {
	background: color-mix(in srgb, var(--primary, #3182ce) 35%, transparent);
	border-color: color-mix(in srgb, var(--primary, #3182ce) 55%, transparent);
}
</style>
