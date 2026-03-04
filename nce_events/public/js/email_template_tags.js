frappe.ui.form.on("Email Template", {
	refresh: function (frm) {
		console.log("[TAG PICKER] refresh fired, adding button");
		frm.add_custom_button(__("Insert Tag"), function () {
			console.log("[TAG PICKER] button clicked");
			_toggle_tag_picker(frm);
		});
	},
});

var _tag_picker_el = null;

function _toggle_tag_picker(frm) {
	console.log("[TAG PICKER] _toggle_tag_picker called, existing:", !!_tag_picker_el);
	if (_tag_picker_el) {
		_tag_picker_el.remove();
		_tag_picker_el = null;
		return;
	}

	console.log("[TAG PICKER] calling frappe.client.get...");
	frappe.call({
		method: "frappe.client.get",
		args: { doctype: "Messaging Configuration" },
		callback: function (r) {
			console.log("[TAG PICKER] callback received:", r);
			if (!r || !r.message) {
				frappe.msgprint(__("Could not load Messaging Configuration."));
				return;
			}
			var val = r.message.tag_list;
			console.log("[TAG PICKER] tag_list value:", val);
			var tags;
			try {
				tags = JSON.parse(val || "[]");
			} catch (e) {
				console.log("[TAG PICKER] JSON parse error:", e);
				tags = [];
			}
			if (!tags.length) {
				frappe.msgprint(__("No tags configured. Open Messaging Configuration and click Build Tag List."));
				return;
			}
			console.log("[TAG PICKER] showing picker with", tags.length, "tags");
			_show_tag_picker(frm, tags);
		},
		error: function (err) {
			console.log("[TAG PICKER] API error:", err);
			frappe.msgprint(__("Error loading Messaging Configuration. Check permissions."));
		},
	});
}

function _inject_tag_picker_css() {
	if (document.getElementById("tag-picker-style")) return;
	var css =
		".tag-picker-float{position:fixed;z-index:1050;width:380px;max-height:70vh;" +
		"background:#fff;border:1px solid #A2CCF6;border-radius:8px;" +
		"box-shadow:0 8px 32px rgba(18,107,196,.22),0 2px 8px rgba(0,0,0,.08);" +
		"display:flex;flex-direction:column;overflow:hidden}" +
		".tag-picker-header{display:flex;align-items:center;justify-content:space-between;" +
		"padding:8px 12px;background:#126BC4;color:#fff;cursor:move;flex-shrink:0}" +
		".tag-picker-title{font-weight:600;font-size:13px}" +
		".tag-picker-close{background:none;border:none;color:#fff;font-size:18px;" +
		"line-height:1;cursor:pointer;padding:0 4px;opacity:.8}" +
		".tag-picker-close:hover{opacity:1}" +
		".tag-picker-grid{display:grid;grid-template-columns:repeat(3,1fr);" +
		"gap:8px;padding:12px;overflow-y:auto}" +
		".tag-picker-tile{padding:8px 6px;background:#F1F7FE;border:1px solid #A2CCF6;" +
		"border-radius:6px;text-align:center;font-size:12px;font-weight:500;" +
		"color:#126BC4;cursor:pointer;word-break:break-word;" +
		"transition:background .15s,box-shadow .15s}" +
		".tag-picker-tile:hover{background:#E3F0FC;box-shadow:0 2px 6px rgba(18,107,196,.18)}" +
		".tag-picker-tile:active{background:#C7E1F9}";
	var $style = $('<style id="tag-picker-style"></style>').text(css);
	$("head").append($style);
}

function _show_tag_picker(frm, tags) {
	_inject_tag_picker_css();

	if (_tag_picker_el) {
		_tag_picker_el.remove();
		_tag_picker_el = null;
	}

	var $float = $('<div class="tag-picker-float"></div>');

	var $header = $('<div class="tag-picker-header">' +
		'<span class="tag-picker-title">Insert Tag</span>' +
		'<button class="tag-picker-close">&times;</button>' +
		'</div>');
	$float.append($header);

	var $grid = $('<div class="tag-picker-grid"></div>');

	tags.forEach(function (t) {
		var display = t.label || t.field;
		var $tile = $('<div class="tag-picker-tile" title="' +
			frappe.utils.escape_html(t.tag) + '">' +
			frappe.utils.escape_html(display) + '</div>');

		$tile.on("click", function () {
			_insert_tag_at_cursor(frm, t.tag);
		});

		$grid.append($tile);
	});

	$float.append($grid);
	$(document.body).append($float);
	_tag_picker_el = $float;

	$float.css({
		top: "120px",
		right: "40px",
	});

	$header.find(".tag-picker-close").on("click", function () {
		_tag_picker_el.remove();
		_tag_picker_el = null;
	});

	_make_tag_picker_draggable($float, $header);
}

function _make_tag_picker_draggable($float, $header) {
	$header.on("mousedown", function (e) {
		if ($(e.target).hasClass("tag-picker-close")) return;
		e.preventDefault();
		var start_x = e.clientX, start_y = e.clientY;
		var start_left = parseInt($float.css("left"), 10) || 0;
		var start_top = parseInt($float.css("top"), 10) || 0;

		if ($float.css("right") !== "auto") {
			$float.css({ left: $float.offset().left + "px", right: "auto" });
			start_left = parseInt($float.css("left"), 10);
		}

		$(document).on("mousemove.tagpicker", function (ev) {
			$float.css({
				left: (start_left + ev.clientX - start_x) + "px",
				top: (start_top + ev.clientY - start_y) + "px",
			});
		});
		$(document).on("mouseup.tagpicker", function () {
			$(document).off("mousemove.tagpicker mouseup.tagpicker");
		});
	});
}

function _insert_tag_at_cursor(frm, tag_text) {
	var $response = frm.fields_dict.response;

	if ($response.quill) {
		var quill = $response.quill;
		var range = quill.getSelection(true);
		if (range) {
			quill.insertText(range.index, tag_text);
			quill.setSelection(range.index + tag_text.length);
		} else {
			quill.insertText(quill.getLength() - 1, tag_text);
		}
		return;
	}

	if ($response.ace_editor) {
		var editor = $response.ace_editor;
		editor.insert(tag_text);
		editor.focus();
		return;
	}

	var $textarea = $response.$wrapper.find("textarea");
	if ($textarea.length) {
		var ta = $textarea[0];
		var start = ta.selectionStart || 0;
		var before = ta.value.substring(0, start);
		var after = ta.value.substring(ta.selectionEnd || start);
		ta.value = before + tag_text + after;
		ta.selectionStart = ta.selectionEnd = start + tag_text.length;
		ta.focus();
		$(ta).trigger("change");
		return;
	}

	frappe.msgprint(__("Could not find an editor to insert into."));
}
