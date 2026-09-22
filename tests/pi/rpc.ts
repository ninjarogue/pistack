import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type JsonObject = { [key: string]: unknown };

export interface PiModel {
	provider: string;
	id: string;
	baseUrl: string;
}

export interface PiState {
	model: PiModel | undefined;
	isStreaming: boolean;
	sessionFile: string | undefined;
	sessionId: string;
}

export interface SkillSnapshot {
	name: string;
	filePath: string;
	disableModelInvocation: boolean;
}

export interface SessionSnapshot {
	skills: SkillSnapshot[];
	entries: Array<{ data: unknown }>;
}

interface PendingCall {
	command: string;
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface SettledWaiter {
	resolve: () => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export interface PiOptions {
	project: string;
	agent: string;
	home: string;
	sessions: string;
	baseUrl: string;
	runtime?: string;
	args?: readonly string[];
}

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const RUNTIME = join(ROOT, "runtimes/pi/index.ts");
export const BUNDLED_SKILLS = join(ROOT, "plugins/pstack/skills");

export function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function expectObject(value: unknown, label: string): JsonObject {
	if (!isObject(value)) throw new Error(`${label} must be an object`);
	return value;
}

export function expectString(value: unknown, label: string): string {
	if (typeof value !== "string") throw new Error(`${label} must be a string`);
	return value;
}

function expectBoolean(value: unknown, label: string): boolean {
	if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`);
	return value;
}

function expectObjectArray(value: unknown, label: string): JsonObject[] {
	if (!Array.isArray(value) || !value.every(isObject)) {
		throw new Error(`${label} must be an array of objects`);
	}
	return value;
}

function errorMessage(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

export class Pi {
	readonly events: JsonObject[] = [];
	readonly notifications: JsonObject[] = [];

	private readonly process: ChildProcessWithoutNullStreams;
	private readonly pendingCalls = new Map<string, PendingCall>();
	private readonly settledWaiters: SettledWaiter[] = [];
	private stdoutBuffer = Buffer.alloc(0);
	private stderr = "";
	private nextRequestId = 0;
	private closing = false;
	private exitError: Error | undefined;

	constructor(options: PiOptions) {
		this.process = spawn(
			"pi",
			[
				"--mode",
				"rpc",
				"--offline",
				"--approve",
				"--no-extensions",
				"--session-dir",
				options.sessions,
				"--extension",
				options.runtime ?? RUNTIME,
				"--extension",
				join(ROOT, "tests/pi/local-provider.ts"),
				"--extension",
				join(ROOT, "tests/pi/inspect.ts"),
				"--provider",
				"pstack-native-test",
				"--model",
				"fixture",
				...(options.args ?? []),
			],
			{
				cwd: options.project,
				env: {
					...process.env,
					HOME: options.home,
					XDG_CONFIG_HOME: join(options.home, ".config"),
					PI_CODING_AGENT_DIR: options.agent,
					PI_OFFLINE: "1",
					PSTACK_NATIVE_TEST_URL: options.baseUrl,
				},
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		this.process.stdout.on("data", (chunk: Buffer) => this.readStdout(chunk));
		this.process.stderr.on("data", (chunk: Buffer) => {
			this.stderr += chunk.toString("utf8");
		});
		this.process.on("error", (error) => this.failProcess(new Error(`Pi process error: ${error.message}`)));
		this.process.on("exit", (code, signal) => {
			if (!this.closing) {
				this.failProcess(new Error(`Pi exited (code=${code}, signal=${signal}).${this.stderrSuffix()}`));
			}
		});
		this.process.stdin.on("error", (error) => {
			if (!this.closing) this.failProcess(new Error(`Pi stdin error: ${error.message}.${this.stderrSuffix()}`));
		});
	}

	async prompt(message: string): Promise<void> {
		await this.call("prompt", { message });
	}

	async promptAndWait(message: string, timeoutMs = 60_000): Promise<void> {
		const waiter = this.createSettledWaiter(timeoutMs);
		try {
			await this.prompt(message);
			await waiter.promise;
		} catch (error) {
			waiter.cancel();
			throw error;
		}
	}

	async getState(): Promise<PiState> {
		const data = expectObject(await this.call("get_state"), "get_state response");
		let model: PiModel | undefined;
		if (data.model !== undefined) {
			const rawModel = expectObject(data.model, "get_state model");
			model = {
				provider: expectString(rawModel.provider, "model.provider"),
				id: expectString(rawModel.id, "model.id"),
				baseUrl: expectString(rawModel.baseUrl, "model.baseUrl"),
			};
		}
		return {
			model,
			isStreaming: expectBoolean(data.isStreaming, "state.isStreaming"),
			sessionFile: data.sessionFile === undefined
				? undefined
				: expectString(data.sessionFile, "state.sessionFile"),
			sessionId: expectString(data.sessionId, "state.sessionId"),
		};
	}

	async getMessages(): Promise<JsonObject[]> {
		const data = expectObject(await this.call("get_messages"), "get_messages response");
		return expectObjectArray(data.messages, "get_messages messages");
	}

	async newSession(): Promise<void> {
		const data = expectObject(await this.call("new_session"), "new_session response");
		if (expectBoolean(data.cancelled, "new_session.cancelled")) {
			throw new Error("Pi cancelled the new session");
		}
	}

	async switchSession(sessionPath: string): Promise<void> {
		const data = expectObject(
			await this.call("switch_session", { sessionPath }),
			"switch_session response",
		);
		if (expectBoolean(data.cancelled, "switch_session.cancelled")) {
			throw new Error(`Pi cancelled the switch to ${sessionPath}`);
		}
	}

	async snapshot(): Promise<SessionSnapshot> {
		await this.prompt("/pstack-test-inspect");
		const messages = await this.getMessages();
		const message = messages.findLast((candidate) => candidate.customType === "pstack-native-test");
		if (!message) throw new Error("The inspect extension did not return a snapshot");
		const details = expectObject(message.details, "snapshot details");
		const skills = expectObjectArray(details.skills, "snapshot skills").map((skill) => ({
			name: expectString(skill.name, "snapshot skill name"),
			filePath: expectString(skill.filePath, "snapshot skill filePath"),
			disableModelInvocation: expectBoolean(
				skill.disableModelInvocation,
				"snapshot skill disableModelInvocation",
			),
		}));
		const entries = expectObjectArray(details.entries, "snapshot entries").map((entry) => ({
			data: entry.data,
		}));
		return { skills, entries };
	}

	stderrText(): string {
		return this.stderr;
	}

	async close(): Promise<void> {
		if (this.closing) return;
		this.closing = true;
		const error = new Error(`Pi process closed.${this.stderrSuffix()}`);
		this.rejectPending(error);
		this.process.stdin.end();
		if (this.process.exitCode === null && this.process.signalCode === null) {
			this.process.kill("SIGTERM");
			if (!(await this.waitForExit(5_000))) {
				this.process.kill("SIGKILL");
				await this.waitForExit(5_000);
			}
		}
	}

	private call(command: string, fields: JsonObject = {}): Promise<unknown> {
		if (this.exitError) return Promise.reject(this.exitError);
		if (this.closing) return Promise.reject(new Error("Pi process is closing"));
		if (!this.process.stdin.writable) {
			return Promise.reject(new Error(`Pi stdin is not writable.${this.stderrSuffix()}`));
		}

		const id = String(++this.nextRequestId);
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingCalls.delete(id);
				reject(new Error(`${command} timed out.${this.stderrSuffix()}`));
			}, 60_000);
			this.pendingCalls.set(id, { command, resolve, reject, timer });
			this.process.stdin.write(`${JSON.stringify({ id, type: command, ...fields })}\n`, (error) => {
				if (!error) return;
				const pending = this.pendingCalls.get(id);
				if (!pending) return;
				this.pendingCalls.delete(id);
				clearTimeout(pending.timer);
				pending.reject(new Error(`Could not send ${command}: ${error.message}`));
			});
		});
	}

	private readStdout(chunk: Buffer): void {
		this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, chunk]);
		let newline = this.stdoutBuffer.indexOf(0x0a);
		while (newline !== -1) {
			const line = this.stdoutBuffer.subarray(0, newline).toString("utf8");
			this.stdoutBuffer = this.stdoutBuffer.subarray(newline + 1);
			this.handleLine(line);
			newline = this.stdoutBuffer.indexOf(0x0a);
		}
	}

	private handleLine(line: string): void {
		let event: unknown;
		try {
			event = JSON.parse(line);
		} catch {
			return;
		}
		if (!isObject(event)) return;

		this.events.push(event);
		if (event.type === "extension_ui_request") this.notifications.push(event);
		if (event.type === "agent_settled") {
			const waiter = this.settledWaiters.shift();
			if (waiter) {
				clearTimeout(waiter.timer);
				waiter.resolve();
			}
		}
		if (event.type !== "response" || typeof event.id !== "string") return;

		const pending = this.pendingCalls.get(event.id);
		if (!pending) return;
		this.pendingCalls.delete(event.id);
		clearTimeout(pending.timer);
		if (event.success !== true) {
			pending.reject(new Error(`${pending.command} failed: ${errorMessage(event.error)}`));
			return;
		}
		pending.resolve(event.data);
	}

	private createSettledWaiter(timeoutMs: number): { promise: Promise<void>; cancel: () => void } {
		let waiter: SettledWaiter | undefined;
		const promise = new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				if (waiter) this.removeSettledWaiter(waiter);
				reject(new Error(`Timed out waiting for the model turn to settle.${this.stderrSuffix()}`));
			}, timeoutMs);
			waiter = { resolve, reject, timer };
			this.settledWaiters.push(waiter);
		});
		return {
			promise,
			cancel: () => {
				if (!waiter) return;
				clearTimeout(waiter.timer);
				this.removeSettledWaiter(waiter);
			},
		};
	}

	private removeSettledWaiter(waiter: SettledWaiter): void {
		const index = this.settledWaiters.indexOf(waiter);
		if (index !== -1) this.settledWaiters.splice(index, 1);
	}

	private failProcess(error: Error): void {
		if (this.exitError) return;
		this.exitError = error;
		this.rejectPending(error);
	}

	private rejectPending(error: Error): void {
		for (const pending of this.pendingCalls.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pendingCalls.clear();
		for (const waiter of this.settledWaiters.splice(0)) {
			clearTimeout(waiter.timer);
			waiter.reject(error);
		}
	}

	private stderrSuffix(): string {
		const stderr = this.stderr.trim();
		return stderr ? ` Stderr: ${stderr}` : "";
	}

	private waitForExit(timeoutMs: number): Promise<boolean> {
		if (this.process.exitCode !== null || this.process.signalCode !== null) return Promise.resolve(true);
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.process.off("exit", onExit);
				resolve(false);
			}, timeoutMs);
			const onExit = () => {
				clearTimeout(timer);
				resolve(true);
			};
			this.process.once("exit", onExit);
		});
	}
}
