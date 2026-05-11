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
