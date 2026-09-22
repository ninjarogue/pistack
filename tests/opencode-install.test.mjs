import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  installOpenCode,
  resolveOpenCodeConfigDir,
  skillNames,
} from "../tools/install-opencode.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const scratch = [];

function temp() {
  const path = mkdtempSync(join(tmpdir(), "pstack-opencode-test-"));
  scratch.push(path);
  return path;
}

function snapshot(root) {
  if (!existsSync(root)) return [];
  const walk = (path) => readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    const stat = lstatSync(child);
    if (stat.isSymbolicLink()) return [`L ${child.slice(root.length + 1)} -> ${readlinkSync(child)}`];
    if (stat.isDirectory()) return [`D ${child.slice(root.length + 1)}`, ...walk(child)];
    return [`F ${child.slice(root.length + 1)} ${readFileSync(child, "utf8")}`];
  });
  return walk(root).sort();
}

afterEach(() => {
  for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("OpenCode installer", () => {
  test("resolves config environment precedence", () => {
    expect(resolveOpenCodeConfigDir({ OPENCODE_CONFIG_DIR: "./explicit", XDG_CONFIG_HOME: "/xdg" }, "/home/u"))
      .toBe(resolve("./explicit"));
    expect(resolveOpenCodeConfigDir({ XDG_CONFIG_HOME: "/xdg" }, "/home/u")).toBe("/xdg/opencode");
    expect(resolveOpenCodeConfigDir({}, "/home/u")).toBe("/home/u/.config/opencode");
  });

  test("links every skill and agent while preserving private config", () => {
    const config = join(temp(), "config");
    mkdirSync(config, { recursive: true });
    const preserved = {
      "opencode.json": "{\"theme\":\"mine\"}\n",
      "pstack-models.md": "private/provider-model\n",
      "auth.json": "private\n",
      "AGENTS.md": "unrelated instructions\n",
    };
    for (const [name, value] of Object.entries(preserved)) writeFileSync(join(config, name), value);

    const result = installOpenCode({ repoRoot: repo, configDir: config });
    const names = skillNames(repo);
    expect(names).toHaveLength(54);
    expect(result.created).toHaveLength(55);
    for (const name of names) {
      const link = join(config, "skills", name);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(resolve(dirname(link), readlinkSync(link))).toBe(join(repo, "plugins", "pstack", "skills", name));
    }
    const agent = join(config, "agents", "pstack.md");
    expect(lstatSync(agent).isSymbolicLink()).toBe(true);
    expect(resolve(dirname(agent), readlinkSync(agent))).toBe(join(repo, "runtimes", "opencode", "pstack.md"));
    for (const [name, value] of Object.entries(preserved)) expect(readFileSync(join(config, name), "utf8")).toBe(value);
  });

  test("a second run has an empty filesystem diff", () => {
    const config = join(temp(), "config");
    installOpenCode({ repoRoot: repo, configDir: config });
    const before = snapshot(config);
    const result = installOpenCode({ repoRoot: repo, configDir: config });
    expect(result.created).toEqual([]);
    expect(result.unchanged).toHaveLength(55);
    expect(snapshot(config)).toEqual(before);
  });

  test("dry-run reports all links and writes nothing", () => {
    const config = join(temp(), "missing-config");
    const result = installOpenCode({ repoRoot: repo, configDir: config, dryRun: true });
    expect(result.created).toHaveLength(55);
    expect(existsSync(config)).toBe(false);
  });

  test("one collision refuses the full plan without partial changes", () => {
    const config = join(temp(), "config");
    const collision = join(config, "skills", "arena");
    mkdirSync(dirname(collision), { recursive: true });
    writeFileSync(collision, "custom\n");
    const before = snapshot(config);

    expect(() => installOpenCode({ repoRoot: repo, configDir: config })).toThrow("no changes made");
    expect(snapshot(config)).toEqual(before);
    expect(existsSync(join(config, "agents"))).toBe(false);
  });
});
