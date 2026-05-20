<template>
	<div class="ppv2-header-right" @mousedown.stop>
		<!-- Find mode: search actions -->
		<template v-if="mode === 'find'">
			<div class="ppv2-header-controls ppv2-find-toolbar">
				<button
					type="button"
					class="ppv2-find-tab-btn ppv2-find-tab-btn--active"
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
				<span class="ppv2-count">— / {{ total }} records</span>
				<button
					v-if="showClose"
					class="ppv2-hdr-btn ppv2-close-btn"
					title="Close"
					@click="$emit('close')"
				>
					&times;
				</button>
			</div>
		</template>

		<!-- Browse mode: found set + normal panel actions -->
		<template v-else-if="mode === 'browse'">
			<div class="ppv2-header-controls ppv2-find-toolbar">
				<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-new')">
					{{ label("New Find") }}
				</button>
				<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-modify')">
					{{ label("Modify Find") }}
				</button>
				<button type="button" class="ppv2-find-tab-btn" @click="$emit('find-exit')">
					{{ label("Cancel") }}
				</button>
			</div>
			<div class="ppv2-header-controls">
				<button
					class="ppv2-hdr-btn"
					:class="{ 'ppv2-hdr-btn--refreshing': loading }"
					title="Refresh"
					@click="$emit('refresh')"
				>
					<i class="fa fa-refresh"></i>
				</button>
				<button class="ppv2-hdr-btn" title="Filter" @click="$emit('toggle-filter')">
					<i class="fa fa-filter"></i>
				</button>
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
					v-if="showEmail"
					class="ppv2-hdr-btn"
					title="Email"
					@click="$emit('email')"
				>
					<i class="fa fa-envelope"></i>
				</button>
				<button v-if="showSms" class="ppv2-hdr-btn" title="SMS" @click="$emit('sms')">
					<i class="fa fa-comment"></i>
				</button>
				<span class="ppv2-count">{{ rowCount }} / {{ total }} records</span>
				<button
					v-if="showClose"
					class="ppv2-hdr-btn ppv2-close-btn"
					title="Close"
					@click="$emit('close')"
				>
					&times;
				</button>
			</div>
		</template>
	</div>
</template>

<script setup>
defineProps({
	mode: { type: String, required: true },
	rowCount: { type: Number, default: 0 },
	total: { type: Number, default: 0 },
	findMatchActive: { type: Boolean, default: false },
	loading: { type: Boolean, default: false },
	showEmail: { type: Boolean, default: false },
	showSms: { type: Boolean, default: false },
	showClose: { type: Boolean, default: false },
});

defineEmits([
	"find-perform",
	"find-constrain",
	"find-extend",
	"find-cancel-criteria",
	"find-new",
	"find-modify",
	"find-exit",
	"refresh",
	"toggle-filter",
	"sheets",
	"download-csv",
	"email",
	"sms",
	"close",
]);

function label(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}
</script>

<style scoped>
.ppv2-find-toolbar {
	flex-wrap: wrap;
	gap: 4px;
	margin-right: 8px;
}

.ppv2-find-tab-btn {
	font-size: 11px;
	padding: 4px 10px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	border-radius: var(--border-radius-sm);
	background: rgba(255, 255, 255, 0.12);
	color: var(--text-header);
	cursor: pointer;
	font-family: inherit;
	white-space: nowrap;
}

.ppv2-find-tab-btn:hover {
	background: rgba(255, 255, 255, 0.22);
}

.ppv2-find-tab-btn--active {
	background: #fff;
	color: var(--bg-header);
	border-color: #fff;
	font-weight: var(--font-weight-bold);
}
</style>
