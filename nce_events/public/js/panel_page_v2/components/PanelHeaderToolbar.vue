<template>
	<div class="ppv2-header-right" @mousedown.stop>
		<span v-if="props.showClickHint" class="ppv2-click-hint" :class="hintFgTextClass"
			>Click row for details · Ctrl-click to remove</span
		>
		<div class="ppv2-header-controls">
			<template v-if="!props.findHeaderMinimal">
				<button
					v-if="props.showNewRecord"
					type="button"
					class="ppv2-hdr-btn ppv2-hdr-btn--new"
					title="New record"
					@click="$emit('new-record')"
				>
					+
				</button>
				<button
					class="ppv2-hdr-btn"
					:class="{
						'ppv2-hdr-btn--refreshing': props.loading,
						'theme-text-secondary': props.loading,
					}"
					title="Refresh"
					@click="$emit('refresh')"
				>
					<i class="fa fa-refresh"></i>
				</button>
				<button class="ppv2-hdr-btn" title="Filter" @click="$emit('toggle-filter')">
					<i class="fa fa-filter"></i>
				</button>
			</template>
			<button
				v-if="props.showFind && !props.findHeaderMinimal"
				class="ppv2-hdr-btn"
				title="Find records"
				@click="$emit('find')"
			>
				<i class="fa fa-search"></i>
			</button>
			<template v-if="!props.findHeaderMinimal">
				<button
					class="ppv2-hdr-btn"
					title="Export to Google Sheets (filtered view)"
					@click="$emit('sheets')"
				>
					<i class="fa fa-table"></i>
				</button>
				<button
					class="ppv2-hdr-btn"
					title="Download CSV (Excel, filtered view)"
					@click="$emit('download-csv')"
				>
					<i class="fa fa-file-excel-o" aria-hidden="true"></i>
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
			</template>
			<span class="ppv2-count theme-text-sm"
				>{{ displayRowCount }} / {{ props.total }} records</span
			>
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
import { computed } from "vue";
import { panelChromeBg, panelChromeFgTextClass } from "../utils/panelChromeClasses.js";

const props = defineProps({
	title: { type: String, default: "" },
	loading: { type: Boolean, default: false },
	showClickHint: { type: Boolean, default: false },
	rowCount: { type: Number, default: 0 },
	total: { type: Number, default: 0 },
	showEmail: { type: Boolean, default: false },
	showSms: { type: Boolean, default: false },
	showNewRecord: { type: Boolean, default: false },
	showClose: { type: Boolean, default: false },
	showFind: { type: Boolean, default: false },
	/** Find criteria mode: header shows only count + close. */
	findHeaderMinimal: { type: Boolean, default: false },
	rowCountLabel: { type: [Number, String], default: undefined },
	/** Page Panel chrome config — used for click-hint tonal fg. */
	chromeConfig: { type: Object, default: null },
});

const hintFgTextClass = computed(() =>
	panelChromeFgTextClass(props.chromeConfig, "header_bg_class")
);

const displayRowCount = computed(() => {
	const v = props.rowCountLabel;
	if (v !== undefined && v !== null && v !== "") return v;
	return props.rowCount;
});

defineEmits([
	"refresh",
	"toggle-filter",
	"sheets",
	"download-csv",
	"email",
	"sms",
	"new-record",
	"find",
	"close",
]);
</script>
