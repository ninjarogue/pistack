---
name: setup-pstack
description: Configure which models pstack uses per role. Detects available models and writes the current runtime's private sheet. Use for /setup-pstack, "configure pstack models", changing pstack's model choices, or changing the legacy SessionStart hook.
---

<!-- pstack-runtime-bootstrap:start -->
> **Runtime bootstrap.** Before following this skill, read the [runtime guide](../poteto-mode/references/runtimes.md). Its Pi and OpenCode rules for tools, models, delegation, configuration, and session history take precedence over legacy Claude or Codex instructions below.
<!-- pstack-runtime-bootstrap:end -->

# Setup pstack

## Pi and OpenCode

This is the first branch. If the current runtime is Pi or OpenCode, follow this section and stop before [Legacy Claude Code and Codex](#legacy-claude-code-and-codex). Read the [native runtime guide](../poteto-mode/references/runtimes.md) first. Detect the host from its runtime, tools, and environment, never from the model provider.

### 1. Inventory native models

Run exactly the current runtime's inventory command:

```shell
pi --offline --list-models
opencode models
```

Use the Pi command on Pi and the OpenCode command on OpenCode. If the inventory is empty or the command fails, **STOP**. Say model discovery is blocked. An existing private sheet does not prove that its IDs are still available.

### 2. Resolve and read the native sheet

Resolve only the current runtime's path:

- Pi uses `${PI_CODING_AGENT_DIR}/pstack-models.md` when `PI_CODING_AGENT_DIR` is set, otherwise `~/.pi/agent/pstack-models.md`.
- OpenCode uses `${OPENCODE_CONFIG_DIR}/pstack-models.md` when `OPENCODE_CONFIG_DIR` is set, otherwise `${XDG_CONFIG_HOME}/opencode/pstack-models.md` when `XDG_CONFIG_HOME` is set, otherwise `~/.config/opencode/pstack-models.md`.

Read the existing sheet when present and preserve its valid choices. Do not read or edit the other runtime's sheet.

### 3. Validate and confirm

Show each current role choice and the implementation model and effort. Every real model ID must occur in the fresh inventory. Offer only listed IDs plus `inherit-parent` and `auto`. A native alias is valid only when the current inherited model is known and is in that inventory; otherwise require a listed real ID. Ask the user to confirm the complete mapping before writing.

OpenCode IDs use `provider/model` and, only when listed, `provider/model#variant`. Do not invent `--variant` or a model parameter for OpenCode native tasks. Pi provider and model values must also come from its list.

### 4. Write the native sheet

Overwrite only the resolved `pstack-models.md`. Keep existing valid user choices; use the generic alias defaults below only for a new sheet and only after validating the inherited model. Replace `pi-or-opencode` with the detected runtime. `implementation effort` is an instruction for all code-writing work, including worker sessions.

```markdown
# pstack native model configuration

runtime: pi-or-opencode
implementation model: inherit-parent
implementation effort: high
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
strongest judgment: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent
arena cross-judge pool: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent
interrogate reviewers: inherit-parent
```

### 5. Confirm native scope

Report the path written, selected IDs, aliases, and effort. Do not edit `AGENTS.md`, `CLAUDE.md`, OpenCode `instructions`, `opencode.json`, auth files, or global hooks. The active pstack skill or OpenCode `pstack` agent reads the sheet directly. Ordinary sessions stay untouched.

## Legacy Claude Code and Codex

On Codex, read the [platform mapping](../poteto-mode/references/codex-tools.md), including its per-skill notes. The steps below apply only to Claude Code and Codex. The SessionStart hook is legacy behavior and does not apply to Pi or OpenCode.

### 1. Detect available models

Enumerate the model slugs accepted by the current legacy runtime. The Claude-only defaults are listed in [Models](#models). Ask the user to confirm additional slugs. Never write a real slug not confirmed as available. `inherit-parent` and `auto` omit the model on the legacy subagent call.

### 2. Load current state

Read the current runtime's sheet. Claude Code uses `~/.claude/pstack-models.md`; Codex uses `~/.codex/pstack-models.md`. Treat existing values as current choices and preserve valid choices.

### 3. Map and confirm

Show every role and mark unavailable real slugs. Ask whether to retain or change each role. Panel values remain comma-separated lists. Prefer the runtime's structured question tool when one exists.

### 4. Choose the legacy session hook

Ask whether the Claude Code or Codex SessionStart hook stays on. The default is on. This setting is inert on Pi and OpenCode.

### 5. Validate

Every real slug written must be in the detected set. If one is unavailable, stop and ask again.

### 6. Write the override sheet

Overwrite the whole legacy sheet so reruns are idempotent.

```markdown
# pstack model configuration

Per-role model overrides for pstack skills. Each pstack SKILL.md names its defaults in a Models section; the values here override those defaults. Delete a line to fall back to the skill default. A value of `inherit-parent` or `auto` runs that role on the parent session's model (the `Agent` call omits `model`); an alias entry in a panel list still counts toward that panel's fan-out. `session hook: off` stops the Claude Code or Codex SessionStart hook from injecting the poteto-mode mandate; any other value, or no line, leaves it on.

feature, refactoring: claude-opus-5
bug-fix: claude-fable-5-1
perf-issue: claude-fable-5-1
hillclimb: claude-fable-5-1
judgment and prose: claude-opus-5
strongest judgment: claude-fable-5-1
how explorer: claude-opus-5
how explainer: claude-opus-5
why investigators: claude-opus-5
why synthesizer: claude-opus-5
reflect tooling: claude-opus-5
reflect judgment, divergent, synthesizer: claude-opus-5
arena runners: claude-opus-5, claude-fable-5-1, claude-sonnet-5
arena cross-judge pool: claude-opus-5, claude-fable-5-1, claude-sonnet-5
swarm workers: claude-opus-5
architect runners: claude-opus-5, claude-fable-5-1, claude-sonnet-5
interrogate reviewers: claude-opus-5, claude-fable-5-1, claude-sonnet-5

session hook: on
```

### 7. Wire in the legacy sheet

On Claude Code, include `@~/.claude/pstack-models.md` from the chosen `CLAUDE.md`. On Codex, paste only the model rows into the chosen `AGENTS.md`; the plugin reads the hook setting directly from `~/.codex/pstack-models.md`.

### 8. Confirm legacy scope

Report the sheet path, loading mechanism, and hook setting.

## Models

Claude-only defaults stamped from `plugins/pstack/models.json` (edit there, rerun `tools/generate.mjs`). They are not native defaults. Pi and OpenCode use the private runtime sheet described in the [native runtime rules](../poteto-mode/references/runtimes.md#model-policy).

- Available Claude models: Opus 5 (`claude-opus-5`), Opus 4.8 (`claude-opus-4-8`), Opus 4.6 (`claude-opus-4-6`), Fable 5.1 (`claude-fable-5-1`), Sonnet 5 (`claude-sonnet-5`), Sonnet 4.6 (`claude-sonnet-4-6`), Haiku 4.5 (`claude-haiku-4-5`)
- Default panel: `claude-opus-5`, `claude-fable-5-1`, `claude-sonnet-5`
- Single-role default: `claude-opus-5`
