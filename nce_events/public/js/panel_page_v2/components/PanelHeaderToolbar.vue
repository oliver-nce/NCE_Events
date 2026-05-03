<template>
	<div class="ppv2-header-right" @mousedown.stop>
		<span v-if="props.showClickHint" class="ppv2-click-hint"
			>Click row for details · Ctrl-click to remove</span
		>
		<div class="ppv2-header-controls">
			<button
				class="ppv2-hdr-btn"
				:class="{ 'ppv2-hdr-btn--refreshing': props.loading }"
				title="Refresh"
				@click="$emit('refresh')"
			>
				<i class="fa fa-refresh"></i>
			</button>
			<button class="ppv2-hdr-btn" title="Filter" @click="$emit('toggle-filter')">
				<i class="fa fa-filter"></i>
			</button>
			<button class="ppv2-hdr-btn" title="Export to Sheets" @click="$emit('sheets')">
				<i class="fa fa-table"></i>
			</button>
			<button
				v-if="props.showEmail"
				class="ppv2-hdr-btn"
				title="Email"
				@click="$emit('email')"
			>
				<i class="fa fa-envelope"></i>
			</button>
			<button v-if="props.showSms" class="ppv2-hdr-btn" title="SMS" @click="$emit('sms')">
				<i class="fa fa-comment"></i>
			</button>
			<span class="ppv2-count">{{ props.rowCount }} / {{ props.total }} records</span>
			<button
				v-if="props.showClose"
				class="ppv2-hdr-btn ppv2-close-btn"
				title="Close"
				@click="$emit('close')"
			>
				&times;
			</button>
		</div>
	</div>
</template>

<script setup>
defineProps({
	title: { type: String, default: "" },
	loading: { type: Boolean, default: false },
	showClickHint: { type: Boolean, default: false },
	rowCount: { type: Number, default: 0 },
	total: { type: Number, default: 0 },
	showEmail: { type: Boolean, default: false },
	showSms: { type: Boolean, default: false },
	showClose: { type: Boolean, default: false },
});

defineEmits(["refresh", "toggle-filter", "sheets", "email", "sms", "close"]);
</script>
