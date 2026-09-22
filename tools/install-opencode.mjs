#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = realpathSync(fileURLToPath(import.meta.url));
const defaultRepoRoot = realpathSync(resolve(dirname(modulePath), ".."));

export function resolveOpenCodeConfigDir(env = process.env, home = homedir()) {
  if (env.OPENCODE_CONFIG_DIR) return resolve(env.OPENCODE_CONFIG_DIR);
  if (env.XDG_CONFIG_HOME) return resolve(env.XDG_CONFIG_HOME, "opencode");
  return resolve(home, ".config", "opencode");
}

export function skillNames(repoRoot = defaultRepoRoot) {
  const root = join(repoRoot, "plugins", "pstack", "skills");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function destinationState(path, target) {
  if (!existsSync(path) && !lstatExists(path)) return "create";
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() && existsSync(path) && realpathSync(path) === realpathSync(target)) return "unchanged";
  return "collision";
}

// existsSync is false for a broken symlink, while a broken custom link is still
// a collision that must never be overwritten.
function lstatExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function parentCollision(path) {
  let current = resolve(path);
  while (!lstatExists(current)) {
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  try {
    return statSync(current).isDirectory() ? null : `${current} exists and is not a directory`;
  } catch (error) {
    return `${current}: ${error.message}`;
  }
}

export function installOpenCode({
  repoRoot = defaultRepoRoot,
  configDir = resolveOpenCodeConfigDir(),
  dryRun = false,
} = {}) {
  const root = realpathSync(resolve(repoRoot));
  const config = resolve(configDir);
  const skillsSource = join(root, "plugins", "pstack", "skills");
  const agentSource = join(root, "runtimes", "opencode", "pstack.md");
  if (!existsSync(agentSource)) throw new Error(`OpenCode agent template is missing: ${agentSource}`);

  const entries = skillNames(root).map((name) => ({
    kind: "skill",
    name,
    target: join(skillsSource, name),
    path: join(config, "skills", name),
  }));
  entries.push({ kind: "agent", name: "pstack", target: agentSource, path: join(config, "agents", "pstack.md") });

  const collisions = [];
  for (const parent of [config, join(config, "skills"), join(config, "agents")]) {
    const problem = parentCollision(parent);
    if (problem) collisions.push(problem);
  }
  for (const entry of entries) {
    entry.state = destinationState(entry.path, entry.target);
    if (entry.state === "collision") collisions.push(`${entry.path} already exists and is not this installer's link`);
  }
  if (collisions.length) {
    throw new Error(`OpenCode install refused; no changes made:\n- ${[...new Set(collisions)].join("\n- ")}`);
  }

  const created = entries.filter((entry) => entry.state === "create");
  const unchanged = entries.filter((entry) => entry.state === "unchanged");
  if (!dryRun && created.length) {
    mkdirSync(join(config, "skills"), { recursive: true });
    mkdirSync(join(config, "agents"), { recursive: true });
    for (const entry of created) {
      const target = relative(realpathSync(dirname(entry.path)), realpathSync(entry.target));
      symlinkSync(target, entry.path, entry.kind === "skill" ? "dir" : "file");
    }
  }

  return {
    configDir: config,
    dryRun,
    created: created.map(({ path, target }) => ({ path, target })),
    unchanged: unchanged.map(({ path, target }) => ({ path, target })),
    paths: entries.map(({ path }) => path),
  };
}

function parseArgs(args) {
  let configDir;
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--config-dir") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) throw new Error("--config-dir requires a path");
      configDir = value;
      i += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { configDir, dryRun };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = installOpenCode({
    configDir: args.configDir ?? resolveOpenCodeConfigDir(),
    dryRun: args.dryRun,
  });
  const verb = result.dryRun ? "would link" : "linked";
  for (const entry of result.created) console.log(`${verb}: ${entry.path} -> ${entry.target}`);
  for (const entry of result.unchanged) console.log(`unchanged: ${entry.path} -> ${entry.target}`);
  console.log(`${result.dryRun ? "dry run for" : "OpenCode pstack installed in"}: ${result.configDir}`);
}

if (process.argv[1] && modulePath === realpathSync(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
  }
}
