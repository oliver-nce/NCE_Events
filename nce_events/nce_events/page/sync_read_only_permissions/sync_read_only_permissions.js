frappe.pages["sync-read-only-perms"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sync Read Only Permissions"),
		single_column: true,
	});

	const role = "Read Only";

	const $root = $(`
		<div class="sync-read-only-perms" style="max-width: 42rem; padding: 1rem 0;">
			<p class="text-muted">
				${__(
					"Grant <strong>Read</strong> on every DocType listed in <strong>WP Tables</strong> (NCE Name / Frappe DocType) plus <strong>Page Panel</strong>, for role:",
				)}
				<strong> ${frappe.utils.escape_html(role)}</strong>.
			</p>
			<p class="text-muted">
				${__(
					"Safe to run again after WP Tables changes — already-granted DocTypes are skipped.",
				)}
			</p>
			<button type="button" class="btn btn-primary btn-sync-read-only-perms">
				${__("Sync WP Tables read permissions")}
			</button>
			<pre class="sync-read-only-perms-result" style="display:none;margin-top:1rem;padding:12px;background:var(--bg-light-gray);border-radius:6px;font-size:12px;white-space:pre-wrap;"></pre>
		</div>
	`);

	page.main.append($root);

	$root.find(".btn-sync-read-only-perms").on("click", function () {
		const $btn = $(this);
		const $out = $root.find(".sync-read-only-perms-result");
		$btn.prop("disabled", true);
		frappe.call({
			method: "nce_events.api.permissions.grant_read_only_wp_tables",
			args: { role },
			freeze: true,
			freeze_message: __("Updating permissions…"),
			callback(r) {
				$btn.prop("disabled", false);
				if (r.exc) {
					return;
				}
				const m = r.message || {};
				$out.show().text(JSON.stringify(m, null, 2));
				const added = (m.added || []).length;
				const already = (m.already_had_read || []).length;
				frappe.show_alert(
					{
						message: __("Done — added {0}, already had read {1}.", [added, already]),
						indicator: "green",
					},
					8,
				);
			},
		});
	});
};
