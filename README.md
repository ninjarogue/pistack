# pstack

Run [Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack) natively in Pi. pstack is an opinionated workflow stack for concise, simple, verified agent work. Pi is the only runtime supported, documented, tested, and installed by this fork.

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

## Getting started

```text
Use poteto-mode to fix the search filter resetting when I change pages.
```

For a bug, it reproduces the failure, uses `how` and `why` to investigate, delegates when Pi exposes a suitable facility, then reruns the failing case. If native delegation is unavailable, the workflow reports that limitation rather than inventing a subagent tool.

[Other playbooks](plugins/pstack/skills/poteto-mode/SKILL.md#playbooks) cover planning, features, refactoring, performance issues, investigations, prototypes, PR maintenance, shipping, and longer projects.

![Route map of one request through poteto-mode: your request, poteto-mode, a playbook (23 in the stack), plan and delegate (architect, arena, swarm), review and verify (interrogate, tests, measure), then validated work. Supporting skills are how, why, and unslop. The stack runs on Pi.](assets/request-route.svg)

## Inherited upstream compatibility

Claude Code and Codex artifacts remain in the tree only to keep synchronization with [`michael-denyer/pstack-claude`](https://github.com/michael-denyer/pstack-claude) viable. They are not supported or tested as pistack runtimes. Use the upstream project if you need either runtime.

## Details

- [Native Pi setup](docs/native-runtimes.md)
- [Skills and slash commands](docs/reference.md#slash-commands)
- [Runtime scope](docs/reference.md#runtime-support)
- [Models and dependencies](docs/reference.md#configuration-and-dependencies)
- [Maintenance and port scope](docs/reference.md#maintenance)

## Contributing

Thanks for helping make this port better. Bug reports, documentation fixes, and runtime improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks and where your change belongs. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

This port, including its modifications and additions, is also [MIT-licensed](LICENSE). Original pstack © 2026 Lauren Tan; imported cursor-team-kit skills © 2026 Cursor. See [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) and [NOTICE.md](NOTICE.md).
