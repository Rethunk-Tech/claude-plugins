# citadel-sdd

Bundles the **Citadel Spec-Driven Development MCP server** for Claude Code — the SDD spec lifecycle as MCP tools. Local-only: no telemetry, no remote API, runs over stdio.

Tools register under the `citadel-sdd` server name and appear as `mcp__citadel-sdd__<tool>` — spec lifecycle (`spec_init`, `spec_claim`, `spec_handoff`, `spec_approve`, `spec_block` / `spec_unblock`, `spec_ratify`, `spec_park` / `spec_unpark`, `spec_close`, `spec_reopen`), reads (`spec_list`, `spec_read`, `spec_status`, `spec_lint`, `spec_index_rebuild`), tasks (`spec_task_add`, `spec_task_check`, `spec_task_list`), and `sdd_doctor`.

## Source package

| Registry | Package |
|----------|---------|
| npmjs | [`@rethunk/citadel-sdd`](https://www.npmjs.com/package/@rethunk/citadel-sdd) |
| GitHub Packages | `@rethunk-ai/citadel-sdd` |

This plugin pins the **npmjs** package at an exact version. Bump the pin in `.mcp.json` and `plugin.json` together when adopting a newer release.

## Requirements

- **Node.js ≥ 22** (`npx` ships with it).
- **Git ≥ 2.28** — the server's file-system and commit tools shell out to `git`.

No token or `env` block: the server is local-only and resolves specs from the workspace.
