# CONTEXT — domain glossary

Names for the concepts this repo's design discussions keep reaching for. Architecture reviews use these terms; if a review needs a concept that isn't here, add it.

- **Build** — the supported Pi package (`package.json` plus `runtimes/pi/`). Inherited Claude Code and Codex plugin artifacts remain in the tree only for synchronization with `michael-denyer/pstack-claude`; they are not pistack builds. All artifacts share one `skills/` tree.
- **Agent Skill** — one directory under `plugins/pstack/skills/` with portable `name` and `description` frontmatter. Pi discovers this shared tree only in Pstack mode. Runtime-specific lifecycle behavior stays in `runtimes/pi/`.
- **Model policy** — the mapping from roles to model slugs. Pi's private choices live in `${PI_CODING_AGENT_DIR:-~/.pi/agent}/pstack-models.md` and override the inherited Claude-only defaults stamped from `plugins/pstack/models.json`.
- **Role** — a named unit of delegated work with its own model choice (`arena runners`, `how critics`, `swarm workers`). The role vocabulary lives in `models.json` and surfaces in `setup-pstack`'s sheet.
- **Panel** — the three-model diverse panel the multi-model skills (`arena`, `architect`, `interrogate`, `how`) run by default. One fact in `models.json`; the generator stamps every copy and fails on strays.
- **Prompt stub** — an inherited Codex slash command that invokes a skill. The generator writes it under `.codex-plugin/prompts/` using the skill's row in the [slash-command reference](docs/reference.md#slash-commands). Pistack retains these stubs only for upstream synchronization.
- **Menu description** — the short description in a public skill's row in the [slash-command reference](docs/reference.md#slash-commands). Codex displays it in the slash menu. The skill's frontmatter `description` tells the agent when to invoke it.
- **Generator** — `tools/generate.mjs`. Stamps facts from their single source into every committed copy and validates cross-file contracts. CI reruns it and fails on any diff.
- **Generator-owned copy** — a committed value written by the generator, such as a manifest version, prompt stub, or Models section. Regeneration overwrites hand edits, and CI catches any difference.
- **VERSION** — the repo-root file holding the canonical plugin version. Releases edit it, add the matching `CHANGES.md` heading, and regenerate; plugin auto-update installs by this number.
- **Sync boundary** — the split between what upstream pstack owns (skill content) and what this port owns (Cursor-to-Claude-Code translation). Defined in [CONTRIBUTING.md](CONTRIBUTING.md); enforced by `tools/sync.mjs`, whose substitution table and denylist live in `tools/substitutions.json`.
- **Upstream pin** — the per-component upstream SHA in `tools/upstream.json` that the port is synced to. `sync.mjs` advances it only when a sync completes without denylist hits.
- **Invariants** — layout and flag rules enforced inside `tools/generate.mjs` (`agentSkills`, `validatePluginLayout`); `tests/invariants.test.mjs` proves each can fail against fixture trees. `tests/skill-collision-repro.sh` is the one behavioral check, needing the `claude` CLI.
