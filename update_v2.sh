#!/bin/bash
cd /home/frappe/frappe-bench/apps/nce_events && git pull
cd /home/frappe/frappe-bench/apps/nce_events/nce_events/public/js/panel_page_v2 && npm run build
cd /home/frappe/frappe-bench && bench build --app nce_events
echo "Done — hard-refresh the browser."
