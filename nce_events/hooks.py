app_name = "nce_events"
app_title = "NCE Events"
app_publisher = "Oliver Reid"
app_description = "NCE Events — Dynamic Multi-Panel Page Explorer"
app_email = "oliver_reid@me.com"
app_license = "mit"
app_logo_url = "/assets/nce_events/images/logo.png"

required_apps = ["nce_sync"]

app_include_js = [
	"/assets/nce_events/js/schema_explorer.js",
	"/assets/nce_events/js/enrollments_exchange.js",
]
app_include_css = [
	"/assets/nce_events/css/schema_explorer.css",
	"/assets/nce_events/css/theme_defaults.css",
]

doctype_js = {
	"Email Template": "public/js/email_template_tags.js",
	"API Connector": "public/js/api_connector_tags.js",
}

add_to_apps_screen = [
	{
		"name": "nce_events",
		"logo": "/assets/nce_events/images/logo.png",
		"title": "NCE Events",
		"route": "/app/page-view",
	}
]

# After ``Events`` is published to WooCommerce (``nce_events.api.events_publish.publish_events_to_website``),
# other apps (e.g. nce_sync) may register in their hooks.py::
#
#   after_events_publish_to_woocommerce = ["my.module.handler"]
#
# Each callable is invoked as ``frappe.call(fn, doctype="Events", name=<new name>)``.
