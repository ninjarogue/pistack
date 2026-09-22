import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import type { Server } from "node:http";
import {
	BUNDLED_SKILLS,
	RUNTIME,
	Pi,
	expectObject,
	expectString,
	isObject,
	type JsonObject,
} from "./rpc.ts";

interface RequestWaiter {
	resolve: (payload: JsonObject) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

class ProviderRequests {
	private readonly queued: JsonObject[] = [];
	private readonly waiters: RequestWaiter[] = [];
	private failure: Error | undefined;

	push(payload: JsonObject): void {
		const waiter = this.waiters.shift();
		if (waiter) {
			clearTimeout(waiter.timer);
			waiter.resolve(payload);
			return;
		}
		this.queued.push(payload);
	}

	fail(error: Error): void {
		this.failure = error;
		for (const waiter of this.waiters.splice(0)) {
			clearTimeout(waiter.timer);
			waiter.reject(error);
		}
	}

	next(timeoutMs = 30_000): Promise<JsonObject> {
		if (this.failure) return Promise.reject(this.failure);
		const payload = this.queued.shift();
		if (payload) return Promise.resolve(payload);
		return new Promise((resolve, reject) => {
			const waiter: RequestWaiter = {
				resolve,
				reject,
				timer: setTimeout(() => {
					const index = this.waiters.indexOf(waiter);
					if (index !== -1) this.waiters.splice(index, 1);
					reject(new Error("No request reached the local provider"));
				}, timeoutMs),
			};
			this.waiters.push(waiter);
		});
	}
}

interface Fixture {
	root: string;
	project: string;
	home: string;
	agent: string;
	sessions: string;
	sheet: string;
	runtime: string;
}

async function readRequestBody(request: IncomingMessage): Promise<JsonObject> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	let payload: unknown;
	try {
		payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch (error) {
		throw new Error(`The local provider received invalid JSON: ${String(error)}`);
	}
	return expectObject(payload, "provider request");
}

function fixtureResponse(): string {
	const chunks = [
		{
			id: "fixture",
			object: "chat.completion.chunk",
			model: "fixture",
			choices: [{
				index: 0,
				delta: { role: "assistant", content: "Local test response." },
				finish_reason: null,
			}],
		},
		{
			id: "fixture",
			object: "chat.completion.chunk",
			model: "fixture",
			choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
		},
	];
	return `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`;
}

async function handleProviderRequest(
	request: IncomingMessage,
	response: ServerResponse,
	requests: ProviderRequests,
): Promise<void> {
	requests.push(await readRequestBody(request));
	const body = fixtureResponse();
	response.writeHead(200, {
		"content-type": "text/event-stream",
		"content-length": Buffer.byteLength(body),
	});
	response.end(body);
}

async function startProvider(requests: ProviderRequests): Promise<{ server: Server; baseUrl: string }> {
	const server = createServer((request, response) => {
		void handleProviderRequest(request, response, requests).catch((error: unknown) => {
			const failure = error instanceof Error ? error : new Error(String(error));
			requests.fail(failure);
			if (!response.headersSent) response.writeHead(500);
			response.end();
		});
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			server.off("error", reject);
			resolve();
		});
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Could not read the local provider port");
	return { server, baseUrl: `http://127.0.0.1:${address.port}/v1` };
}

async function closeProvider(server: Server): Promise<void> {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) => {
		server.close((error) => error ? reject(error) : resolve());
	});
}

function messageText(message: JsonObject): string {
	if (typeof message.content === "string") return message.content;
	if (!Array.isArray(message.content)) return "";
	return message.content
		.filter(isObject)
		.filter((block) => block.type === "text" && typeof block.text === "string")
		.map((block) => expectString(block.text, "message text"))
		.join("\n");
}

function payloadMessages(payload: JsonObject): JsonObject[] {
	if (!Array.isArray(payload.messages) || !payload.messages.every(isObject)) {
		throw new Error("Provider request messages must be an array of objects");
	}
	return payload.messages;
}

function systemText(payload: JsonObject): string {
	return payloadMessages(payload)
		.filter((message) => message.role === "system" || message.role === "developer")
		.map(messageText)
		.join("\n");
}

function advertised(payload: JsonObject): Set<string> {
	const blocks = systemText(payload).match(/<available_skills>.*?<\/available_skills>/gs) ?? [];
	const latest = blocks.at(-1);
	if (!latest) return new Set();
	const names = new Set<string>();
	for (const skill of latest.match(/<skill>.*?<\/skill>/gs) ?? []) {
		const match = /<name>([^<]+)<\/name>/.exec(skill);
		if (!match?.[1]) throw new Error(`Advertised skill has no name: ${skill}`);
		names.add(match[1]);
	}
	return names;
}

function latestPstackSection(payload: JsonObject): string | undefined {
	const sections = [...systemText(payload).matchAll(/<pstack_models>\n?([\s\S]*?)\n?<\/pstack_models>/g)];
	return sections.at(-1)?.[1];
}

function withoutPstackSections(payload: JsonObject): string {
	return systemText(payload)
		.replace(/<skills>\n.*?\n<\/skills>\n*/gs, "")
		.replace(/<pstack_models>\n.*?\n<\/pstack_models>\n*/gs, "")
		.trim();
}

function setDifference(left: Set<string>, right: Set<string>): string[] {
	return [...left].filter((value) => !right.has(value)).sort();
}

async function turn(
	pi: Pi,
	requests: ProviderRequests,
	baseUrl: string,
	message: string,
	expectedSkills: Set<string>,
): Promise<JsonObject> {
	const { model } = await pi.getState();
	assert.ok(model, "Pi has no selected model");
	assert.equal(model.provider, "pstack-native-test");
	assert.equal(model.id, "fixture");
	assert.equal(model.baseUrl, baseUrl);

	const [payload] = await Promise.all([
		requests.next(),
		pi.promptAndWait(message, 30_000),
	]);
	const messages = await pi.getMessages();
	const assistant = messages.findLast((candidate) => candidate.role === "assistant");
	assert.ok(assistant, "The completed turn has no assistant message");
	assert.equal(assistant.stopReason, "stop");
	const actualSkills = advertised(payload);
	assert.deepEqual(
		[...actualSkills].sort(),
		[...expectedSkills].sort(),
		JSON.stringify({
			unexpected: setDifference(actualSkills, expectedSkills),
			missing: setDifference(expectedSkills, actualSkills),
		}),
	);
	return payload;
}

function unquote(value: string): string {
	const first = value.at(0);
	return value.length >= 2 && (first === "\"" || first === "'") && value.at(-1) === first
		? value.slice(1, -1)
		: value;
}

async function expectedPstackSkills(): Promise<Set<string>> {
	const expected = new Set<string>();
	for (const entry of await readdir(BUNDLED_SKILLS, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const path = join(BUNDLED_SKILLS, entry.name, "SKILL.md");
		let text: string;
		try {
			text = await readFile(path, "utf8");
		} catch {
			continue;
		}
		if (/^disable-model-invocation:\s*true\s*$/m.test(text)) continue;
		const match = /^name:\s*(.+)$/m.exec(text);
		if (!match?.[1]) throw new Error(`${path} has no skill name`);
		expected.add(unquote(match[1].trim()));
	}
	assert.ok(expected.size > 0, "The checkout has no bundled pstack skills");
	return expected;
}

async function createFixture(prefix: string): Promise<Fixture> {
	const root = await mkdtemp(join(tmpdir(), prefix));
	const project = join(root, "project");
	const home = join(root, "home");
	const agent = join(home, ".pi/agent");
	const sessions = join(root, "sessions");
	await Promise.all([
		mkdir(project, { recursive: true }),
		mkdir(agent, { recursive: true }),
		mkdir(sessions, { recursive: true }),
	]);
	const runtime = join(root, "pstack-runtime.ts");
	await symlink(RUNTIME, runtime);
	return { root, project, home, agent, sessions, sheet: join(agent, "pstack-models.md"), runtime };
}

async function withPi<T>(
	fixture: Fixture,
	baseUrl: string,
	callback: (pi: Pi) => Promise<T>,
	args: readonly string[] = [],
): Promise<T> {
	const pi = new Pi({ ...fixture, baseUrl, args });
	try {
		return await callback(pi);
	} finally {
		await pi.close();
	}
}

async function main(): Promise<void> {
	const expectedPstack = await expectedPstackSkills();
	const requests = new ProviderRequests();
	const fixture = await createFixture("pstack-native-pi-");
	let server: Server | undefined;

	try {
		const provider = await startProvider(requests);
		server = provider.server;
		const { baseUrl } = provider;
		const sentinel = join(fixture.project, ".pi/skills/project-test-skill/SKILL.md");
		await mkdir(dirname(sentinel), { recursive: true });
		await writeFile(
			sentinel,
			"---\nname: project-test-skill\ndescription: Isolated regular project skill used by the Pi runtime test.\n---\nPROJECT_SKILL_BODY\n",
		);
		await writeFile(join(fixture.project, "AGENTS.md"), "PROJECT_CONTEXT_MUST_REMAIN\n");
		await writeFile(fixture.sheet, "# Pi models\nCONFIG_SECRET_ALPHA\n");

		const expectedRegular = new Set(["project-test-skill"]);
		const { defaultSession, pstackSession } = await withPi(
			fixture,
			baseUrl,
			async (pi) => {
				const plainSnapshot = await pi.snapshot();
				assert.deepEqual(
					plainSnapshot.skills.filter((skill) => !skill.disableModelInvocation).map((skill) => skill.name),
					["project-test-skill"],
				);
				assert.deepEqual(plainSnapshot.entries.map((entry) => entry.data), ["default"]);

				const defaultPayload = await turn(pi, requests, baseUrl, "Check plain mode.", expectedRegular);
				assert.match(systemText(defaultPayload), /PROJECT_CONTEXT_MUST_REMAIN/);
				assert.doesNotMatch(systemText(defaultPayload), /CONFIG_SECRET_ALPHA|pstack_models|setup-pstack/);
				const defaultSession = expectString((await pi.getState()).sessionFile, "Default session file");
				assert.equal(dirname(defaultSession), fixture.sessions);
				console.log("PASS plain session neither reads nor injects the Pstack model sheet");

				await pi.prompt("/pstack");
				const pstackSnapshot = await pi.snapshot();
				assert.deepEqual(pstackSnapshot.entries.map((entry) => entry.data), ["pstack"]);
				assert.ok(pstackSnapshot.skills.some((skill) => {
					const fromBundle = relative(BUNDLED_SKILLS, skill.filePath);
					return skill.name === "poteto-mode" && fromBundle && fromBundle !== ".." &&
						!fromBundle.startsWith(`..${sep}`);
				}));
				const pstackPayload = await turn(pi, requests, baseUrl, "Check Pstack mode.", expectedPstack);
				const pstackSession = expectString((await pi.getState()).sessionFile, "Pstack session file");
				assert.notEqual(pstackSession, defaultSession);
				assert.match(latestPstackSection(pstackPayload) ?? "", /CONFIG_SECRET_ALPHA/);
				assert.match(latestPstackSection(pstackPayload) ?? "", /poteto-mode[\\/]SKILL\.md/);
				assert.match(systemText(pstackPayload), /PROJECT_CONTEXT_MUST_REMAIN/);
				assert.deepEqual(defaultPayload.tools, pstackPayload.tools, "Pstack changed executable tools");
				assert.equal(
					withoutPstackSections(defaultPayload),
					withoutPstackSections(pstackPayload),
					"Pstack changed base or project prompt sections",
				);
				console.log("PASS /pstack advertises only bundled skills and preserves prompt/tool state");

				await writeFile(fixture.sheet, "# Pi models\nCONFIG_SECRET_BETA\n");
				const edited = await turn(pi, requests, baseUrl, "Read the edited model sheet.", expectedPstack);
				const editedSection = latestPstackSection(edited) ?? "";
				assert.match(editedSection, /CONFIG_SECRET_BETA/);
				assert.doesNotMatch(editedSection, /CONFIG_SECRET_ALPHA/);
				console.log("PASS Pstack rereads model configuration on every turn");

				await unlink(fixture.sheet);
				const missing = await turn(pi, requests, baseUrl, "Handle the missing model sheet.", expectedPstack);
				const missingSection = latestPstackSection(missing) ?? "";
				assert.match(missingSection, /setup-pstack/);
				assert.match(missingSection, /Do not use the Claude model defaults/);
				assert.match(missingSection, new RegExp(fixture.sheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
				console.log("PASS missing sheet gives Pi setup guidance without Claude defaults");

				await writeFile(fixture.sheet, "# Pi models\nCONFIG_SECRET_GAMMA\n");
				await pi.prompt("/pstack-test-reload");
				const reloaded = await turn(pi, requests, baseUrl, "Check reloaded Pstack mode.", expectedPstack);
				assert.match(latestPstackSection(reloaded) ?? "", /CONFIG_SECRET_GAMMA/);
				assert.deepEqual((await pi.snapshot()).entries.map((entry) => entry.data), ["pstack"]);

				await pi.newSession();
				const freshDefault = await turn(pi, requests, baseUrl, "Check /new default mode.", expectedRegular);
				assert.equal(latestPstackSection(freshDefault), undefined);
				await pi.switchSession(pstackSession);
				const resumed = await turn(pi, requests, baseUrl, "Check resumed Pstack mode.", expectedPstack);
				assert.match(latestPstackSection(resumed) ?? "", /CONFIG_SECRET_GAMMA/);
				await pi.switchSession(defaultSession);
				const resumedDefault = await turn(pi, requests, baseUrl, "Check resumed Default mode.", expectedRegular);
				assert.equal(latestPstackSection(resumedDefault), undefined);
				console.log("PASS reload, /new, and resume preserve their saved session modes");

				return { defaultSession, pstackSession };
			},
		);

		await withPi(fixture, baseUrl, async (pi) => {
			const restarted = await turn(pi, requests, baseUrl, "Resume after restart.", expectedPstack);
			assert.match(latestPstackSection(restarted) ?? "", /CONFIG_SECRET_GAMMA/);
		}, ["--session", pstackSession]);
		await withPi(fixture, baseUrl, async (pi) => {
			const savedDefault = await turn(pi, requests, baseUrl, "Keep saved Default mode.", expectedRegular);
			assert.equal(latestPstackSection(savedDefault), undefined);
		}, ["--session", defaultSession, "--pstack"]);
		await withPi(fixture, baseUrl, async (pi) => {
			const direct = await turn(pi, requests, baseUrl, "Start with --pstack.", expectedPstack);
			assert.match(latestPstackSection(direct) ?? "", /CONFIG_SECRET_GAMMA/);
			await pi.newSession();
			const afterNew = await turn(pi, requests, baseUrl, "New session is Default.", expectedRegular);
			assert.equal(latestPstackSection(afterNew), undefined);
		}, ["--pstack"]);
		console.log("PASS startup flag applies only to new startup sessions; restart honors saved mode");

		const invalid = await createFixture("pstack-native-invalid-");
		try {
			await withPi(invalid, baseUrl, async (pi) => {
				const plain = await turn(pi, requests, baseUrl, "Ignore a missing sheet in plain mode.", new Set());
				assert.equal(latestPstackSection(plain), undefined);
				assert.doesNotMatch(JSON.stringify(pi.events), /setup-pstack|Claude model defaults/);
			});
			await mkdir(invalid.sheet);
			await withPi(invalid, baseUrl, async (pi) => {
				const plain = await turn(pi, requests, baseUrl, "Ignore an invalid sheet in plain mode.", new Set());
				assert.equal(latestPstackSection(plain), undefined);
				assert.doesNotMatch(
					`${pi.stderrText()}\n${JSON.stringify(pi.events)}`,
					/EISDIR|illegal operation on a directory/i,
				);
				await pi.prompt("/pstack");
				const broken = await turn(pi, requests, baseUrl, "Surface an invalid Pstack sheet.", expectedPstack);
				assert.equal(latestPstackSection(broken), undefined);
				assert.match(
					`${pi.stderrText()}\n${JSON.stringify(pi.events)}`,
					/EISDIR|illegal operation on a directory/i,
				);
			});
			console.log("PASS missing and invalid sheets are untouched in plain mode; invalid errors surface in Pstack");
		} finally {
			await rm(invalid.root, { recursive: true, force: true });
		}
	} finally {
		try {
			if (server) await closeProvider(server);
		} finally {
			await rm(fixture.root, { recursive: true, force: true });
		}
	}
}

await main();
