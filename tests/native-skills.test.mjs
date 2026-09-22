import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { NATIVE_BOOTSTRAP, agentSkills, applyNativeBootstrap } from "../tools/generate.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const skillsRoot = join(repo, "plugins", "pstack", "skills");

function text(path) {
  return readFileSync(join(repo, path), "utf8");
}

describe("native skill entrypoints", () => {
  test("all 54 skills carry the same generator-owned bootstrap after frontmatter", () => {
    const skills = agentSkills(skillsRoot);
    expect(skills).toHaveLength(54);
    for (const skill of skills) {
      const source = text(`plugins/pstack/skills/${skill.name}/SKILL.md`);
      expect(source.match(/pstack-runtime-bootstrap:start/g)).toHaveLength(1);
      expect(source).toContain(NATIVE_BOOTSTRAP);
      expect(source.indexOf(NATIVE_BOOTSTRAP)).toBeGreaterThan(source.indexOf("\n---\n"));
      expect(applyNativeBootstrap(source)).toBe(source);
    }
  });

  test("the guide defines private Pi config without provider inference or fake agents", () => {
    const guide = text("plugins/pstack/skills/poteto-mode/references/runtimes.md");
    expect(guide).toContain("PI_CODING_AGENT_DIR");
    expect(guide).toContain("PI_SESSION_FILE");
    expect(guide).toContain("Do not infer the runtime from the model provider");
    expect(guide).toContain("does not acquire a fictitious `Agent`, `Task`, or `subagent_type` tool");
    expect(guide).toContain("pi --offline --no-session --provider PROVIDER --model MODEL --thinking THINKING --print @TASK_FILE");
    expect(guide).not.toContain("OpenCode");
    expect(guide).not.toContain("OPENCODE_CONFIG_DIR");
  });

  test("separate native CLIs receive the validated parent model explicitly", () => {
    const guide = text("plugins/pstack/skills/poteto-mode/references/runtimes.md");
    expect(guide).toContain("omitting its model selection uses that process's persisted defaults, not the parent session model");
    expect(guide).toContain("For every separately launched CLI");
    expect(guide).toContain("both `PI_PROVIDER` and `PI_MODEL`");
    expect(guide).toContain("Unknown parent identity blocks inheritance");
    expect(guide).toContain("Never infer parent identity from default or persisted settings");
    expect(guide).toContain("minimum-reasoning policy, including any prose overrides");
    expect(guide).toContain("do not assume they are stored under literal `implementation model` or `implementation effort` keys");
    expect(guide).not.toContain("`inherit-parent` and `auto` mean omission of a CLI model selection");
  });

  test("generated model sections label legacy defaults and link native policy", () => {
    for (const name of ["poteto-mode", "how", "why", "reflect", "arena", "swarm", "architect"]) {
      const source = text(`plugins/pstack/skills/${name}/SKILL.md`);
      expect(source).toContain("These are inherited Claude-only defaults");
      expect(source).toContain("references/runtimes.md#model-policy");
    }
  });

  test("Pi setup is before inherited setup and forbids global configuration edits", () => {
    const setup = text("plugins/pstack/skills/setup-pstack/SKILL.md");
    expect(setup.indexOf("## Pi")).toBeLessThan(setup.indexOf("## Inherited Claude Code and Codex"));
    expect(setup).toContain("If the inventory is empty or the command fails, **STOP**");
    expect(setup).toContain("Do not edit `AGENTS.md`");
    expect(setup).toContain("runtime: pi");
    expect(setup).toContain("implementation model: inherit-parent");
    expect(setup).toContain("implementation effort: high");
    expect(setup).not.toContain("OpenCode");
    expect(setup).not.toContain("pi-or-opencode");
  });
});
