<template>
	<div class="ppv2-panel">
		<div class="ppv2-header">
			<span class="ppv2-title">{{ title }}</span>
			<span class="ppv2-header-right">
				<button class="ppv2-hdr-btn" title="Export to Sheets" @click="$emit('sheets')">
					<i class="fa fa-table"></i>
				</button>
				<button v-if="showEmail" class="ppv2-hdr-btn" title="Email" @click="$emit('email')">
					<i class="fa fa-envelope"></i>
				</button>
				<button v-if="showSms" class="ppv2-hdr-btn" title="SMS" @click="$emit('sms')">
					<i class="fa fa-comment"></i>
				</button>
				<span class="ppv2-count">{{ rows.length }} / {{ total }} records</span>
				<button class="ppv2-hdr-btn ppv2-close-btn" title="Close" @click="$emit('close')">&times;</button>
			</span>
		</div>

		<div v-if="loading" class="ppv2-loading">Loading…</div>

		<div v-else-if="error" class="ppv2-error">{{ error }}</div>

		<div v-else class="ppv2-body">
			<table class="ppv2-table">
				<thead>
					<tr>
						<th
							v-for="col in columns"
							:key="col.fieldname"
							:style="{ minWidth: '60px' }"
						>
							{{ col.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(row, ri) in rows"
						:key="row.name || ri"
						:class="{ 'ppv2-alt': ri % 2 === 1, 'ppv2-selected': selectedName === row.name }"
						@click="$emit('row-click', row)"
					>
						<td v-for="col in columns" :key="col.fieldname">
							<span
								v-if="col.is_related_link && col.related_doctype"
								class="ppv2-related-link"
								@click.stop="$emit('drill', { doctype: col.related_doctype, linkField: col.related_link_field, rowName: row.name })"
							>{{ cellValue(row, col) }}</span>
							<template v-else>{{ cellValue(row, col) }}</template>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup>
const props = defineProps({
	title: { type: String, default: "" },
	columns: { type: Array, default: () => [] },
	rows: { type: Array, default: () => [] },
	total: { type: Number, default: 0 },
	loading: { type: Boolean, default: false },
	error: { type: String, default: null },
	selectedName: { type: String, default: null },
	showEmail: { type: Boolean, default: false },
	showSms: { type: Boolean, default: false },
});

defineEmits(["row-click", "close", "drill", "sheets", "email", "sms", "tags"]);

function cellValue(row, col) {
	const fn = col.fieldname;
	const v = row[fn] ?? row[fn.toLowerCase()] ?? "";
	if (v === null || v === undefined) return "";
	if (typeof v === "object") return JSON.stringify(v);
	return String(v);
}
</script>

<style scoped>
.ppv2-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.ppv2-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 14px;
	background: #126BC4;
	color: #fff;
	flex-shrink: 0;
}

.ppv2-title {
	font-weight: 600;
	font-size: 14px;
}

.ppv2-header-right {
	display: flex;
	align-items: center;
	gap: 8px;
}

.ppv2-hdr-btn {
	background: none;
	border: none;
	color: #fff;
	font-size: 18px;
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
	opacity: 0.8;
}
.ppv2-hdr-btn:hover { opacity: 1; }

.ppv2-count {
	font-size: 11px;
	opacity: 0.8;
}

.ppv2-loading, .ppv2-error {
	padding: 24px;
	text-align: center;
	font-size: 13px;
}
.ppv2-loading { color: #4198F0; }
.ppv2-error { color: #e53e3e; }

.ppv2-body {
	flex: 1;
	overflow: auto;
}

.ppv2-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
	font-family: Arial, sans-serif;
}

.ppv2-table th {
	position: sticky;
	top: 0;
	background: #E3F0FC;
	color: #105EAD;
	font-weight: 600;
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.3px;
	padding: 6px 8px;
	border-bottom: 2px solid #A2CCF6;
	text-align: left;
	white-space: nowrap;
}

.ppv2-table td {
	padding: 5px 8px;
	border-bottom: 1px solid #eaebec;
	color: #464D53;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 300px;
}

.ppv2-table tbody tr:hover {
	background: #EAF3FD;
	cursor: pointer;
}

.ppv2-alt { background: #f6f8fa; }
.ppv2-selected { background: #D4E8FC !important; }

.ppv2-related-link {
	color: royalblue;
	text-decoration: underline;
	cursor: pointer;
}
.ppv2-related-link:hover {
	color: #1a3fb5;
}
</style>
