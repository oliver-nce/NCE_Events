<template>
	<div
		class="ppv2-find-actions"
		:class="{ 'ppv2-find-actions--browse': mode === 'browse' }"
		@mousedown.stop
	>
		<template v-if="mode === 'find'">
			<div class="ppv2-find-actions-main">
				<button
					type="button"
					class="ppv2-find-tab-btn ppv2-find-tab-btn--primary theme-border theme-rounded-sm"
					@click="$emit('find-perform')"
				>
					{{ label("Perform Find") }}
				</button>
				<button
					v-if="findMatchActive"
					type="button"
					class="ppv2-find-tab-btn theme-border theme-rounded-sm"
					:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'constrain' }"
					@mouseenter="hoveredFindBtn = 'constrain'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-constrain')"
				>
					{{ label("Constrain Found Set") }}
				</button>
				<button
					v-if="findMatchActive"
					type="button"
					class="ppv2-find-tab-btn theme-border theme-rounded-sm"
					:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'extend' }"
					@mouseenter="hoveredFindBtn = 'extend'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-extend')"
				>
					{{ label("Extend Found Set") }}
				</button>
				<button
					type="button"
					class="ppv2-find-tab-btn theme-border theme-rounded-sm"
					:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'cancel-find' }"
					@mouseenter="hoveredFindBtn = 'cancel-find'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-cancel-criteria')"
				>
					{{ label("Cancel Find") }}
				</button>
			</div>
			<div class="ppv2-find-actions-or">
				<button
					type="button"
					class="ppv2-find-tab-btn ppv2-find-or-btn theme-border theme-rounded-sm"
					:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'or' }"
					title="Add OR find request"
					:disabled="!findOrEnabled"
					@mouseenter="hoveredFindBtn = 'or'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-or')"
				>
					OR
				</button>
				<button
					type="button"
					class="ppv2-find-tab-btn ppv2-find-or-btn theme-border theme-rounded-sm"
					:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'duplicate' }"
					title="Duplicate this find request"
					:disabled="!findDuplicateEnabled"
					@mouseenter="hoveredFindBtn = 'duplicate'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-or-duplicate')"
				>
					<i class="fa fa-clipboard" aria-hidden="true"></i>
				</button>
			</div>
		</template>
		<template v-else-if="mode === 'browse'">
			<button
				type="button"
				class="ppv2-find-tab-btn theme-border theme-rounded-sm"
				:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'new' }"
				@mouseenter="hoveredFindBtn = 'new'"
				@mouseleave="hoveredFindBtn = null"
				@click="$emit('find-new')"
			>
				{{ label("New Find") }}
			</button>
			<button
				type="button"
				class="ppv2-find-tab-btn theme-border theme-rounded-sm"
				:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'modify' }"
				@mouseenter="hoveredFindBtn = 'modify'"
				@mouseleave="hoveredFindBtn = null"
				@click="$emit('find-modify')"
			>
				{{ label("Modify Find") }}
			</button>
			<button
				type="button"
				class="ppv2-find-tab-btn theme-border theme-rounded-sm"
				:class="{ 'ppv2-find-tab-btn--hover': hoveredFindBtn === 'exit' }"
				@mouseenter="hoveredFindBtn = 'exit'"
				@mouseleave="hoveredFindBtn = null"
				@click="$emit('find-exit')"
			>
				{{ label("Cancel") }}
			</button>
		</template>
	</div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
	mode: { type: String, required: true },
	findMatchActive: { type: Boolean, default: false },
	findOrEnabled: { type: Boolean, default: false },
	findDuplicateEnabled: { type: Boolean, default: true },
});

defineEmits([
	"find-perform",
	"find-constrain",
	"find-extend",
	"find-cancel-criteria",
	"find-or",
	"find-or-duplicate",
	"find-new",
	"find-modify",
	"find-exit",
]);

const hoveredFindBtn = ref(null);

function label(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}
</script>

<style scoped>
.ppv2-find-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 6px 10px;
	flex-shrink: 0;
	background-color: var(--nce-color-primary-100, #e3f0fc);
	border-bottom: var(--nce-border-width) solid var(--nce-color-border, #d1d5db);
}

.ppv2-find-actions-main,
.ppv2-find-actions-or {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.ppv2-find-actions-or {
	margin-left: auto;
}

.ppv2-find-actions--browse {
	border-bottom-style: dashed;
}

.ppv2-find-tab-btn {
	font-size: var(--font-size-sm);
	padding: 4px 14px;
	cursor: pointer;
	font-family: inherit;
	white-space: nowrap;
	background-color: var(--nce-color-surface, #ffffff);
}

.ppv2-find-tab-btn--primary {
	background-color: var(--nce-color-primary, #126bc4);
	border-color: var(--nce-color-primary, #126bc4);
	color: var(--nce-color-primary-fg, #ffffff);
	font-weight: var(--font-weight-bold, 600);
}

.ppv2-find-tab-btn--hover,
.ppv2-find-tab-btn:hover:not(:disabled) {
	background-color: var(--nce-color-primary-50, #f1f7fe);
}

.ppv2-find-tab-btn--primary.ppv2-find-tab-btn--hover,
.ppv2-find-tab-btn--primary:hover {
	background-color: var(--nce-color-primary-600, #105ead);
	border-color: var(--nce-color-primary-600, #105ead);
}

.ppv2-find-or-btn {
	min-width: 2.5em;
	font-weight: var(--font-weight-bold, 600);
}

.ppv2-find-or-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
</style>
