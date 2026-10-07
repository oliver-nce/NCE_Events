// register.js is in app_include_js — must set on_page_show synchronously (not inside frappe.require).
//
// code-index:begin
// {
//  "purpose": "Registers panel-page-mirrored SPA route via spa_panel_page synchronously on page show.",
//  "read_when": "Changing mirrored panel page registration; on_page_show must not wait on frappe.require.",
//  "gotchas": [
//   "register.js is in app_include_js — must set on_page_show synchronously (not inside frappe.require)."
//  ],
//  "keywords": ["panel-page-mirrored", "spa_panel_page", "register", "on_page_show", "app_include_js"],
//  "format": 1
// }
// code-index:end
nce_events.spa_panel_page.register("panel-page-mirrored");
