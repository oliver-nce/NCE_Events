frappe.provide("nce_events.panel_page");

/**
 * Shared AI writing tools for SMS and Email dialogs.
 * Provides: Clear, Undo (4 levels), Spelling & Grammar, Mild Rewrite, Full Rewrite.
 *
 * Usage: nce_events.panel_page.ai_tools.attach(dialog)
 *   dialog must implement: _ai_get_body(), _ai_set_body(html_or_text), _ai_is_html()
 */
nce_events.panel_page.ai_tools = {

	MAX_UNDO: 4,

	SYSTEM_SPELLING: [
		"You are a proofreading assistant.",
		"Fix only spelling and grammar errors. Do not change meaning, tone, structure, or wording beyond correcting errors.",
		"CRITICAL: Preserve all Jinja2 template tags exactly as-is. These look like {{ ... }}, {% ... %}, {%- ... -%}. Do not modify, remove, or reformat them in any way.",
		"CRITICAL: Preserve all URLs and links exactly as-is. Do not modify hrefs or link text.",
		"CRITICAL: Preserve all images (<img> tags) exactly as-is, including their src, alt, style, and all other attributes. Do not remove, reorder, or modify images.",
		"Return ONLY the corrected text. No explanations, no preamble.",
	].join("\n"),

	SYSTEM_MILD: [
		"You are a writing assistant.",
		"Improve the organization and paragraphing of this message for readability. Fix any spelling or grammar errors you find.",
		"Do NOT attempt a full rewrite. Keep the original voice, content, and tone. Only restructure for clarity.",
		"CRITICAL: Preserve all Jinja2 template tags exactly as-is. These look like {{ ... }}, {% ... %}, {%- ... -%}. Do not modify, remove, or reformat them in any way.",
		"CRITICAL: Preserve all URLs and links exactly as-is. Do not modify hrefs or link text.",
		"CRITICAL: Preserve all images (<img> tags) exactly as-is, including their src, alt, style, and all other attributes. Do not remove, reorder, or modify images. Write text that flows naturally around any images present.",
		"Return ONLY the improved text. No explanations, no preamble.",
	].join("\n"),

	SYSTEM_FULL: [
		"You are a writing assistant.",
		"Fully rewrite this message in a friendly, casual style. Make it engaging and easy to read.",
		"CRITICAL: Preserve all Jinja2 template tags exactly as-is. These look like {{ ... }}, {% ... %}, {%- ... -%}. Do not modify, remove, or reformat them in any way.",
		"For raw URLs that are not already wrapped in a link, convert them to a descriptive inline link if you can infer the purpose (e.g. 'Click here to register'). If you cannot infer the purpose, keep the URL as-is.",
		"For URLs already in <a> tags, preserve them as-is.",
		"CRITICAL: Preserve all images (<img> tags) exactly as-is, including their src, alt, style, and all other attributes. Do not remove, reorder, or modify images. Write text that flows naturally around any images present, referencing them where appropriate.",
		"Return ONLY the rewritten text. No explanations, no preamble.",
	].join("\n"),

	build_bar_html() {
		return `<div class="send-ai-bar">
			<button class="btn btn-xs btn-default send-ai-btn send-ai-clear" title="Clear message">Clear</button>
			<button class="btn btn-xs btn-default send-ai-btn send-ai-undo" title="Undo last AI change" disabled>↩ Undo</button>
			<button class="btn btn-xs btn-default send-ai-btn send-ai-spelling" title="Fix spelling and grammar">✓ Spelling &amp; Grammar</button>
			<button class="btn btn-xs btn-default send-ai-btn send-ai-mild" title="Improve organization and readability">≈ Mild Rewrite</button>
			<button class="btn btn-xs btn-default send-ai-btn send-ai-full" title="Full friendly casual rewrite">✦ Full Rewrite</button>
		</div>`;
	},

	attach(dialog) {
		const me = this;
		dialog._ai_history = [];

		const bar = dialog.el.find(".send-ai-bar");
		if (!bar.length) return;

		bar.on("click", ".send-ai-clear", function () { me._do_clear(dialog); });
		bar.on("click", ".send-ai-undo", function () { me._do_undo(dialog); });
		bar.on("click", ".send-ai-spelling", function () { me._do_ai(dialog, "spelling"); });
		bar.on("click", ".send-ai-mild", function () { me._do_ai(dialog, "mild"); });
		bar.on("click", ".send-ai-full", function () { me._do_ai(dialog, "full"); });
	},

	_push_history(dialog, body) {
		dialog._ai_history.push(body);
		if (dialog._ai_history.length > this.MAX_UNDO) {
			dialog._ai_history.shift();
		}
		dialog.el.find(".send-ai-undo").prop("disabled", false);
	},

	_do_clear(dialog) {
		const current = dialog._ai_get_body();
		if (current && String(current).trim()) {
			this._push_history(dialog, current);
		}
		dialog._ai_set_body("");
	},

	_do_undo(dialog) {
		if (!dialog._ai_history || !dialog._ai_history.length) return;
		const prev = dialog._ai_history.pop();
		dialog._ai_set_body(prev);
		dialog.el.find(".send-ai-undo").prop("disabled", !dialog._ai_history.length);
	},

	_do_ai(dialog, mode) {
		const me = this;
		const body = dialog._ai_get_body();
		if (!body || !String(body).trim()) {
			frappe.msgprint(__("Enter a message first."));
			return;
		}

		let system_prompt;
		if (mode === "spelling") system_prompt = me.SYSTEM_SPELLING;
		else if (mode === "mild") system_prompt = me.SYSTEM_MILD;
		else system_prompt = me.SYSTEM_FULL;

		const is_html = dialog._ai_is_html();
		let prompt = body;
		if (is_html) {
			prompt = "The following message is HTML. Preserve the HTML structure and formatting.\n\n" + body;
		}

		me._push_history(dialog, body);
		me._set_bar_busy(dialog, true, mode);

		frappe.call({
			method: "nce_events.api.llm.llm_send_prompt",
			args: {
				prompt: prompt,
				system_prompt: system_prompt,
				max_tokens: 2048,
			},
			callback: function (r) {
				me._set_bar_busy(dialog, false, mode);
				if (r.message) {
					dialog._ai_set_body(r.message);
				}
			},
			error: function () {
				me._set_bar_busy(dialog, false, mode);
			},
		});
	},

	_set_bar_busy(dialog, busy, mode) {
		const bar = dialog.el.find(".send-ai-bar");
		const btns = bar.find(".send-ai-btn");
		if (busy) {
			btns.prop("disabled", true);
			let sel = ".send-ai-spelling";
			if (mode === "mild") sel = ".send-ai-mild";
			else if (mode === "full") sel = ".send-ai-full";
			bar.find(sel).text("Working...");
		} else {
			btns.prop("disabled", false);
			bar.find(".send-ai-spelling").html("✓ Spelling &amp; Grammar");
			bar.find(".send-ai-mild").html("≈ Mild Rewrite");
			bar.find(".send-ai-full").html("✦ Full Rewrite");
			bar.find(".send-ai-undo").prop("disabled", !dialog._ai_history || !dialog._ai_history.length);
		}
	},
};
