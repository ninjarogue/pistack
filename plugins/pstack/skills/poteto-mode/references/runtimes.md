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
| Read or search files | `read`, plus `bash` for bounded searches | `read`, `grep`, and `glob` when exposed |
| Run commands | `bash` | V2 `shell`, or V1 `bash`, when exposed |
| Load another skill | Follow the installed skill entrypoint | native `skill` tool only when exposed |
| Ask a preference question | Ask in the conversation | `question` only when exposed, otherwise ask in the conversation |
| Track work | Available session planning UI or a local checklist | `todo` only when exposed, otherwise a local checklist |

OpenCode's native tool set varies by version, agent, and permissions. V2 provides `subagent` for configured child agents; V1 may expose `task`. Use the tool's actual schema and an existing agent ID, not a Claude namespaced agent. V2 can run a child in the background with `background: true` and continue it with its returned `sessionID`. See the [V2 tools documentation](https://v2.opencode.ai/docs/tools) and [agent model rules](https://v2.opencode.ai/docs/agents). Pi and OpenCode do not acquire a fictitious `Agent`, `Task`, or `subagent_type` tool because legacy prose names one. If a required native tool, built-in skill, app driver, or delegation facility is absent, use a documented equivalent that is actually exposed, perform a safe sequential pass, or report the limitation. Do not guess a command.

## Model policy

The private native sheet takes precedence over every generated Models section. Those sections contain Claude-only compatibility defaults. Never select a Claude default for an unconfigured Pi or OpenCode role.

Before using a real provider/model ID, validate it against the current runtime's actual inventory:

```shell
pi --offline --list-models
opencode models
```

Run discovery from the active project directory. OpenCode V2 discovery may still be loading immediately after startup or reload; wait briefly and retry before treating an empty response as final. A persistently empty inventory is blocking. An existing sheet is not evidence that an ID remains available. Report the inventory problem rather than guessing.

`inherit-parent` and `auto` request the current parent provider and model. Native in-process delegation may inherit that identity when the runtime actually provides model inheritance. A separately launched `pi` or `opencode` CLI is a new process and session: omitting its model selection uses that process's persisted defaults, not the parent session model.

For every separately launched CLI, expand an alias to the known current parent identity, validate that identity against the fresh runtime inventory, and pass it explicitly. On Pi, both `PI_PROVIDER` and `PI_MODEL` must identify the parent; pass them with `--provider` and `--model`. On OpenCode, obtain the active provider/model from live runtime information and pass it with `--model`. Unknown parent identity blocks inheritance: run `setup-pstack` and select a listed ID instead. Never infer parent identity from default or persisted settings. OpenCode model IDs use `provider/model`; where the installed OpenCode model list exposes a variant, a separately launched run accepts `opencode run --model provider/model#variant`. There is no `--variant` flag.

Before code-writing work, read the private sheet's implementation-model choice and minimum-reasoning policy, including any prose overrides; do not assume they are stored under literal `implementation model` or `implementation effort` keys. Every workflow, including delegated work, must respect that policy. Preserve the parent's requested reasoning level for a separate worker when it is known, raising it when necessary to meet the sheet's minimum; if a required reasoning setting cannot be established, do not silently downgrade it. Do not switch the parent session automatically. OpenCode native delegation uses the model configured for that agent, or native parent inheritance when no agent model is set. Do not invent a per-call model parameter.

## Delegation

Use a native delegation tool only when it is actually exposed. A separate worker CLI is a separate session, not a substitute for an in-process subagent. Give it the relevant pstack skill and guide paths, the private-sheet requirements, an explicit worktree, a bounded writable scope, and verification instructions.

A Pi worker invocation has this shape after replacing every placeholder with an explicitly selected value and validating the provider/model with `pi --offline --list-models`:

```shell
pi --offline --no-session --provider PROVIDER --model MODEL --thinking THINKING --print @TASK_FILE
```

The task file must explicitly name the worker's worktree and bounded scope and tell the worker which pstack instructions to read. Do not add an auto-approval flag. For `inherit-parent` or `auto`, use the validated `PI_PROVIDER` and `PI_MODEL` values rather than omitting these flags. Set `THINKING` from the requested parent reasoning and the sheet's minimum-reasoning policy, not from a hard-coded default.

For OpenCode, do not invent a model argument for a native in-process task. A separately launched `opencode run` is also a separate session: pass its validated model explicitly and include the same relevant pstack instructions. Preserve a known parent variant or other exposed reasoning selection when required by the sheet; do not invent an unlisted variant. If the installed runtime offers no safe way to meet a workflow's requested fan-out, say that native fan-out is unavailable and continue sequentially only when the workflow remains meaningful.

## Session history and legacy-only behavior

Use `PI_SESSION_FILE` or `PI_SESSION_ID` on Pi and the active OpenCode session on OpenCode. If that history is unavailable, state the limitation rather than searching `~/.claude/projects`. The session hook, Claude namespaced agents, Codex `spawn_agent`, Claude project skill paths, and Claude bundled skills apply only on the runtime that provides them.
