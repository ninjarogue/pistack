# Native Pi and OpenCode runtimes

Pi and OpenCode use the shared Agent Skills tree without loading pstack into global instructions. Each pstack entrypoint reads the runtime guide and the private sheet only while that workflow is active. Provider/model choices remain local and are not part of the public defaults.

## Configure models

Run `setup-pstack` from a pstack session. It lists models with the runtime's real inventory command, reads an existing sheet, asks before changing choices, and writes only that runtime's sheet.

| Runtime | Inventory | Private sheet |
| --- | --- | --- |
| Pi | `pi --offline --list-models` | `${PI_CODING_AGENT_DIR:-~/.pi/agent}/pstack-models.md` |
| OpenCode | `opencode models` | `${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-~/.config}/opencode}/pstack-models.md` |

An empty inventory is blocking even when a sheet already exists. Model provider does not identify the host; Pi can use Codex authentication. Native aliases inherit only a known, listed current model. There are no Claude model fallbacks for unconfigured native roles.

Do not include these sheets from `AGENTS.md`, OpenCode `instructions`, or another global file. Every pstack workflow reads the current runtime's sheet directly. All code-writing work follows its implementation model and effort instructions; a workflow does not silently switch the parent session.

## Install OpenCode

From a clone of this repository:

```shell
node tools/install-opencode.mjs --dry-run
node tools/install-opencode.mjs
```

The default config directory is `OPENCODE_CONFIG_DIR`, then `$XDG_CONFIG_HOME/opencode`, then `~/.config/opencode`. Override it explicitly when needed:

```shell
node tools/install-opencode.mjs --config-dir /path/to/opencode-config
```

The installer preflights every destination before writing. It creates relative links under `skills/<skill-name>` and `agents/pstack.md`, accepts links already pointing to the same sources, and refuses custom files or different links. It never edits `pstack-models.md`, `opencode.json`, auth, `AGENTS.md`, or the `instructions` array.

Select the `pstack` primary agent or use a pstack skill after installation. The agent has no fixed model or permission overrides. It loads `poteto-mode`, the native runtime guide, and the private OpenCode sheet for that agent only.

OpenCode 2 agent/config discovery can be inspected with:

```shell
opencode debug agents
opencode debug config
```

Run those commands from the active project directory. After startup or `opencode reload`, allow discovery to finish before checking; an immediate response can omit custom agents and models. Those debug commands do not accept `--standalone`.

Verified on OpenCode 2.0.12: the installed Markdown agent appears as `pstack` with mode `primary` and loads its prompt from the fork, without an `agents` JSON declaration. Skills resolve through the installed links without a `skills` configuration entry. Model inventory also resolves from the project directory. Installer fixture tests cover links, collisions, symlinked checkouts, dry runs, and repeated installation. Live OpenCode model delegation is not yet verified.

## Upgrade

Pull the repository and rerun the installer:

```shell
git pull --ff-only
node tools/install-opencode.mjs
```

Existing links to this clone are accepted, so the second run makes no changes. Moving the clone changes the desired targets; remove only this installer's old links after verifying them, then run the installer from the new clone. A collision is never overwritten automatically.

Pi upgrades use Pi's package update flow. Re-run `setup-pstack` only when model availability or desired role choices change.

## Migrate from a global include

Older setup guidance may have added a pstack sheet or mandate to `AGENTS.md`, `CLAUDE.md`, or OpenCode's `instructions`. Remove only the exact pstack include or pstack-specific instruction you previously added. Preserve every unrelated instruction and configuration field. Do not replace the whole file or array.

The Claude Code and Codex SessionStart hook remains a legacy plugin feature. It does not configure Pi or OpenCode.

## Remove OpenCode links

First inspect each path and remove it only if it is a symlink to this clone. There is one link per directory in `plugins/pstack/skills/` plus `agents/pstack.md`. Leave custom files and links to another installation untouched. Empty `skills` or `agents` directories may be removed afterward; preserve directories containing anything else.

Removal does not require changing `opencode.json`, auth, model sheets, `AGENTS.md`, or global instructions because the installer never modifies them.

## Verify the fork

From the repository root:

```shell
bun test tests/
npm run test:pi
bun tools/generate.mjs
git diff --exit-code
```

The Pi integration suite requires Pi 0.87 and Node.js 24 on `PATH`. It uses isolated temporary configuration and a local test provider, not paid model calls. It checks ordinary-session isolation, Pstack-only model configuration, config refresh, saved modes, and missing or invalid sheets. Run generation from a clean checkout when checking for drift.

## Native limitations

Use only native tools exposed in the active session. OpenCode V2 uses `shell` for commands and `subagent` for configured child agents; V1 may expose `bash` and `task` instead. Use `skill`, `read`, and `question` only when available. Use a local checklist when no task-tracking tool is exposed. Neither runtime gains Claude's `Agent` or `subagent_type` interface from these files. A worker CLI is a separate session and must receive the relevant pstack instructions, worktree, bounded scope, and verification contract explicitly.

Pi session history uses `PI_SESSION_FILE` or `PI_SESSION_ID` when available. OpenCode work uses its active session. Native workflows never search an unconditional `~/.claude` transcript path. Claude-only bundled skills without a documented native equivalent are reported as unavailable rather than invoked by a guessed command.
