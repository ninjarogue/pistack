# pstack

Run [Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack) as native skills in Pi and OpenCode. pstack is an opinionated workflow stack for concise, simple, verified agent work. This fork keeps its Claude Code and Codex compatibility while making native entrypoints first-class.

Tell `poteto-mode` your goal and it selects the workflow for the task.

## Pi

Install this fork:

```shell
pi install git:github.com/ninjarogue/pistack
```

Start a new pstack session:

```shell
pi --pstack
```

Inside Pi, use `/pstack`. Ordinary Pi sessions are unchanged. The bundled extension enables the shared skills on demand and keeps pstack's private model sheet out of global instructions.

## OpenCode

Clone the fork, then install links into your OpenCode config directory:

```shell
git clone https://github.com/ninjarogue/pistack.git
cd pistack
node tools/install-opencode.mjs
```

The installer links every skill and the `pstack` primary agent. Select the `pstack` agent or invoke a pstack skill. It does not edit `AGENTS.md`, OpenCode `instructions`, model settings, auth, or other private configuration. See [native runtime setup](docs/native-runtimes.md) for custom config directories, dry runs, upgrades, and removal.

## Getting started

```text
Use poteto-mode to fix the search filter resetting when I change pages.
```

For a bug, it reproduces the failure, uses `how` and `why` to investigate, delegates when the active runtime actually supports it, then reruns the failing case. If native delegation is unavailable, the workflow reports that limitation rather than inventing a subagent tool.

[Other playbooks](plugins/pstack/skills/poteto-mode/SKILL.md#playbooks) cover planning, features, refactoring, performance issues, investigations, prototypes, PR maintenance, shipping, and longer projects.

![A request enters poteto-mode. Playbook options include Plan, Bugs, Features, and Refactor. Planning can use architect, arena, or swarm; review and verification can use interrogate, tests, and measurements. Supporting skills include how, why, and unslop. The output is Finished work validated.](assets/pstack-overview.png)

## Claude Code and Codex compatibility

The existing plugin installation remains available.

### Claude Code

Run in Claude Code:

```text
/plugin marketplace add michael-denyer/pstack-claude
/plugin install pstack@pstack-claude
```

### Codex

Run in your terminal:

```shell
codex plugin marketplace add michael-denyer/pstack-claude
codex plugin add pstack@pstack-claude
```

Run `setup-pstack` to change model defaults or the legacy automatic routing hook. Codex asks you to trust plugin hooks through `/hooks` before one runs. In Claude Code, use `/pstack:setup-pstack`.

For Prime Agent, Gemini CLI, or a skills-only legacy install, see [shared installation](docs/reference.md#shared-skills-installation).

## Details

- [Native Pi and OpenCode setup](docs/native-runtimes.md)
- [Skills and slash commands](docs/reference.md#slash-commands)
- [Legacy runtime setup](docs/reference.md#runtime-support)
- [Models and dependencies](docs/reference.md#configuration-and-dependencies)
- [Maintenance and port scope](docs/reference.md#maintenance)

## Contributing

Thanks for helping make this port better. Bug reports, documentation fixes, and runtime improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks and where your change belongs. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

This port, including its modifications and additions, is also [MIT-licensed](LICENSE). Original pstack © 2026 Lauren Tan; imported cursor-team-kit skills © 2026 Cursor. See [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) and [NOTICE.md](NOTICE.md).
