/**
 * Role gate for Desk workspace navigation and SPA Awesome Bar search.
 *
 * code-index:begin
 * {
 *  "purpose": "Role gate for Desk workspace navigation and SPA Awesome Bar search visibility.",
 *  "read_when": "Changing who sees the Workspace button or SPA magic search on panel pages.",
 *  "gotchas": [
 *   "Desk routes remain role-protected server-side; this is display-only."
 *  ],
 *  "keywords": ["canSeeWorkspace", "Manager", "System Manager", "Administrator", "workspace"],
 *  "format": 1
 * }
 * code-index:end
 */
export function canSeeWorkspace() {
	const f = window.frappe;
	if (!f || !f.session) return false;
	if (f.session.user === "Administrator") return true;
	const roles = (f.boot && f.boot.user && f.boot.user.roles) || [];
	return roles.includes("Manager") || roles.includes("System Manager");
}
