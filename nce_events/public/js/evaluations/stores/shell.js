// Pinia store holding evaluations shell state like activeView and selected eventId.
//
// code-index:begin
// {
//  "purpose": "Pinia store holding evaluations shell state like activeView and selected eventId.",
//  "read_when": "Adding shared evaluations UI state or changing view/event selection.",
//  "gotchas": [],
//  "keywords": ["shell.js", "Pinia", "activeView", "eventId", "evaluations store"],
//  "format": 1
// }
// code-index:end

import { defineStore } from "pinia";

export const useNceEvalShellStore = defineStore("nceEvalShell", {
	state: () => ({
		/** Event primary key from route segment after /app/evaluations/ */
		eventId: "",
		/** Registered view id (e.g. rating_kanban). */
		activeView: "rating_kanban",
	}),
	actions: {
		setEventId(id) {
			this.eventId = typeof id === "string" ? id : "";
		},
		setView(viewId) {
			if (typeof viewId === "string" && viewId.length) {
				this.activeView = viewId;
			}
		},
	},
});
