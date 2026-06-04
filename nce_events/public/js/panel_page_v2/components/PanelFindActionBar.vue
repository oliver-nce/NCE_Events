<template>
	<div
		class="ppv2-find-actions theme-bg-primary-100 border-b theme-border"
		:class="{ 'ppv2-find-actions--browse': mode === 'browse' }"
		@mousedown.stop
	>
		<template v-if="mode === 'find'">
			<div class="ppv2-find-actions-main">
				<button
					type="button"
					class="ppv2-find-tab-btn ppv2-find-tab-btn--primary theme-bg-primary theme-border-primary font-bold"
					@click="$emit('find-perform')"
				>
					{{ label("Perform Find") }}
				</button>
				<button
					v-if="findMatchActive"
					type="button"
					class="ppv2-find-tab-btn theme-bg-card theme-border theme-rounded-sm"
					:class="{ 'theme-bg-surface': hoveredFindBtn === 'constrain' }"
					@mouseenter="hoveredFindBtn = 'constrain'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-constrain')"
				>
					{{ label("Constrain Found Set") }}
				</button>
				<button
					v-if="findMatchActive"
					type="button"
					class="ppv2-find-tab-btn theme-bg-card theme-border theme-rounded-sm"
					:class="{ 'theme-bg-surface': hoveredFindBtn === 'extend' }"
					@mouseenter="hoveredFindBtn = 'extend'"
					@mouseleave="hoveredFindBtn = null"
					@click="$emit('find-extend')"
				>
					{{ label("Extend Found Set") }}
				</button>
				<button
					type="button"
					class="ppv2-find-tab-btn theme-bg-card theme-border theme-rounded-sm"
					:class="{ 'theme-bg-surface': hoveredFindBtn === 'cancel-find' }"
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
					class="ppv2-find-tab-btn ppv2-find-or-btn theme-bg-card theme-border theme-rounded-sm font-bold"
					:class="{ 'theme-bg-surface': hoveredFindBtn === 'or' }"
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
					class="ppv2-find-tab-btn ppv2-find-or-btn theme-bg-card theme-border theme-rounded-sm font-bold"
					:class="{ 'theme-bg-surface': hoveredFindBtn === 'duplicate' }"
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
				class="ppv2-find-tab-btn theme-bg-card theme-border theme-rounded-sm"
				:class="{ 'theme-bg-surface': hoveredFindBtn === 'new' }"
				@mouseenter="hoveredFindBtn = 'new'"
				@mouseleave="hoveredFindBtn = null"
				@click="$emit('find-new')"
			>
				{{ label("New Find") }}
			</button>
			<button
				type="button"
				class="ppv2-find-tab-btn theme-bg-card theme-border theme-rounded-sm"
				:class="{ 'theme-bg-surface': hoveredFindBtn === 'modify' }"
				@mouseenter="hoveredFindBtn = 'modify'"
				@mouseleave="hoveredFindBtn = null"
				@click="$emit('find-modify')"
			>
				{{ label("Modify Find") }}
			</button>
			<button
				type="button"
				class="ppv2-find-tab-btn theme-bg-card theme-border theme-rounded-sm"
				:class="{ 'theme-bg-surface': hoveredFindBtn === 'exit' }"
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
	font-size: 12px;
	padding: 4px 14px;
	cursor: pointer;
	font-family: inherit;
	white-space: nowrap;
}

.ppv2-find-or-btn {
	min-width: 2.5em;
}

.ppv2-find-or-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
</style>
