import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function localProvider(pi: ExtensionAPI) {
	const baseUrl = process.env.PSTACK_NATIVE_TEST_URL;
	if (!baseUrl?.startsWith("http://127.0.0.1:")) {
		throw new Error("PSTACK_NATIVE_TEST_URL must point to the local test server.");
	}
	pi.registerProvider("pstack-native-test", {
		baseUrl,
		apiKey: "local-test-only",
		api: "openai-completions",
		models: [{
			id: "fixture",
			name: "Local Pstack native verification fixture",
			reasoning: false,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 1_000_000,
			maxTokens: 128,
		}],
	});
}
