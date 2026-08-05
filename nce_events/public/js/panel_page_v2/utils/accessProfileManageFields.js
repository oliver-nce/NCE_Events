/**
 * Manage Fields dialog for NCE Access Profile Table rows (panel inline grid).
 * Mirrors nce_access_profile.js show_manage_fields_dialog.
 */

export function openManageFieldsDialog(documentType) {
	const doctype = String(documentType || "").trim();
	if (!doctype || typeof frappe === "undefined" || !frappe.ui?.Dialog) {
		return;
	}

	const d = new frappe.ui.Dialog({
		title: __("Restricted Fields — {0}", [doctype]),
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "help_html",
				options: `<p class="text-muted">${__(
					"Restricted fields cannot be edited when a profile row uses Restricted Write. Full Write allows editing Restricted fields too. Restricted is app-wide on this DocType. Fields that are read-only in the DocType schema are locked here and always non-editable.",
				)}</p>`,
			},
			{ fieldtype: "Button", fieldname: "restrict_all_btn", label: __("Restrict All") },
			{ fieldtype: "Column Break" },
			{ fieldtype: "Button", fieldname: "unrestrict_all_btn", label: __("Unrestrict All") },
			{ fieldtype: "Section Break" },
			{ fieldtype: "HTML", fieldname: "fields_html" },
		],
	});

	function render() {
		frappe.call({
			method:
				"nce_sync.nce_sync.doctype.nce_access_profile.nce_access_profile.get_doctype_fields",
			args: { doctype },
			freeze: true,
			callback(r) {
				const fields = r.message || [];
				let html =
					'<table class="table table-bordered"><thead><tr>' +
					`<th>${__("Field")}</th><th>${__("Fieldname")}</th><th>${__(
						"Restricted",
					)}</th></tr></thead><tbody>`;
				fields.forEach((f) => {
					const locked = f.locked || f.read_only;
					const restricted = (f.permlevel || 0) > 0 || locked;
					const lockNote = locked
						? ` <span class="text-muted">(${__("locked — read only in schema")})</span>`
						: "";
					html +=
						"<tr>" +
						`<td>${frappe.utils.escape_html(f.label || f.fieldname)}${lockNote}</td>` +
						`<td><code>${frappe.utils.escape_html(f.fieldname)}</code></td>` +
						`<td><input type="checkbox" class="field-restrict-toggle" data-fieldname="${frappe.utils.escape_html(
							f.fieldname,
						)}" data-locked="${locked ? "1" : "0"}" ${restricted ? "checked" : ""}${
							locked ? " disabled" : ""
						}></td>` +
						"</tr>";
				});
				html += "</tbody></table>";
				if (!fields.length) {
					html = `<p class="text-muted">${__(
						"No restrictable fields found on this DocType.",
					)}</p>`;
				}
				d.fields_dict.fields_html.$wrapper.html(html);
				d.fields_dict.fields_html.$wrapper.find(".field-restrict-toggle").on("change", function () {
					if (window.$(this).data("locked")) {
						return;
					}
					const fieldname = window.$(this).data("fieldname");
					const restricted = window.$(this).is(":checked");
					frappe.call({
						method:
							"nce_sync.nce_sync.doctype.nce_access_profile.nce_access_profile.set_field_restricted",
						args: { doctype, fieldname, restricted },
						callback() {
							frappe.show_alert({
								message: restricted
									? __("{0} marked Restricted", [fieldname])
									: __("{0} unrestricted", [fieldname]),
								indicator: restricted ? "orange" : "green",
							});
						},
					});
				});
			},
		});
	}

	d.fields_dict.restrict_all_btn.$input.on("click", () => bulkSet(1));
	d.fields_dict.unrestrict_all_btn.$input.on("click", () => bulkSet(0));

	function bulkSet(restricted) {
		frappe.call({
			method:
				"nce_sync.nce_sync.doctype.nce_access_profile.nce_access_profile.set_all_fields_restricted",
			args: { doctype, restricted },
			freeze: true,
			freeze_message: restricted
				? __("Restricting all fields...")
				: __("Unrestricting all fields..."),
			callback() {
				frappe.show_alert({
					message: restricted
						? __("All fields on {0} marked Restricted", [doctype])
						: __("All fields on {0} unrestricted", [doctype]),
					indicator: restricted ? "orange" : "green",
				});
				render();
			},
		});
	}

	d.show();
	render();
}
