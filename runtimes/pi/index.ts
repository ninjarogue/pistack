import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MODE_ENTRY = "pstack-mode";
const MODEL_SHEET = "pstack-models.md";
const SKILL_DIRECTORY = resolve(
	dirname(realpathSync(fileURLToPath(import.meta.url))),
	"../../plugins/pstack/skills",
);
const ENTRY_SKILL = join(SKILL_DIRECTORY, "poteto-mode", "SKILL.md");
const SETUP_SKILL = join(SKILL_DIRECTORY, "setup-pstack", "SKILL.md");
type Mode = "default" | "pstack";

function isMissingFile(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function entryGuidance(): string {
	return [
		"Pi Pstack runtime guidance:",
		`Read and follow the bundled Pstack entry skill at ${ENTRY_SKILL}.`,
		"Use Pi's available models and native tools. Do not assume Claude Code tools or change the parent session's model or tools globally.",
	].join("\n");
}

async function modelSection(): Promise<string> {
	const sheetPath = join(getAgentDir(), MODEL_SHEET);
	try {
		const sheet = await readFile(sheetPath, "utf8");
		return `${entryGuidance()}\n\n${sheet}`;
	} catch (error: unknown) {
		if (!isMissingFile(error)) throw error;
		return [
			entryGuidance(),
			"",
			`No Pi Pstack model sheet exists at ${sheetPath}.`,
			"Do not use the Claude model defaults named by the bundled skills.",
			`Use the bundled setup-pstack skill at ${SETUP_SKILL} to choose models available in Pi and write ${sheetPath}.`,
		].join("\n");
	}
}

export default function pstackRuntime(pi: ExtensionAPI) {
	let mode: Mode = "default";

	pi.registerFlag("pstack", {
		description: "Start a new session with pstack skills; resumed sessions keep their saved mode",
		type: "boolean",
		default: false,
	});

	pi.on("session_start", (event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		const saved = entries.find((entry) => entry.type === "custom" && entry.customType === MODE_ENTRY);
		if (saved?.type === "custom") {
			const data: unknown = saved.data;
			if (data !== "default" && data !== "pstack") {
				throw new Error("Invalid pstack-mode session metadata. Expected 'default' or 'pstack'.");
			}
			mode = data;
		} else {
			const sessionFile = ctx.sessionManager.getSessionFile();
			const isNew = !entries.some((entry) => entry.type === "message") &&
				(!sessionFile || !existsSync(sessionFile));
			mode = event.reason === "startup" && isNew && pi.getFlag("pstack") === true
				? "pstack"
				: "default";
			pi.appendEntry(MODE_ENTRY, mode);
		}
		ctx.ui.setStatus(MODE_ENTRY, mode === "pstack" ? "Pstack" : undefined);
	});

	pi.on("resources_discover", (_event, ctx) => {
		if (mode !== "pstack") return;
		if (!existsSync(SKILL_DIRECTORY)) {
			ctx.ui.setStatus(MODE_ENTRY, "Pstack: skills missing");
			ctx.ui.notify(`Bundled Pstack skills not found at ${SKILL_DIRECTORY}. Reinstall @ninjarogue/pstack-native.`, "error");
			return;
		}
		return { skillPaths: [SKILL_DIRECTORY] };
	});

	pi.on("before_agent_start", async (event) => {
		if (mode !== "pstack") return;
		event.systemPromptOptions.skills = event.systemPromptOptions.skills.filter(
			(skill) => skill.filePath.startsWith(`${SKILL_DIRECTORY}${sep}`),
		);
		event.systemPromptOptions.sections.pstack_models = await modelSection();
	});

	pi.registerCommand("pstack", {
		description: "Start a new Pstack session without changing the current session's mode",
		handler: async (args, ctx) => {
			if (args.trim()) {
				ctx.ui.notify("Use /pstack without arguments to start a new Pstack session.", "warning");
				return;
			}
			if (!existsSync(SKILL_DIRECTORY)) {
				ctx.ui.notify(`Bundled Pstack skills not found at ${SKILL_DIRECTORY}. Reinstall @ninjarogue/pstack-native.`, "error");
				return;
			}
			await ctx.newSession({
				setup: async (sessionManager) => {
					sessionManager.appendCustomEntry(MODE_ENTRY, "pstack");
				},
			});
		},
	});
}
