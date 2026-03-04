frappe.ui.form.on("Email Template", {
	refresh: function (frm) {
		if (frm._tag_btn_added) return;
		frm._tag_btn_added = true;

		var $response = frm.fields_dict.response;
		if (!$response || !$response.$wrapper) return;

		var $btn = $('<button class="btn btn-xs btn-primary" style="margin:6px 0;">' +
			'<i class="fa fa-tags"></i> Insert Tag</button>');
		$response.$wrapper.find(".ql-toolbar, .like-disabled-input").first().before($btn);

		$btn.on("click", function () {
			_toggle_tag_picker(frm);
		});
	},
});

var _tag_picker_el = null;

function _toggle_tag_picker(frm) {
	if (_tag_picker_el) {
		_tag_picker_el.remove();
		_tag_picker_el = null;
		return;
	}

	frappe.model.with_doc("Messaging Configuration", "Messaging Configuration", function () {
		var doc = frappe.get_doc("Messaging Configuration", "Messaging Configuration");
		var val = doc && doc.tag_list;
		var tags;
		try {
			tags = JSON.parse(val || "[]");
		} catch (e) {
			tags = [];
		}
		if (!tags.length) {
			frappe.msgprint(__("No tags configured. Open Messaging Configuration and click Build Tag List."));
			return;
		}
		_show_tag_picker(frm, tags);
	});
}

function _show_tag_picker(frm, tags) {
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

	var $response = frm.fields_dict.response.$wrapper;
	var offset = $response.offset();
	$float.css({
		top: Math.max(60, (offset ? offset.top : 200) - 20) + "px",
		left: Math.max(20, (offset ? offset.left + $response.outerWidth() + 12 : 600)) + "px",
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
