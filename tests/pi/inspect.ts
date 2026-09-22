import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function inspect(pi: ExtensionAPI) {
	pi.registerCommand("pstack-test-inspect", {
		description: "Inspect the test session without calling a model",
		handler: async (_args, ctx) => {
			const { skills } = ctx.getSystemPromptOptions();
			pi.sendMessage({
				customType: "pstack-native-test",
				content: "Test snapshot",
				display: false,
				details: {
					skills,
					entries: ctx.sessionManager.getEntries().filter(
						(entry) => entry.type === "custom" && entry.customType === "pstack-mode",
					),
				},
			});
		},
	});
	pi.registerCommand("pstack-test-reload", {
		description: "Exercise the native reload lifecycle in the test session",
		handler: async (_args, ctx) => {
			await ctx.reload();
		},
	});
}
