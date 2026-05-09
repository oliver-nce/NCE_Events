<template>
	<div
		class="ppv2-form-dialog-backdrop"
		style="z-index: 1060"
		@mousedown.self="$emit('close')"
	>
		<div class="ppv2-form-dialog ppv2-fd-size-md" @mousedown.stop @click.stop>
			<PanelFormDialogHeader title="New Woo Commerce Product" @close="$emit('close')" />
			<div class="ppv2-nwp-body">
				<div class="ppv2-fd-field">
					<label class="ppv2-fd-label">Event Name<span class="ppv2-fd-reqd"> *</span></label>
					<input
						id="nwp-event-name"
						v-model="form.event_name"
						type="text"
						class="ppv2-fd-input"
						autocomplete="off"
					/>
				</div>
				<div class="ppv2-fd-field">
					<label class="ppv2-fd-label">Type<span class="ppv2-fd-reqd"> *</span></label>
					<PanelFormLinkField
						:field="typeIdFieldDef"
						:model-value="form.type_id"
						@change="onTypeIdChange"
					/>
				</div>
				<div class="ppv2-fd-field">
					<label class="ppv2-fd-label">Price<span class="ppv2-fd-reqd"> *</span></label>
					<input
						id="nwp-price"
						v-model="form.price"
						type="text"
						inputmode="decimal"
						class="ppv2-fd-input"
						autocomplete="off"
					/>
				</div>
				<div class="ppv2-fd-field">
					<label class="ppv2-fd-label">Start Date<span class="ppv2-fd-reqd"> *</span></label>
					<PanelFormDateTimeField
						:field="startDateFieldDef"
						:model-value="form.start_date"
						@change="onStartDateChange"
					/>
				</div>
				<div v-if="validationError" class="ppv2-nwp-err">{{ validationError }}</div>
			</div>
			<div class="ppv2-nwp-footer">
				<button type="button" class="ppv2-nwp-btn ppv2-nwp-btn--ghost" @click="$emit('close')">
					Cancel
				</button>
				<button
					type="button"
					class="ppv2-nwp-btn ppv2-nwp-btn--primary"
					:disabled="publishing"
					@click="onPublish"
				>
					{{ publishing ? __("Publishing…") : __("Publish to WooCommerce") }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { reactive, ref } from "vue";
import PanelFormDialogHeader from "./PanelFormDialogHeader.vue";
import PanelFormLinkField from "./PanelFormLinkField.vue";
import PanelFormDateTimeField from "./PanelFormDateTimeField.vue";

const emit = defineEmits(["close"]);

const typeIdFieldDef = {
	fieldname: "type_id",
	fieldtype: "Link",
	options: "Event Types",
};

const startDateFieldDef = {
	fieldname: "start_date",
	fieldtype: "Date",
};

const form = reactive({
	event_name: "",
	type_id: "",
	price: "",
	start_date: "",
});

const publishing = ref(false);
const validationError = ref("");

function onTypeIdChange({ value }) {
	form.type_id = value ?? "";
}

function onStartDateChange(value) {
	form.start_date = value ?? "";
}

function validateClient() {
	const labels = [];
	if (!String(form.event_name ?? "").trim()) labels.push(__("Event Name"));
	if (!String(form.type_id ?? "").trim()) labels.push(__("Type"));
	if (form.price === "" || form.price === null || String(form.price).trim() === "") {
		labels.push(__("Price"));
	}
	if (!String(form.start_date ?? "").trim()) labels.push(__("Start Date"));
	if (labels.length) {
		return `${__("Please fill all required fields:")} ${labels.join(", ")}`;
	}
	return "";
}

function onPublish() {
	validationError.value = "";
	const err = validateClient();
	if (err) {
		validationError.value = err;
		return;
	}
	publishing.value = true;
	const doc = {
		doctype: "New Woo Commerce Product",
		event_name: String(form.event_name).trim(),
		type_id: String(form.type_id).trim(),
		price: form.price,
		start_date: form.start_date,
	};
	frappe.call({
		method: "nce_events.api.events_publish.publish_new_woo_commerce_product",
		args: { doc },
		freeze: true,
		freeze_message: __("Publishing to WooCommerce…"),
		callback(r) {
			if (!r.message?.ok) {
				publishing.value = false;
				return;
			}
			const wp_id = r.message.wp_id;
			frappe.call({
				method: "nce_events.api.events_publish.clear_new_woo_commerce_product",
				callback() {
					publishing.value = false;
					emit("close");
					frappe.msgprint({
						title: __("Published"),
						message: `<p>${__("Product ID")} <strong>${frappe.utils.escape_html(
							String(wp_id),
						)}</strong> ${__("created in Woo Commerce")}</p><p>${__(
							"It will appear in the Events panel in a few minutes",
						)}</p>`,
						indicator: "green",
					});
				},
				error() {
					publishing.value = false;
					emit("close");
					frappe.msgprint({
						title: __("Published"),
						message: __(
							"Product was created but clearing the form failed — open the Desk form if needed.",
						),
						indicator: "orange",
					});
				},
			});
		},
		error() {
			publishing.value = false;
		},
	});
}
</script>

<style scoped>
.ppv2-form-dialog-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
}
.ppv2-form-dialog {
	background: var(--bg-card);
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
	display: flex;
	flex-direction: column;
	max-height: 90vh;
	overflow: hidden;
	border: 1px solid var(--border-color);
}
.ppv2-fd-size-md {
	width: min(540px, 94vw);
}
.ppv2-nwp-body {
	padding: 14px 16px;
	overflow-y: auto;
	flex: 1;
}
.ppv2-fd-field {
	margin-bottom: 12px;
	overflow: visible;
	position: relative;
}
.ppv2-fd-label {
	display: block;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-bold);
	color: var(--text-color);
	margin-bottom: 4px;
}
.ppv2-fd-reqd {
	color: #c0392b;
	font-weight: 700;
}
.ppv2-fd-input {
	width: 100%;
	padding: 5px 8px;
	font-size: var(--font-size-base);
	font-family: var(--font-family);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm, 4px);
	background: var(--bg-card);
	color: var(--text-color);
	box-sizing: border-box;
}
.ppv2-fd-input:focus {
	outline: none;
	border-color: var(--primary);
	box-shadow: 0 0 0 1px var(--primary-light);
}
.ppv2-nwp-err {
	font-size: var(--font-size-sm);
	color: #c0392b;
	margin-top: 4px;
}
.ppv2-nwp-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	flex-wrap: wrap;
	padding: 12px 16px;
	border-top: 1px solid var(--border-color);
	background: var(--bg-surface);
	flex-shrink: 0;
}
.ppv2-nwp-btn {
	padding: 8px 14px;
	border-radius: var(--border-radius-sm, 4px);
	font-size: var(--font-size-sm);
	font-weight: 600;
	cursor: pointer;
	border: 1px solid var(--border-color);
	font-family: var(--font-family);
}
.ppv2-nwp-btn:disabled {
	opacity: 0.65;
	cursor: not-allowed;
}
.ppv2-nwp-btn--ghost {
	background: var(--bg-card);
	color: var(--text-color);
}
.ppv2-nwp-btn--primary {
	background: var(--primary);
	color: var(--text-on-primary, #fff);
	border-color: var(--primary);
}
.ppv2-nwp-btn--primary:hover:not(:disabled) {
	filter: brightness(1.05);
}
</style>
