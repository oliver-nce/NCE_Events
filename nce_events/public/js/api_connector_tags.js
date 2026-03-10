frappe.ui.form.on("API Connector", {
	refresh(frm) {
		frm.add_custom_button(
			__("Credential Config {0}", [
				'<span class="ml-1 indicator-pill blue">AI</span>',
			]),
			() => _generate_credential_config(frm)
		);
	},
});

function _generate_credential_config(frm) {
	const connector_name = frm.doc.name;
	const auth_type = frm.doc.auth_type || "";
	const base_url = frm.doc.base_url || "";

	if (!connector_name) {
		frappe.msgprint(__("Save the connector first."));
		return;
	}

	const prompt = [
		`You are configuring an API connector for the service "${connector_name}".`,
		`Auth type currently set: "${auth_type}"`,
		`Base URL currently set: "${base_url}"`,
		"",
		"The connector form has these credential fields available:",
		"- api_key (Password field)",
		"- api_secret (Password field)",
		"- username (Data field)",
		"- password (Password field)",
		"",
		`Generate a JSON object that describes which fields the ${connector_name} API actually requires and how they map to its authentication scheme.`,
		"",
		"JSON schema:",
		"{",
		'  "auth_pattern": "<bearer_token | basic_auth | api_key_header | api_key_query | oauth2 | none>",',
		'  "fields": {',
		'    "<field_name>": {',
		'      "required": true | false,',
		'      "label": "<human-readable label for this field>",',
		'      "maps_to": "<what this value is used for in API calls>"',
		"    }",
		"  },",
		'  "base_url": "<correct base URL for this API>",',
		'  "notes": "<brief note on how authentication works for this service>"',
		"}",
		"",
		"Include ALL four credential fields (api_key, api_secret, username, password).",
		"Mark unused ones as required: false with an empty label.",
		"Return ONLY the JSON object. No markdown, no explanation, no code fences.",
	].join("\n");

	frappe.show_alert({
		message: __("Generating credential config…"),
		indicator: "blue",
	});

	frappe.call({
		method: "nce_events.api.llm.llm_send_prompt",
		args: {
			prompt: prompt,
			system_prompt:
				"You are an API integration expert. Return only valid JSON, nothing else.",
			max_tokens: 512,
		},
		callback(r) {
			if (!r.message) {
				frappe.msgprint(__("No response from LLM."));
				return;
			}
			try {
				let text = r.message.trim();
				text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
				const config = JSON.parse(text);
				frm.set_value(
					"credential_config",
					JSON.stringify(config, null, 2)
				);
				frm.dirty();
				frappe.show_alert({
					message: __("Credential config generated."),
					indicator: "green",
				});
			} catch (e) {
				frappe.msgprint({
					title: __("Parse Error"),
					message: __(
						"LLM returned invalid JSON. Raw response:<br><pre>{0}</pre>",
						[frappe.utils.escape_html(r.message)]
					),
					indicator: "red",
				});
			}
		},
		error() {
			frappe.msgprint(
				__("Failed to call LLM. Check Anthropic API Connector.")
			);
		},
	});
}
