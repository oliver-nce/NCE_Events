<template>
	<div class="pp-fmt-editor">
		<div class="pp-fmt-header">
			<div><strong>Field:</strong> {{ fieldName }}</div>
			<button type="button" class="btn btn-xs btn-default" @click="$emit('clear')">Clear</button>
		</div>

		<div class="pp-fmt-section">
			<label class="pp-fmt-label">Condition (SQL):</label>
			<textarea
				v-model="localRule.condition_sql"
				class="pp-fmt-textarea"
				rows="4"
				placeholder="status = 'Cancelled' AND price > 0"
				@input="onRuleChange"
			/>
			<p class="pp-fmt-hint">
				Reference any column. Bare = root; &lt;dt&gt;.&lt;field&gt; = related
			</p>
			<div class="pp-fmt-validate-row">
				<button
					type="button"
					class="btn btn-xs btn-primary"
					:disabled="validating"
					@click="validate"
				>
					Validate
				</button>
				<span v-if="validateOk" class="pp-fmt-ok">✓ Valid</span>
				<span v-if="validateError" class="pp-fmt-err">✗ {{ validateError }}</span>
			</div>
		</div>

		<div class="pp-fmt-section">
			<div class="pp-fmt-label">Styles (any combination):</div>

			<div class="pp-fmt-style-row">
				<label>
					<input v-model="useColor" type="checkbox" @change="onColorToggle" />
					Color
				</label>
				<ColorPicker
					v-if="useColor"
					v-model="localRule.color"
					label="Color"
					@update:model-value="onRuleChange"
				/>
			</div>

			<div class="pp-fmt-style-row">
				<label>
					<input v-model="useWeight" type="checkbox" @change="onWeightToggle" />
					Font Weight
				</label>
				<select
					v-if="useWeight"
					v-model="localRule.font_weight"
					class="pp-fmt-select"
					@change="onRuleChange"
				>
					<option value="200">200</option>
					<option value="300">300</option>
					<option value="400">400</option>
					<option value="500">500</option>
					<option value="600">600</option>
					<option value="700">700</option>
					<option value="800">800</option>
				</select>
			</div>

			<div class="pp-fmt-style-row">
				<label>
					<input v-model="localRule.italic" type="checkbox" :true-value="1" :false-value="0" @change="onRuleChange" />
					Italic
				</label>
			</div>

			<div class="pp-fmt-style-row">
				<label>
					<input
						v-model="localRule.underline"
						type="checkbox"
						:true-value="1"
						:false-value="0"
						@change="onRuleChange"
					/>
					Underline
				</label>
			</div>
		</div>

		<div class="pp-fmt-footer">
			<button type="button" class="btn btn-sm btn-default" @click="$emit('cancel')">Cancel</button>
			<button type="button" class="btn btn-sm btn-primary" :disabled="!canApply" @click="$emit('apply')">
				Apply
			</button>
		</div>
	</div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";

import ColorPicker from "./ColorPicker.vue";

const props = defineProps({
	rootDoctype: { type: String, required: true },
	fieldName: { type: String, required: true },
	rule: { type: Object, required: true },
});

const emit = defineEmits(["update:rule", "validated", "apply", "clear", "cancel"]);

const localRule = reactive({
	condition_sql: "",
	color: "",
	font_weight: "",
	italic: 0,
	underline: 0,
	last_validated_sql: "",
});

const validatedFor = ref("");
const validating = ref(false);
const validateOk = ref(false);
const validateError = ref("");

const useColor = ref(false);
const useWeight = ref(false);

function syncFromProps(rule) {
	localRule.condition_sql = rule.condition_sql || "";
	localRule.color = rule.color || "";
	localRule.font_weight = rule.font_weight || "";
	localRule.italic = rule.italic ? 1 : 0;
	localRule.underline = rule.underline ? 1 : 0;
	localRule.last_validated_sql = rule.last_validated_sql || "";
	useColor.value = !!(localRule.color || "").trim();
	useWeight.value = !!(localRule.font_weight || "").trim();
	if (localRule.last_validated_sql && (localRule.condition_sql || "").trim()) {
		validatedFor.value = (localRule.condition_sql || "").trim();
		validateOk.value = true;
		validateError.value = "";
	} else {
		validatedFor.value = "";
		validateOk.value = false;
	}
}

watch(
	() => props.rule,
	(rule) => syncFromProps(rule || {}),
	{ immediate: true, deep: true }
);

const canApply = computed(() => {
	const current = (localRule.condition_sql || "").trim();
	return !!localRule.last_validated_sql && current === validatedFor.value;
});

function onRuleChange() {
	validateOk.value = false;
	validateError.value = "";
	if ((localRule.condition_sql || "").trim() !== validatedFor.value) {
		localRule.last_validated_sql = "";
	}
	emit("update:rule", { ...localRule });
}

function onColorToggle() {
	if (!useColor.value) {
		localRule.color = "";
		onRuleChange();
	}
}

function onWeightToggle() {
	if (!useWeight.value) {
		localRule.font_weight = "";
		onRuleChange();
	}
}

function validate() {
	const condition_sql = (localRule.condition_sql || "").trim();
	if (!condition_sql) {
		validateOk.value = false;
		validateError.value = "Expression is empty.";
		return;
	}
	validating.value = true;
	validateOk.value = false;
	validateError.value = "";
	frappe.call({
		method: "nce_events.api.panel_api_pkg.format_rules.validate_format_rule",
		args: {
			root_doctype: props.rootDoctype,
			field_name: props.fieldName,
			condition_sql,
		},
		callback(r) {
			validating.value = false;
			const msg = r.message || {};
			if (msg.ok) {
				localRule.last_validated_sql = msg.resolved_sql || "";
				validatedFor.value = condition_sql;
				validateOk.value = true;
				validateError.value = "";
				emit("validated", localRule.last_validated_sql);
				emit("update:rule", { ...localRule });
			} else {
				validateOk.value = false;
				validateError.value = msg.error || "Validation failed.";
			}
		},
		error() {
			validating.value = false;
			validateOk.value = false;
			validateError.value = "Validation request failed.";
		},
	});
}
</script>

<style scoped>
.pp-fmt-editor {
	font-size: 13px;
	color: #36414c;
}

.pp-fmt-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.pp-fmt-section {
	margin-bottom: 14px;
	padding-top: 8px;
	border-top: 1px solid #d1d8dd;
}

.pp-fmt-label {
	display: block;
	font-weight: 600;
	margin-bottom: 6px;
}

.pp-fmt-textarea {
	width: 100%;
	box-sizing: border-box;
	font-family: monospace;
	font-size: 12px;
	padding: 8px;
	border: 1px solid #d1d8dd;
	border-radius: 4px;
	resize: vertical;
}

.pp-fmt-hint {
	margin: 4px 0 8px;
	font-size: 11px;
	color: #8d949a;
}

.pp-fmt-validate-row {
	display: flex;
	align-items: center;
	gap: 10px;
}

.pp-fmt-ok {
	color: #28a745;
	font-size: 12px;
}

.pp-fmt-err {
	color: #e74c3c;
	font-size: 12px;
}

.pp-fmt-style-row {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	margin-bottom: 10px;
}

.pp-fmt-style-row label {
	min-width: 110px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.pp-fmt-select {
	min-width: 90px;
	padding: 4px 6px;
	border: 1px solid #d1d8dd;
	border-radius: 4px;
}

.pp-fmt-footer {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding-top: 8px;
	border-top: 1px solid #d1d8dd;
}
</style>
