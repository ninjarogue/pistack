import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

describe("bundled Pi package manifest", () => {
  test("loads only the mode extension by default", () => {
    expect(manifest.name).toBe("@ninjarogue/pstack-native");
    expect(manifest.private).toBe(true);
    expect(manifest.pi).toEqual({
      extensions: ["./runtimes/pi/index.ts"],
      skills: [],
    });
    expect(manifest.dependencies).toBeUndefined();
  });

  test("keeps live Pi verification explicit", () => {
    expect(manifest.scripts.test).toBe("bun test tests/");
    expect(manifest.scripts["test:pi"]).toContain("tests/pi/verify.ts");
  });

  test("ships no fork-authored OpenCode adapter", () => {
    expect(manifest.description).toBe("Native Pi runtime for pstack.");
    expect(existsSync(join(root, "runtimes", "opencode"))).toBe(false);
    expect(existsSync(join(root, "tools", "install-opencode.mjs"))).toBe(false);
  });
});
