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
	},
});

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
