# Phase B — Coding Instructions

You are implementing Phase B of the Panel Form Dialog feature. This phase adds the "Dialogs" tab to the Page Panel Desk form. No Vue/frontend work.

**Prerequisite:** Phase A must be complete (DocTypes `Form Dialog` and `Form Dialog Button` exist, `form_dialog` Link field on `Page Panel` exists, `form_dialog_api.py` exists).

Read these instructions completely before writing any code.

---

## Context

You are editing ONE file: `nce_events/nce_events/doctype/page_panel/page_panel.js`

This file already has a custom tab bar with three tabs: Config, Display, Query. You are adding a fourth tab: **Dialogs**.

---

## Existing Pattern (DO NOT modify — for reference only)

The file uses three constants at the top to define tabs:

```javascript
const TAB_GROUPS = {
    config: [ /* list of fieldnames shown in Config tab */ ],
    display: [],
    query: ["panel_sql"],
};
const TAB_ORDER = ["config", "display", "query"];
const TAB_LABELS = { config: "Config", display: "Display", query: "Query" };
```

The function `_ensure_tab_bar(frm)` builds the tab button HTML and inserts it above the form fields. It also creates a `<div class="pp-matrix-wrap">` container used by the Display tab.

The function `_show_tab(frm, tab_id)` hides all form fields, then shows the fields listed in `TAB_GROUPS[tab_id]`. It also toggles `.pp-matrix-wrap` visibility for the Display tab.

When a tab button is clicked, `_show_tab` is called, and if the tab is `display` then `_render_display(frm)` is called, if `query` then `_refresh_query_tab(frm)` is called.

---

## Changes Required

### Change 1: Update `TAB_GROUPS`

On line 21, add the `dialogs` key. The existing keys must not change.

**Before:**
```javascript
const TAB_GROUPS = {
	config: [
		"root_doctype",
		"header_text",
		// ... existing fields ...
		"open_card_on_click",
	],
	display: [],
	query: ["panel_sql"],
};
```

**After:**
```javascript
const TAB_GROUPS = {
	config: [
		"root_doctype",
		"header_text",
		// ... existing fields (do not change) ...
		"open_card_on_click",
	],
	display: [],
	query: ["panel_sql"],
	dialogs: [],
};
```

### Change 2: Update `TAB_ORDER`

On line 45.

**Before:**
```javascript
const TAB_ORDER = ["config", "display", "query"];
```

**After:**
```javascript
const TAB_ORDER = ["config", "display", "query", "dialogs"];
```

### Change 3: Update `TAB_LABELS`

On line 46.

**Before:**
```javascript
const TAB_LABELS = { config: "Config", display: "Display", query: "Query" };
```

**After:**
```javascript
const TAB_LABELS = { config: "Config", display: "Display", query: "Query", dialogs: "Dialogs" };
```

### Change 4: Update `_show_tab` to toggle `.pp-dialogs-wrap`

In the `_show_tab` function (line 62), after the line that toggles `.pp-matrix-wrap`, add a line to toggle `.pp-dialogs-wrap`:

**Find this line (line 76):**
```javascript
	$wrap.find(".pp-matrix-wrap").toggle(tab_id === "display");
```

**Add immediately after it:**
```javascript
	$wrap.find(".pp-dialogs-wrap").toggle(tab_id === "dialogs");
```

### Change 5: Update `_ensure_tab_bar` to create the dialogs container

In the `_ensure_tab_bar` function (line 87), after the line that creates `$matrix_wrap`, create `$dialogs_wrap`:

**Find these lines (lines 101-103):**
```javascript
	const $matrix_wrap = $(
		'<div class="pp-matrix-wrap" style="display:none;padding-bottom:8px;"></div>',
	);
```

**Add immediately after:**
```javascript
	const $dialogs_wrap = $(
		'<div class="pp-dialogs-wrap" style="display:none;padding-bottom:8px;"></div>',
	);
```

**Then find this line (line 105):**
```javascript
	$(first_fd.$wrapper).before($tab_bar).before($matrix_wrap);
```

**Replace with:**
```javascript
	$(first_fd.$wrapper).before($tab_bar).before($matrix_wrap).before($dialogs_wrap);
```

### Change 6: Update tab click handler to call `_render_dialogs_tab`

**Find these lines (lines 107-112):**
```javascript
	$tab_bar.on("click", ".pp-tab-btn", function () {
		const tab_id = $(this).data("tab");
		_show_tab(frm, tab_id);
		if (tab_id === "display") _render_display(frm);
		if (tab_id === "query") _refresh_query_tab(frm);
	});
```

**Replace with:**
```javascript
	$tab_bar.on("click", ".pp-tab-btn", function () {
		const tab_id = $(this).data("tab");
		_show_tab(frm, tab_id);
		if (tab_id === "display") _render_display(frm);
		if (tab_id === "query") _refresh_query_tab(frm);
		if (tab_id === "dialogs") _render_dialogs_tab(frm);
	});
```

### Change 7: Add the `_render_dialogs_tab` function

Add this function BEFORE the `frappe.ui.form.on("Page Panel", {` block (which is at line 1006). Place it after all other helper functions.

```javascript
// ── Dialogs tab ───────────────────────────────────────────────────────────────

function _render_dialogs_tab(frm) {
	const $container = $(frm.layout.wrapper).find(".pp-dialogs-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html(
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>',
		);
		return;
	}

	$container.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">Loading dialogs…</p>');

	frappe.call({
		method: "nce_events.api.form_dialog_api.list_form_dialogs_for_doctype",
		args: { doctype: frm.doc.root_doctype },
		callback: function (r) {
			const dialogs = (r && r.message) || [];
			_build_dialogs_tab_html(frm, $container, dialogs);
		},
		error: function () {
			$container.html(
				'<p style="color:#c0392b;font-size:12px;padding:8px 0;">Failed to load dialogs.</p>',
			);
		},
	});
}

function _build_dialogs_tab_html(frm, $container, dialogs) {
	$container.empty();

	const current = frm.doc.form_dialog || "";
	const doctype = frm.doc.root_doctype;

	// ── Current selection ──
	let current_html = "";
	if (current) {
		current_html = `
			<div style="margin-bottom:12px;padding:8px 12px;background:#f4f5f6;border-radius:4px;font-size:12px;">
				<strong>Active dialog:</strong> ${frappe.utils.escape_html(current)}
				<button class="btn btn-xs btn-default pp-dialog-rebuild" style="margin-left:8px;">Rebuild</button>
				<button class="btn btn-xs btn-default pp-dialog-open" style="margin-left:4px;">Open in full form</button>
			</div>`;
	} else {
		current_html = `
			<div style="margin-bottom:12px;padding:8px 12px;background:#fef9e7;border-radius:4px;font-size:12px;">
				No dialog linked to this panel. Create or select one below.
			</div>`;
	}

	// ── List of existing dialogs ──
	let list_html = "";
	if (dialogs.length) {
		list_html = `<table style="width:100%;font-size:12px;border-collapse:collapse;">
			<thead>
				<tr style="border-bottom:1px solid #d1d8dd;text-align:left;">
					<th style="padding:4px 8px;">Title</th>
					<th style="padding:4px 8px;">Size</th>
					<th style="padding:4px 8px;">Captured</th>
					<th style="padding:4px 8px;"></th>
				</tr>
			</thead>
			<tbody>`;
		dialogs.forEach(function (d) {
			const is_current = d.name === current;
			const row_bg = is_current ? "background:#e8f5e9;" : "";
			list_html += `<tr style="border-bottom:1px solid #ededed;${row_bg}">
				<td style="padding:4px 8px;">${frappe.utils.escape_html(d.title)}</td>
				<td style="padding:4px 8px;">${frappe.utils.escape_html(d.dialog_size || "xl")}</td>
				<td style="padding:4px 8px;">${d.captured_at ? frappe.datetime.str_to_user(d.captured_at) : "—"}</td>
				<td style="padding:4px 8px;">
					${is_current ? '<span style="color:#27ae60;font-weight:600;">Active</span>' : '<button class="btn btn-xs btn-default pp-dialog-select" data-name="' + frappe.utils.escape_html(d.name) + '">Set as active</button>'}
				</td>
			</tr>`;
		});
		list_html += `</tbody></table>`;
	} else {
		list_html = `<p style="color:#8d949a;font-size:12px;">No Form Dialogs exist for <strong>${frappe.utils.escape_html(doctype)}</strong> yet.</p>`;
	}

	// ── Create button ──
	const create_html = `
		<div style="margin-top:12px;">
			<button class="btn btn-xs btn-primary pp-dialog-create">Create &amp; capture from Desk</button>
		</div>`;

	$container.html(current_html + list_html + create_html);

	// ── Event handlers ──

	$container.on("click", ".pp-dialog-create", function () {
		frappe.prompt(
			{ label: "Dialog title", fieldname: "title", fieldtype: "Data", reqd: 1, default: doctype + " — dialog" },
			function (values) {
				frappe.call({
					method: "nce_events.api.form_dialog_api.capture_form_dialog_from_desk",
					args: { doctype: doctype, title: values.title },
					freeze: true,
					freeze_message: "Capturing schema from Desk…",
					callback: function (r) {
						if (r && r.message) {
							frm.set_value("form_dialog", r.message);
							frm.dirty();
							frm.save().then(function () {
								_render_dialogs_tab(frm);
							});
							frappe.show_alert({ message: "Dialog captured: " + r.message, indicator: "green" });
						}
					},
				});
			},
			"Create Form Dialog",
			"Create",
		);
	});

	$container.on("click", ".pp-dialog-rebuild", function () {
		if (!current) return;
		frappe.confirm(
			"This will overwrite the frozen schema with the current Desk definition. Continue?",
			function () {
				frappe.call({
					method: "nce_events.api.form_dialog_api.rebuild_form_dialog",
					args: { name: current },
					freeze: true,
					freeze_message: "Rebuilding schema…",
					callback: function () {
						frappe.show_alert({ message: "Schema rebuilt.", indicator: "green" });
						_render_dialogs_tab(frm);
					},
				});
			},
		);
	});

	$container.on("click", ".pp-dialog-open", function () {
		if (!current) return;
		window.open(
			frappe.utils.get_form_link("Form Dialog", current),
			"_blank",
		);
	});

	$container.on("click", ".pp-dialog-select", function () {
		const name = $(this).data("name");
		frm.set_value("form_dialog", name);
		frm.dirty();
		frm.save().then(function () {
			_render_dialogs_tab(frm);
		});
	});
}
```

### Change 8: Add `set_query` for the `form_dialog` Link field

In the `frappe.ui.form.on("Page Panel", { refresh: ... })` block (line 1006), add the `set_query` call inside the `refresh` handler, after the existing lines.

**Find this block:**
```javascript
frappe.ui.form.on("Page Panel", {
	refresh: function (frm) {
		_ensure_tab_bar(frm);
		_render_default_filters(frm);
		// Hide Frappe's native tab bar (rendered when Tab Break fields exist in the DocType)
		$(frm.layout.wrapper).find(".form-tabs-list, .nav-tabs").hide();
	},
```

**Replace the refresh handler with:**
```javascript
frappe.ui.form.on("Page Panel", {
	refresh: function (frm) {
		_ensure_tab_bar(frm);
		_render_default_filters(frm);
		// Hide Frappe's native tab bar (rendered when Tab Break fields exist in the DocType)
		$(frm.layout.wrapper).find(".form-tabs-list, .nav-tabs").hide();

		// Filter form_dialog Link to only show dialogs for the current root_doctype
		if (frm.doc.root_doctype) {
			frm.set_query("form_dialog", function () {
				return {
					filters: {
						target_doctype: frm.doc.root_doctype,
						is_active: 1,
					},
				};
			});
		}
	},
```

Do NOT change anything in the `root_doctype` or `column_order` handlers.

---

## Summary of all changes to `page_panel.js`

1. Add `dialogs: [],` to `TAB_GROUPS`
2. Add `"dialogs"` to `TAB_ORDER`
3. Add `dialogs: "Dialogs"` to `TAB_LABELS`
4. Add `.pp-dialogs-wrap` toggle in `_show_tab`
5. Create `$dialogs_wrap` div in `_ensure_tab_bar` and insert it
6. Add `if (tab_id === "dialogs") _render_dialogs_tab(frm);` to click handler
7. Add `_render_dialogs_tab(frm)` and `_build_dialogs_tab_html(frm, $container, dialogs)` functions
8. Add `frm.set_query("form_dialog", ...)` in the refresh handler

---

## What NOT to do

- Do NOT create any new files. This phase only modifies `page_panel.js`.
- Do NOT modify `page_panel.json` (that was done in Phase A).
- Do NOT modify any Vue files or `panel_api.py`.
- Do NOT change existing tab content (Config, Display, Query).
- Do NOT change the `root_doctype` or `column_order` event handlers.
- Do NOT add form fields to the Dialogs tab — it is entirely custom HTML rendered into `.pp-dialogs-wrap`.

---

## Verification

After completing all changes:

1. The tab bar in the Page Panel form should show four buttons: Config, Display, Query, Dialogs.
2. Clicking "Dialogs" should show the dialogs panel.
3. If no `root_doctype` is set, the Dialogs tab should show "Select a DocType in the Config tab first."
4. The "Create & capture from Desk" button should prompt for a title and call `capture_form_dialog_from_desk`.
5. The "Rebuild" button should confirm before calling `rebuild_form_dialog`.
6. The "Open in full form" button should open the Form Dialog Desk form in a new browser tab.
7. The "Set as active" button should set `form_dialog` on the Page Panel and save.
