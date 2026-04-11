<template>
	<div class="ppv2-fd-footer">
		<div class="ppv2-fd-custom-buttons">
			<button
				v-for="(btn, bi) in buttons"
				:key="'fd-btn-' + bi + '-' + (btn.label || bi)"
				type="button"
				class="ppv2-fd-tab-btn"
				@click="$emit('custom-button', btn)"
			>
				{{ btn.label }}
			</button>
		</div>

		<div class="ppv2-fd-action-buttons">
			<button type="button" class="ppv2-fd-tab-btn" @click="$emit('cancel')">Cancel</button>
			<button
				type="button"
				class="ppv2-fd-tab-btn"
				:disabled="saving || !isDirty"
				@click="$emit('revert')"
			>
				Revert
			</button>
			<button
				type="button"
				class="ppv2-fd-tab-btn ppv2-fd-tab-active"
				:disabled="saving"
				@click="$emit('submit')"
			>
				{{ saving ? "Saving…" : "Submit" }}
			</button>
		</div>
	</div>
</template>

<script setup>
defineProps({
	buttons: { type: Array, default: () => [] },
	saving: { type: Boolean, default: false },
	isDirty: { type: Boolean, default: false },
});

defineEmits(["cancel", "revert", "submit", "custom-button"]);
</script>

<style scoped>
.ppv2-fd-footer {
	flex-shrink: 0;
	padding: 10px 16px;
	border-top: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}
.ppv2-fd-custom-buttons {
	display: flex;
	gap: 4px;
}
.ppv2-fd-action-buttons {
	display: flex;
	gap: 6px;
	margin-left: auto;
}
.ppv2-fd-tab-btn {
	padding: 6px 14px;
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	color: var(--text-color);
	font-size: var(--font-size-base, 14px);
	font-weight: var(--font-weight-bold, 600);
	cursor: pointer;
}
.ppv2-fd-tab-active {
	background: var(--bg-header);
	color: var(--text-header);
	border-color: var(--bg-header);
}
.ppv2-fd-action-buttons .ppv2-fd-tab-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
