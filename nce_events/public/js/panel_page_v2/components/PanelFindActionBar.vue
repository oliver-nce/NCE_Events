<template>
	<div class="ppv2-find-actions" :class="{ 'ppv2-find-actions--browse': mode === 'browse' }" @mousedown.stop>
		<template v-if="mode === 'find'">
			<button
				type="button"
				class="ppv2-find-tab-btn ppv2-find-tab-btn--primary"
				@click="$emit('find-perform')"
			>
				{{ label("Perform Find") }}
			</button>
			<button
				v-if="findMatchActive"
				type="button"
				class="ppv2-find-tab-btn"
				@click="$emit('find-constrain')"
			>
				{{ label("Constrain Found Set") }}
			</button>
			<button
				v-if="findMatchActive"
				type="button"
				class="ppv2-find-tab-btn"
				@click="$emit('find-extend')"
			>
				{{ label("Extend Found Set") }}
			</button>
			<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-cancel-criteria')">
				{{ label("Cancel Find") }}
			</button>
		</template>
		<template v-else-if="mode === 'browse'">
			<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-new')">
				{{ label("New Find") }}
			</button>
			<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-modify')">
				{{ label("Modify Find") }}
			</button>
			<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-exit')">
				{{ label("Cancel") }}
			</button>
		</template>
	</div>
</template>

<script setup>
defineProps({
	mode: { type: String, required: true },
	findMatchActive: { type: Boolean, default: false },
});

defineEmits([
	"find-perform",
	"find-constrain",
	"find-extend",
	"find-cancel-criteria",
	"find-new",
	"find-modify",
	"find-exit",
]);

function label(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}
</script>

<style scoped>
.ppv2-find-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 6px 10px;
	background: var(--primary-light);
	border-bottom: 1px solid var(--border-color);
	flex-shrink: 0;
}

.ppv2-find-actions--browse {
	border-bottom: 1px dashed var(--border-color);
}

.ppv2-find-tab-btn {
	font-size: 12px;
	padding: 4px 14px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	background: var(--bg-card);
	color: var(--text-color);
	cursor: pointer;
	font-family: inherit;
	white-space: nowrap;
}

.ppv2-find-tab-btn:hover {
	background: var(--bg-surface);
}

.ppv2-find-tab-btn--primary {
	background: var(--bg-header);
	color: var(--text-header);
	border-color: var(--bg-header);
	font-weight: var(--font-weight-bold);
}
</style>
