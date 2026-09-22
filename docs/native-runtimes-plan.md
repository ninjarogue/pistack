# Pi and OpenCode native support

## Goal

The fork owns runtime integration. Neither Pi nor OpenCode requires global instructions to load pstack model preferences. Existing model sheets remain private and runtime-specific. Normal sessions do not receive pstack's model configuration. Runtime integration does not silently change the parent model or bypass permissions.

## Grounding

- Upstream revision: `2fe2002190bff9257d3e27f84ba6818f2cfd7e32`.
- Upstream has 54 skills, a model-section generator, Claude/Codex plugin manifests, and 192 passing fixture tests.
- The existing Pi mode integration is a separate user-owned extension. It discovers a hard-coded upstream skills path and persists `pstack-mode` metadata, but does not load model configuration.
- Pi 0.87 supports package manifests, conditional skill discovery, persisted custom entries, and mutable per-turn system-prompt sections.
- OpenCode 2.0.12 discovers skills on demand and accepts a configured skill directory. Its model and agent interfaces differ from Pi. Do not infer authenticated models from the user's existing override sheet.

## Alternatives

1. Put a conditional loader in global AGENTS.md or OpenCode instructions. Rejected: the user explicitly wants the package to own this behavior.
2. Ship separate copies of every skill for each runtime. Rejected: duplicated workflow content would drift.
3. Ship one skill tree with a generated native-runtime entry instruction, a bundled Pi mode extension, and an OpenCode agent/install adapter. Selected: runtime-specific lifecycle stays at the boundary; workflow content remains shared.

## Shape

- Root `package.json`: Pi package manifest; load the bundled extension, not all pstack skills globally.
- `runtimes/pi/index.ts`: preserve current Default/Pstack session semantics and use a package-relative skills directory. In Pstack mode only, load the current model sheet into a named prompt section and instruct the agent to follow poteto-mode. Do not replace other prompt sections or change the parent model. Missing configuration must produce setup guidance, not Claude defaults.
- `plugins/pstack/skills/poteto-mode/references/runtimes.md`: first-class Pi and OpenCode instructions, configuration paths, native tool names, model discovery, delegation limitations, and opt-in scope. Runtime-specific paths respect configuration-directory overrides.
- Generator-owned skill entry blocks: all skills lead to the runtime guide. Direct invocation works without global instructions. Claude/Codex remain compatibility paths, not the instructions Pi follows.
- `setup-pstack`: native Pi/OpenCode branch writes only the selected runtime's sheet. No AGENTS.md edits and no global OpenCode instructions include.
- `runtimes/opencode`: an opt-in pstack agent and a repeatable installer that preserves unrelated configuration, loads the fork's skill tree, and never copies credentials or overwrites model choices.
- Tests: existing suite plus generator invariants, installation idempotence and collision safety, and a real Pi CLI/local-provider test that inspects outgoing requests.

## Work sequence

- [x] Inspect upstream and installed runtimes; fork and clone; run baseline tests.
- [x] Implement package-relative Pi mode and native skill/config entry points.
- [x] Add OpenCode installation/agent support and verify discovery.
- [x] Prove ordinary-session isolation, Pstack model loading, resume/reload, and configuration refresh.
- [x] Review generated changes and documentation; run all tests.
- [x] Push the fork; switch installed resources with backups; remove only the workaround block added in this session.

## Verification gates

A plain Pi turn must not include the pstack model sheet. A Pstack turn must include its current contents without any AGENTS.md pointer. Editing the sheet must affect the next Pstack turn, not unrelated sessions. Restart/resume must preserve mode. Every skill entry must direct Pi/OpenCode to native runtime configuration, including standalone setup and review skills. OpenCode must discover the fork's pstack skills and agent while its global instructions no longer include the model sheet. Existing runtime-specific model choices must remain intact. Claims about live model delegation require an actual run, not just a model-name table.

## Limits

This phase does not invent an Agent tool on Pi, assume OpenCode task calls accept arbitrary models, or claim that prompt preferences enforce routing. Native delegation must use an installed model-capable tool or documented runtime CLI. Missing capabilities must be reported rather than bypassed.
