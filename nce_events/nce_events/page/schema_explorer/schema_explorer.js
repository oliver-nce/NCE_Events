frappe.pages["schema-explorer"].on_page_show = function (wrapper) {
	if (!$(wrapper).find(".se-page-wrap").length) {
		$(wrapper).html(
			'<div class="se-page-wrap" style="padding:60px 24px;text-align:center;">' +
			'<p style="color:#6D757E;font-size:14px;font-family:Arial,sans-serif;">' +
			'The Tag Finder opens as a floating window.</p>' +
			'<button class="btn btn-primary btn-sm se-reopen-btn" ' +
			'style="margin-top:12px;">Re-open Tag Finder</button>' +
			'</div>'
		);
		$(wrapper).find(".se-reopen-btn").on("click", function () {
			nce_events.schema_explorer.open();
		});
	}
	nce_events.schema_explorer.open();
};
