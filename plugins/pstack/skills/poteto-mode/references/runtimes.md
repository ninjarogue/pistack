# Native runtime guide

This guide is the compatibility boundary for running pstack as native Agent Skills on Pi or OpenCode. Read it before any entrypoint. For those two runtimes, this guide overrides legacy references to Claude tools, `claude-*` models, `~/.claude`, Codex mappings, and plugin hooks. Do not infer the runtime from the model provider. Pi may use Codex authentication or any other configured provider.

A standalone pstack skill must load this guide and the current runtime's private model sheet itself. It must not require `AGENTS.md`, OpenCode's global `instructions`, or another mandatory global hook. The sheet applies only while a pstack skill or the `pstack` OpenCode agent is active.

## Runtime and private sheet

Identify the host from its runtime capabilities and environment, not from its model name.

- **Pi.** Resolve the agent directory the same way as Pi's `getAgentDir`: use `PI_CODING_AGENT_DIR` when set, otherwise `~/.pi/agent`. Read `pstack-models.md` directly from that directory. `PI_SESSION_FILE` and `PI_SESSION_ID` identify native session history when available.
- **OpenCode.** Use `OPENCODE_CONFIG_DIR` when set, otherwise `$XDG_CONFIG_HOME/opencode` when `XDG_CONFIG_HOME` is set, otherwise `~/.config/opencode`. Read `pstack-models.md` directly from that directory. Use the active OpenCode session or its exposed session tools for history.
- **Claude Code and Codex.** Follow their existing instructions below the bootstrap. Their SessionStart hook and configuration rules are legacy runtime behavior only.

Never fall back to an unconditional `~/.claude` transcript or model path on Pi or OpenCode. Do not read unrelated user sessions, authentication files, or model sheets belonging to another runtime.

## Native tools

Use only tools present in the current session.

| Workflow action | Pi | OpenCode |
| --- | --- | --- |
| Read or search files | `read`, plus `bash` for bounded searches | `read` and `bash` only when exposed |
| Run commands | `bash` | `bash` only when exposed |
| Load another skill | Follow the installed skill entrypoint | native `skill` tool only when exposed |
| Ask a preference question | Ask in the conversation | `question` only when exposed, otherwise ask in the conversation |
| Track work | Available session planning UI or a local checklist | `todo` only when exposed, otherwise a local checklist |

OpenCode's native tool set may vary by agent and permission configuration. Pi and OpenCode do not acquire a fictitious `Agent`, `Task`, or `subagent_type` tool because legacy prose names one. If a required native tool, built-in skill, app driver, or delegation facility is absent, use a documented equivalent that is actually exposed, perform a safe sequential pass, or report the limitation. Do not guess a command.

## Model policy

The private native sheet takes precedence over every generated Models section. Those sections contain Claude-only compatibility defaults. Never select a Claude default for an unconfigured Pi or OpenCode role.

Before using a real provider/model ID, validate it against the current runtime's actual inventory:

```shell
pi --offline --list-models
opencode models
```

An empty inventory is blocking. An existing sheet is not evidence that an ID remains available. Stop and report the inventory problem rather than guessing.

`inherit-parent` and `auto` mean omission of a CLI model selection. They are valid on a native runtime only when the inherited current model is known and appears in that runtime's inventory. If it is unknown, run `setup-pstack` and choose a listed ID. OpenCode model IDs use `provider/model`; where the installed OpenCode model list exposes a variant, a separately launched run accepts `opencode run --model provider/model#variant`. There is no `--variant` flag.

Read `implementation model` and `implementation effort` before code-writing work. Every workflow, including delegated work, must respect those instructions. Do not switch the parent session automatically. OpenCode native task delegation uses the model configured for that agent and has no invented per-task model parameter.

## Delegation

Use a native delegation tool only when it is actually exposed. A separate worker CLI is a separate session, not a substitute for an in-process subagent. Give it the relevant pstack skill and guide paths, the private-sheet requirements, an explicit worktree, a bounded writable scope, and verification instructions.

A Pi worker invocation has this shape after replacing every placeholder with a value validated from `pi --offline --list-models`:

```shell
pi --offline --no-session --provider PROVIDER --model MODEL --thinking high --print @TASK_FILE
```

The task file must explicitly name the worker's worktree and bounded scope and tell the worker which pstack instructions to read. Do not add an auto-approval flag. If the selected sheet value is a validated native alias, omit the provider/model selection so the known inherited configuration applies.

For OpenCode, do not invent a model argument for a native task. A separately launched `opencode run` is also a separate session and must receive the same relevant pstack instructions explicitly. If the installed runtime offers no safe way to meet a workflow's requested fan-out, say that native fan-out is unavailable and continue sequentially only when the workflow remains meaningful.

## Session history and legacy-only behavior

Use `PI_SESSION_FILE` or `PI_SESSION_ID` on Pi and the active OpenCode session on OpenCode. If that history is unavailable, state the limitation rather than searching `~/.claude/projects`. The session hook, Claude namespaced agents, Codex `spawn_agent`, Claude project skill paths, and Claude bundled skills apply only on the runtime that provides them.
