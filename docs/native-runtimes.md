# Native Pi runtime

Pi is the only runtime supported, documented, tested, and installed by pistack. The package loads one extension that keeps pstack isolated from ordinary Pi sessions and discovers the bundled skills only in Pstack mode.

## Install and start

Install the package:

```shell
pi install git:github.com/ninjarogue/pistack
```

Start a new Pstack session with `pi --pstack`, or use `/pstack` inside Pi. `/new` returns to a Default session. Resumed sessions restore their saved mode.

The extension does not replace Pi's base prompt, project instructions, parent model, or tools. A Default session does not discover the bundled skills or read pstack's private model sheet.

## Configure models

Run `setup-pstack` from a Pstack session. It inventories models with:

```shell
pi --offline --list-models
```

It then reads the existing sheet, asks before changing choices, and writes only `${PI_CODING_AGENT_DIR:-~/.pi/agent}/pstack-models.md`.

An empty inventory is blocking even when a sheet already exists. The model provider does not identify the host; Pi can use Codex authentication. Aliases inherit only a known current provider and model that appear in the fresh inventory. There are no Claude model fallbacks for unconfigured Pi roles.

Do not include the sheet from `AGENTS.md`, `CLAUDE.md`, or another global file. Every active pstack workflow reads it directly. All code-writing work follows its implementation model and effort instructions; a workflow does not silently switch the parent session.

## Upgrade

Use Pi's package update flow. Re-run `setup-pstack` only when model availability or desired role choices change.

## Migrate from a global include

Older setup guidance may have added a pstack sheet or mandate to `AGENTS.md` or `CLAUDE.md`. Remove only the exact pstack include or pstack-specific instruction you previously added. Preserve every unrelated instruction.

The Claude Code and Codex SessionStart hook belongs to inherited upstream compatibility artifacts. It does not configure Pi and is not supported by pistack.

## Verify the fork

From the repository root:

```shell
bun tools/generate.mjs
git diff --exit-code
bun test tests/
npm run test:pi
```

The Pi integration suite requires Pi 0.87 and Node.js 24 on `PATH`. It uses isolated temporary configuration and a local test provider, not paid model calls. It checks ordinary-session isolation, Pstack-only model configuration, config refresh, saved modes, and missing or invalid sheets. Run generation from a clean checkout when checking for drift.

## Pi limitations

Use only tools exposed in the active Pi session. Pi does not gain Claude's `Agent` or `subagent_type` interface from the inherited skill prose. A worker CLI is a separate session and must receive the relevant pstack instructions, worktree, bounded scope, explicit validated model, and verification contract.

Pi session history uses `PI_SESSION_FILE` or `PI_SESSION_ID` when available. Workflows never search an unconditional `~/.claude` transcript path. Claude-only bundled skills without a documented Pi equivalent are reported as unavailable rather than invoked by a guessed command.

## Inherited artifacts

Claude Code and Codex manifests, prompts, agents, hooks, and mappings remain so the shared skill tree can continue syncing with [`michael-denyer/pstack-claude`](https://github.com/michael-denyer/pstack-claude). They are not supported or tested as pistack runtimes. No other native-runtime adapter is shipped.
