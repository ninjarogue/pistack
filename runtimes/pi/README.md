# Bundled Pstack runtime for Pi

This extension adapts the upstream [`michael-denyer/pstack-claude`](https://github.com/michael-denyer/pstack-claude) pstack workflow into a bundled Pi runtime. Those skills are a port of [Lauren Tan's original pstack](https://github.com/cursor/plugins/tree/main/pstack).

The package manifest loads this extension but declares no package skills. A normal `pi` session is therefore unchanged. `pi --pstack` starts a new Pstack session, `/pstack` replaces the current session with a new Pstack session, and `/new` starts a Default session. Reloading or resuming restores the mode saved in the session's `pstack-mode` custom entry.

Pstack mode discovers only `../../plugins/pstack/skills` and filters the advertised skill list to that bundled tree. It does not replace the base prompt, project instructions, parent model, or tools.

Before every Pstack turn, the extension reads `<Pi agent directory>/pstack-models.md` and adds its raw contents to the `pstack_models` prompt section with Pi-specific entry guidance. If the sheet is absent, the section directs the agent to the bundled `setup-pstack` skill and explicitly disables assumptions based on Claude defaults. Default sessions never read or inject this sheet.
