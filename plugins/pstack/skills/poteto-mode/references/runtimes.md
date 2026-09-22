# Pi runtime guide

This guide is the compatibility boundary for running pstack in Pi. Read it before any entrypoint on Pi. Its rules override inherited references to Claude tools, `claude-*` models, `~/.claude`, Codex mappings, and plugin hooks. Do not infer the runtime from the model provider; Pi may use Codex authentication or any other configured provider.

A standalone pstack skill must load this guide and Pi's private model sheet itself. It must not require `AGENTS.md` or another mandatory global hook. The sheet applies only while a pstack skill is active.

## Runtime and private sheet

Resolve the agent directory the same way as Pi's `getAgentDir`: use `PI_CODING_AGENT_DIR` when set, otherwise `~/.pi/agent`. Read `pstack-models.md` directly from that directory. `PI_SESSION_FILE` and `PI_SESSION_ID` identify Pi session history when available.

Never fall back to an unconditional `~/.claude` transcript or model path on Pi. Do not read unrelated user sessions, authentication files, or model sheets belonging to another runtime.

## Native tools

Use only tools present in the current Pi session.

| Workflow action | Pi |
| --- | --- |
| Read or search files | `read`, plus `bash` for bounded searches |
| Run commands | `bash` |
| Load another skill | Follow the installed skill entrypoint |
| Ask a preference question | Ask in the conversation |
| Track work | Use the available session planning UI or a local checklist |

Pi does not acquire a fictitious `Agent`, `Task`, or `subagent_type` tool because inherited prose names one. If a required native tool, built-in skill, app driver, or delegation facility is absent, use a documented equivalent that is actually exposed, perform a safe sequential pass, or report the limitation. Do not guess a command.

## Model policy

The private Pi sheet takes precedence over every generated Models section. Those sections contain inherited Claude-only compatibility defaults. Never select a Claude default for an unconfigured Pi role.

Before using a real provider and model ID, validate it against Pi's current inventory:

```shell
pi --offline --list-models
```

Run discovery from the active project directory. An empty inventory is blocking. An existing sheet is not evidence that an ID remains available. Report the inventory problem rather than guessing.

`inherit-parent` and `auto` request the current parent provider and model. Native in-process delegation may inherit that identity when Pi actually provides model inheritance. A separately launched `pi` CLI is a new process and session: omitting its model selection uses that process's persisted defaults, not the parent session model.

For every separately launched CLI, expand an alias to the known current parent identity, validate that identity against the fresh inventory, and pass it explicitly. Ensure both `PI_PROVIDER` and `PI_MODEL` identify the parent; pass them with `--provider` and `--model`. Unknown parent identity blocks inheritance: run `setup-pstack` and select a listed ID instead. Never infer parent identity from default or persisted settings.

Before code-writing work, read the private sheet's implementation-model choice and minimum-reasoning policy, including any prose overrides; do not assume they are stored under literal `implementation model` or `implementation effort` keys. Every workflow, including delegated work, must respect that policy. Preserve the parent's requested reasoning level for a separate worker when it is known, raising it when necessary to meet the sheet's minimum. If a required reasoning setting cannot be established, do not silently downgrade it. Do not switch the parent session automatically.

## Delegation

Use a native delegation tool only when it is actually exposed. A separate worker CLI is a separate session, not a substitute for an in-process subagent. Give it the relevant pstack skill and guide paths, the private-sheet requirements, an explicit worktree, a bounded writable scope, and verification instructions.

A Pi worker invocation has this shape after replacing every placeholder with an explicitly selected value and validating the provider and model with `pi --offline --list-models`:

```shell
pi --offline --no-session --provider PROVIDER --model MODEL --thinking THINKING --print @TASK_FILE
```

The task file must explicitly name the worker's worktree and bounded scope and tell the worker which pstack instructions to read. Do not add an auto-approval flag. For `inherit-parent` or `auto`, use the validated `PI_PROVIDER` and `PI_MODEL` values rather than omitting these flags. Set `THINKING` from the requested parent reasoning and the sheet's minimum-reasoning policy, not from a hard-coded default.

If Pi offers no safe way to meet a workflow's requested fan-out, say that native fan-out is unavailable and continue sequentially only when the workflow remains meaningful.

## Session history and inherited behavior

Use `PI_SESSION_FILE` or `PI_SESSION_ID` when available. If that history is unavailable, state the limitation rather than searching `~/.claude/projects`.

Claude namespaced agents, Codex `spawn_agent`, Claude project skill paths, and the Claude Code/Codex SessionStart hook belong to inherited compatibility artifacts. They are not Pi behavior and are not supported by this fork.
