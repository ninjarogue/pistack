# Pi native support

## Status

Implemented. On 2026-09-23 the fork narrowed its maintained runtime scope to Pi. Fork-authored adapters for other native runtimes were removed. Claude Code and Codex artifacts remain only as unsupported inherited compatibility so the skill tree can continue syncing with `michael-denyer/pstack-claude`.

## Goal

The fork owns a Pi integration that does not require global instructions to load pstack model preferences. Existing model sheets remain private. Normal Pi sessions do not receive pstack's model configuration. The integration does not silently change the parent model or bypass permissions.

## Grounding

- Upstream revision: `2fe2002190bff9257d3e27f84ba6818f2cfd7e32`.
- Upstream has 54 skills, a model-section generator, and inherited Claude Code/Codex plugin artifacts.
- Pi 0.87 supports package manifests, conditional skill discovery, persisted custom entries, and mutable per-turn system-prompt sections.
- Model availability comes from Pi's live inventory, never from a user's existing override sheet or the apparent provider.

## Alternatives

1. Put a conditional loader in global `AGENTS.md`. Rejected: the package must own its behavior without affecting ordinary sessions.
2. Copy every skill into a Pi-specific tree. Rejected: duplicated workflow content would drift.
3. Share one skill tree and keep runtime lifecycle at the package boundary. Selected: the Pi extension owns discovery, mode state, and prompt injection while workflow content remains shared.
4. Maintain additional native-runtime adapters. Rejected: pistack supports, documents, tests, and installs Pi only.

## Shape

- Root `package.json`: Pi package manifest; load the bundled extension, not all pstack skills globally.
- `runtimes/pi/index.ts`: preserve Default/Pstack session semantics and use a package-relative skills directory. In Pstack mode only, load the current model sheet into a named prompt section and instruct the agent to follow poteto-mode. Do not replace other prompt sections or change the parent model. Missing configuration produces setup guidance, not Claude defaults.
- `plugins/pstack/skills/poteto-mode/references/runtimes.md`: Pi instructions, configuration paths, native tool names, model discovery, delegation limitations, and opt-in scope.
- Generator-owned skill entry blocks: every skill points Pi to the runtime guide. Direct invocation works without global instructions.
- `setup-pstack`: the supported branch writes only Pi's sheet. No `AGENTS.md` edits or global includes.
- Tests: generator invariants plus a real Pi CLI/local-provider suite that inspects outgoing requests.
- Inherited Claude Code and Codex files stay intact enough for upstream synchronization, but pistack makes no support claim for those runtimes.

## Verification gates

A plain Pi turn must not include the pstack model sheet. A Pstack turn must include its current contents without an `AGENTS.md` pointer. Editing the sheet must affect the next Pstack turn, not unrelated sessions. Restart and resume must preserve mode. Every skill entry must direct Pi to its runtime configuration, including standalone setup and review skills. Existing Pi model choices must remain intact.

## Limits

This integration does not invent an `Agent` tool on Pi or claim that prompt preferences enforce routing. Native delegation must use a model-capable tool exposed by Pi or a separately launched CLI with an explicit validated provider, model, reasoning level, worktree, and task contract. Missing capabilities are reported rather than bypassed.
