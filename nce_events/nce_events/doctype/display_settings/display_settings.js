frappe.ui.form.on("Display Settings", {
	refresh: function (frm) {
		frm.add_custom_button(__("Preview"), function () {
			_inject_preview(frm);
		}).addClass("btn-default");

		frm.add_custom_button(__("Apply & Save"), function () {
			frm.save().then(function () {
				frappe.show_alert({
					message: __("Saved — reload the panel page to see changes"),
					indicator: "green"
				});
			});
		}).addClass("btn-primary-dark");

		frm.add_custom_button(__("Remove Preview"), function () {
			$("#display-settings-preview").remove();
			frappe.show_alert({ message: __("Preview removed"), indicator: "blue" });
		}).addClass("btn-default");

		_attach_color_pickers(frm);
	},
});

/* ── Color Picker (Apple-style grid + HSV sliders) ── */

var _PICKER_CSS_INJECTED = false;

function _inject_picker_css() {
	if (_PICKER_CSS_INJECTED) return;
	_PICKER_CSS_INJECTED = true;
	$("<style>").text(
		".ds-picker-trigger{display:inline-flex;align-items:center;gap:8px;margin-top:6px;cursor:pointer}" +
		".ds-picker-swatch{width:36px;height:36px;border-radius:6px;border:1px solid rgba(0,0,0,.15);box-shadow:0 1px 4px rgba(0,0,0,.1)}" +
		".ds-picker-label{font-size:12px;color:#666;font-family:monospace}" +
		".ds-picker-popup{position:absolute;z-index:1100;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,.15);width:360px}" +
		".ds-grid{display:grid;grid-template-columns:repeat(12,22px);gap:2px}" +
		".ds-grid .gc{width:22px;height:22px;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,.1);transition:transform .1s,box-shadow .1s}" +
		".ds-grid .gc:hover{transform:scale(1.15);z-index:1;box-shadow:0 2px 8px rgba(0,0,0,.2)}" +
		".ds-grid .gc.sel{outline:2px solid #333;outline-offset:1px}" +
		".ds-grid .gs{height:4px}" +
		".ds-hsv{display:flex;flex-direction:column;gap:6px;margin-top:12px}" +
		".ds-hsv-row{display:flex;align-items:center;gap:8px}" +
		".ds-hsv-row label{width:14px;font-size:11px;font-weight:600;color:#666}" +
		".ds-hsv-row input[type=range]{flex:1;height:12px;border-radius:6px;-webkit-appearance:none;cursor:pointer}" +
		".ds-hsv-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #666;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.3)}" +
		".ds-hsv-row input[type=number]{width:50px;padding:3px 4px;border:1px solid #ccc;border-radius:4px;font-size:11px;text-align:center}" +
		".ds-hue-bg{background:linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))}" +
		".ds-hex-row{display:flex;align-items:center;gap:6px;margin-top:10px}" +
		".ds-hex-row input{flex:1;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:13px}" +
		".ds-hex-row .ds-ok{padding:4px 14px;border:none;border-radius:4px;background:#126BC4;color:#fff;font-size:12px;font-weight:600;cursor:pointer}" +
		".ds-hex-row .ds-ok:hover{background:#105EAD}" +
		".ds-preview-swatch{width:50px;height:50px;border-radius:8px;border:1px solid rgba(0,0,0,.15);box-shadow:0 2px 8px rgba(0,0,0,.1);margin-top:12px}"
	).appendTo("head");
}

var _TOP_ROW = [
	"#FF2600","#FF9300","#FFFB00","#00F900","#00FDFF","#0433FF",
	"#FF40FF","#942192","#AA7942","#FFFFFF","#8E8E93","#000000"
];
var _GRAY_ROW = [
	"#FFFFFF","#EBEBEB","#D6D6D6","#C0C0C0","#ABABAB",
	"#939393","#7A7A7A","#5F5F5F","#444444","#232323","#000000"
];
var _COLOR_ROWS = [
	["#00313F","#001D4C","#12013B","#2E043E","#3D071C","#5C0700","#5B1B01","#573501","#563D01","#666101","#4F5604","#263D0F"],
	["#014D63","#002F7B","#1B0853","#430E59","#56102A","#821100","#7C2A01","#7B4A02","#775801","#8C8700","#707607","#375819"],
	["#026E8E","#0142A9","#2C1276","#61187C","#781A3E","#B61A01","#AD3F00","#A96801","#A77B01","#C4BC01","#9BA60E","#4F7A28"],
	["#018DB4","#0157D7","#371A96","#7B209E","#9A234E","#E22400","#DA5100","#D48601","#D29F01","#F5EC00","#C5D117","#679C33"],
	["#00A2D7","#0062FE","#4E22B3","#992ABD","#BF2E66","#FF4112","#FF6A01","#FEAA00","#FEC802","#FFFC40","#DAEB38","#77BB40"],
	["#00C7FC","#3A8AFC","#5E30EA","#BD39F3","#E53C7A","#FF6251","#FF8548","#FEB440","#FECA3E","#FFF86B","#E4EF65","#97D25F"],
	["#52D4FD","#74A7FF","#864EFE","#D258FE","#EC719F","#FF8D81","#FEA57D","#FFC879","#FFD876","#FFF894","#EAF48F","#B1DE8B"],
	["#93D9F7","#A4C7FF","#B18CFF","#DF90FC","#F4A4C1","#FFB5AE","#FFC4AA","#FED9A8","#FFE4A9","#FEFBB8","#F2F8B8","#CBE8B5"],
	["#D1E6F1","#D4E4FE","#D7CEFD","#F0CAFD","#F9D2E2","#FFDBD9","#FEE2D5","#FFEDD6","#FFF2D4","#FEFCDD","#F7FADB","#E0EDD4"]
];

function _hsvToHex(h, s, v) {
	s /= 100; v /= 100;
	var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
	var r, g, b;
	if (h < 60) { r=c; g=x; b=0; } else if (h < 120) { r=x; g=c; b=0; }
	else if (h < 180) { r=0; g=c; b=x; } else if (h < 240) { r=0; g=x; b=c; }
	else if (h < 300) { r=x; g=0; b=c; } else { r=c; g=0; b=x; }
	var toH = function(n) { return Math.round((n+m)*255).toString(16).padStart(2,"0"); };
	return "#" + toH(r) + toH(g) + toH(b);
}

function _hexToHSV(hex) {
	hex = hex.replace("#", "");
	var r = parseInt(hex.substr(0,2),16)/255;
	var g = parseInt(hex.substr(2,2),16)/255;
	var b = parseInt(hex.substr(4,2),16)/255;
	var max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
	var h = 0, s = max === 0 ? 0 : d / max, v = max;
	if (d !== 0) {
		if (max === r) h = 60 * ((g-b)/d + (g<b ? 6 : 0));
		else if (max === g) h = 60 * ((b-r)/d + 2);
		else h = 60 * ((r-g)/d + 4);
	}
	if (h < 0) h += 360;
	return { h: Math.round(h), s: Math.round(s*100), v: Math.round(v*100) };
}

function _attach_color_pickers(frm) {
	_inject_picker_css();
	["text_color", "muted_text_color"].forEach(function (fieldname) {
		var field = frm.fields_dict[fieldname];
		if (!field || !field.$wrapper) return;
		if (field.$wrapper.find(".ds-picker-trigger").length) return;

		var current = frm.doc[fieldname] || "#333333";
		var trigger = $(
			'<div class="ds-picker-trigger">' +
			'<div class="ds-picker-swatch"></div>' +
			'<span class="ds-picker-label"></span>' +
			'</div>'
		);
		trigger.find(".ds-picker-swatch").css("background", current);
		trigger.find(".ds-picker-label").text(current.toUpperCase());

		trigger.on("click", function (e) {
			e.stopPropagation();
			_open_picker(frm, fieldname, trigger);
		});

		field.$wrapper.find(".control-input-wrapper, .control-input").first().append(trigger);
	});
}

function _open_picker(frm, fieldname, trigger) {
	$(".ds-picker-popup").remove();

	var current = frm.doc[fieldname] || "#333333";
	var hsv = _hexToHSV(current);

	var popup = $('<div class="ds-picker-popup"></div>');
	var grid = $('<div class="ds-grid"></div>');
	var selectedCell = null;

	function selectCell(cell, hex) {
		if (selectedCell) $(selectedCell).removeClass("sel");
		selectedCell = cell;
		$(cell).addClass("sel");
		hsv = _hexToHSV(hex);
		syncUI(false);
	}

	function addCell(hex) {
		var cell = $('<div class="gc"></div>').css("backgroundColor", hex);
		cell.on("click", function () { selectCell(this, hex); });
		grid.append(cell);
	}

	_TOP_ROW.forEach(addCell);
	for (var i = 0; i < 12; i++) grid.append($('<div class="gs"></div>'));
	_GRAY_ROW.forEach(addCell);
	_COLOR_ROWS.forEach(function (row) { row.forEach(addCell); });

	var preview = $('<div class="ds-preview-swatch"></div>').css("background", current);

	var sliders = $('<div class="ds-hsv"></div>');
	var hSlider = $('<input type="range" min="0" max="360" class="ds-hue-bg">').val(hsv.h);
	var hNum = $('<input type="number" min="0" max="360">').val(hsv.h);
	var sSlider = $('<input type="range" min="0" max="100">').val(hsv.s);
	var sNum = $('<input type="number" min="0" max="100">').val(hsv.s);
	var vSlider = $('<input type="range" min="0" max="100">').val(hsv.v);
	var vNum = $('<input type="number" min="0" max="100">').val(hsv.v);

	sliders.append(
		$('<div class="ds-hsv-row"></div>').append($("<label>H</label>"), hSlider, hNum),
		$('<div class="ds-hsv-row"></div>').append($("<label>S</label>"), sSlider, sNum),
		$('<div class="ds-hsv-row"></div>').append($("<label>V</label>"), vSlider, vNum)
	);

	var hexInput = $('<input type="text">').val(current.toUpperCase());
	var okBtn = $('<button class="ds-ok">OK</button>');
	var hexRow = $('<div class="ds-hex-row"></div>').append(hexInput, okBtn);

	function syncUI(deselectGrid) {
		var hex = _hsvToHex(hsv.h, hsv.s, hsv.v);
		hSlider.val(hsv.h); hNum.val(hsv.h);
		sSlider.val(hsv.s); sNum.val(hsv.s);
		vSlider.val(hsv.v); vNum.val(hsv.v);
		hexInput.val(hex.toUpperCase());
		preview.css("background", hex);
		sSlider.css("background", "linear-gradient(to right, #888, hsl(" + hsv.h + ",100%,50%))");
		vSlider.css("background", "linear-gradient(to right, #000, hsl(" + hsv.h + ",100%,50%))");
		if (deselectGrid && selectedCell) { $(selectedCell).removeClass("sel"); selectedCell = null; }
	}

	function onSlider(which, val) {
		val = parseInt(val) || 0;
		if (which === "h") hsv.h = Math.max(0, Math.min(360, val));
		else if (which === "s") hsv.s = Math.max(0, Math.min(100, val));
		else hsv.v = Math.max(0, Math.min(100, val));
		syncUI(true);
	}

	hSlider.on("input", function () { hNum.val(this.value); onSlider("h", this.value); });
	hNum.on("input", function () { hSlider.val(this.value); onSlider("h", this.value); });
	sSlider.on("input", function () { sNum.val(this.value); onSlider("s", this.value); });
	sNum.on("input", function () { sSlider.val(this.value); onSlider("s", this.value); });
	vSlider.on("input", function () { vNum.val(this.value); onSlider("v", this.value); });
	vNum.on("input", function () { vSlider.val(this.value); onSlider("v", this.value); });

	hexInput.on("input", function () {
		var v = $(this).val();
		if (/^#[0-9A-Fa-f]{6}$/.test(v)) { hsv = _hexToHSV(v); syncUI(false); }
	});

	okBtn.on("click", function () {
		var hex = hexInput.val().toUpperCase();
		if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) hex = current;
		frm.set_value(fieldname, hex);
		trigger.find(".ds-picker-swatch").css("background", hex);
		trigger.find(".ds-picker-label").text(hex);
		popup.remove();
	});

	popup.append(grid, preview, sliders, hexRow);
	syncUI(false);

	trigger.closest(".frappe-control").css("position", "relative").append(popup);

	setTimeout(function () {
		$(document).on("click.ds_picker", function (e) {
			if (!$(e.target).closest(".ds-picker-popup, .ds-picker-trigger").length) {
				popup.remove();
				$(document).off("click.ds_picker");
			}
		});
	}, 50);
}

/* ── Font map + Preview ── */

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

	var sel = ".panel-float, .panel-float .panel-table td, .panel-float .panel-table th, " +
		".panel-float .pane-label, .panel-float .pane-count, .panel-float .drill-btn, " +
		".panel-float .panel-float-footer, .panel-float .pane-filter-widget, " +
		".panel-float .pane-core-filter-widget, .panel-float .filter-col-select, " +
		".panel-float .filter-op-select, .panel-float .filter-val-input, " +
		".panel-float .core-filter-input";

	var css = sel + " {\n" +
		"  font-family: " + font + " !important;\n" +
		"  font-size: " + size + " !important;\n" +
		"}\n" +
		".panel-float .panel-table td {\n" +
		"  color: " + color + " !important;\n" +
		"}\n" +
		".panel-float .panel-table th,\n" +
		".panel-float .pane-count,\n" +
		".panel-float .drill-btn.disabled {\n" +
		"  color: " + muted + " !important;\n" +
		"}\n";

	$("<style>").attr("id", "display-settings-preview").text(css).appendTo("head");
	frappe.show_alert({ message: __("Preview applied — save to make permanent"), indicator: "orange" });
}
