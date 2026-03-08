frappe.ui.form.on("Display Settings", {
	refresh: function (frm) {
		frm.add_custom_button(__("Preview"), function () {
			_inject_preview(frm);
		}).addClass("btn-default");

		frm.add_custom_button(__("Apply & Save"), function () {
			frm.save();
		}).addClass("btn-primary-dark");

		frm.add_custom_button(__("Remove Preview"), function () {
			$("#display-settings-preview").remove();
			frappe.show_alert({ message: __("Preview removed"), indicator: "blue" });
		}).addClass("btn-default");

		_attach_color_pickers(frm);
	},
});

function _attach_color_pickers(frm) {
	["text_color", "muted_text_color"].forEach(function (fieldname) {
		var field = frm.fields_dict[fieldname];
		if (!field || !field.$wrapper) return;
		if (field.$wrapper.find(".ds-color-picker").length) return;

		var current = frm.doc[fieldname] || "#333333";

		var picker = $('<input type="color" class="ds-color-picker">')
			.val(current)
			.css({
				width: "36px",
				height: "36px",
				padding: "2px",
				border: "1px solid #ccc",
				borderRadius: "4px",
				cursor: "pointer",
				verticalAlign: "middle",
				marginLeft: "8px",
			});

		var swatch = $('<span class="ds-color-swatch"></span>')
			.css({
				display: "inline-block",
				width: "60px",
				height: "20px",
				borderRadius: "3px",
				border: "1px solid #ccc",
				verticalAlign: "middle",
				marginLeft: "8px",
				background: current,
			});

		picker.on("input", function () {
			var val = $(this).val();
			swatch.css("background", val);
			frm.set_value(fieldname, val);
		});

		field.$wrapper.find(".control-input-wrapper, .control-input").first()
			.append(picker)
			.append(swatch);
	});
}

var _FONT_MAP = {
	"Inter": "'Inter', sans-serif",
	"Arial": "Arial, sans-serif",
	"Helvetica": "Helvetica, Arial, sans-serif",
	"Georgia": "Georgia, serif",
	"Verdana": "Verdana, sans-serif",
	"Tahoma": "Tahoma, sans-serif",
	"System Default": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function _inject_preview(frm) {
	$("#display-settings-preview").remove();

	var font = _FONT_MAP[frm.doc.font_family] || "'Inter', sans-serif";
	var size = frm.doc.font_size || "13px";
	var color = frm.doc.text_color || "#333333";
	var muted = frm.doc.muted_text_color || "#555555";

	var css =
		"body, .frappe-list, .list-row, .form-group, .frappe-control, .modal-body, .page-container {\n" +
		"  font-family: " + font + " !important;\n" +
		"  font-size: " + size + " !important;\n" +
		"  color: " + color + " !important;\n" +
		"}\n" +
		".text-muted, .text-secondary, .indicator-pill, .help-text {\n" +
		"  color: " + muted + " !important;\n" +
		"}\n";

	$("<style>").attr("id", "display-settings-preview").text(css).appendTo("head");
	frappe.show_alert({ message: __("Preview applied — save to make permanent"), indicator: "orange" });
}
