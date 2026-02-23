from nce_events.api.panel_api import sync_workspace_shortcuts


def execute():
	"""Create Frappe Page records for active Panel Pages and sync workspace."""
	sync_workspace_shortcuts()
