---
name: get-pr-comments
description: Fetch and summarize review comments from the active pull request
---

<!-- pstack-runtime-bootstrap:start -->
> **Runtime bootstrap.** On Pi, before following this skill, read the [runtime guide](../poteto-mode/references/runtimes.md). Its rules for tools, models, delegation, configuration, and session history take precedence over inherited Claude Code or Codex instructions below.
<!-- pstack-runtime-bootstrap:end -->

# Get PR comments

## Trigger

Need a concise, actionable summary of feedback on the active pull request.

## Workflow

1. Resolve the active PR for the current branch.
2. Fetch review comments and discussion comments.
3. Group feedback by severity and actionability.
4. Return a concise action list.

## Output

- Grouped feedback summary
- Action list ordered by priority
- Open questions that still need clarification