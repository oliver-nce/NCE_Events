app_name = "nce_events"
app_title = "NCE Events"
app_publisher = "Oliver Reid"
app_description = "NCE Events — Dynamic Multi-Panel Page Explorer"
app_email = "oliver_reid@me.com"
app_license = "mit"
app_logo_url = "/assets/nce_events/images/logo.png"

required_apps = ["nce_sync"]

add_to_apps_screen = [
	{
		"name": "nce_events",
		"logo": "/assets/nce_events/images/logo.png",
		"title": "NCE Events",
		"route": "/app/panel-view",
	}
]

doc_events = {
	"Panel Page": {
		"after_insert": "nce_events.api.panel_api.sync_workspace_shortcuts",
		"on_update": "nce_events.api.panel_api.sync_workspace_shortcuts",
		"on_trash": "nce_events.api.panel_api.sync_workspace_shortcuts",
	}
}
