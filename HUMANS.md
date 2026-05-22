# Rethunk Claude Plugins — User guide

How to add this marketplace to Claude Code and install plugins from it. Marketplace **architecture** and the manifest model live in [AGENTS.md](AGENTS.md); how to **contribute a plugin** lives in [CONTRIBUTING.md](CONTRIBUTING.md).

## Add the marketplace

```sh
claude plugin marketplace add Rethunk-Tech/claude-plugins
```

Or interactively: run `/plugin` inside Claude Code and add `Rethunk-Tech/claude-plugins`.

Refresh later with `claude plugin marketplace update`.

## Install plugins

```sh
claude plugin install rethunk-git@rethunk-marketplace
claude plugin install rethunk-github@rethunk-marketplace
claude plugin install citadel-sdd@rethunk-marketplace
```

`rethunk-marketplace` is the marketplace `name` (from `marketplace.json`) — it does not have to match the repository name. Add `--scope user|project|local` to control where the install is recorded.

Manage installed plugins with `claude plugin disable <name>` / `claude plugin enable <name>`.

## Plugins

### `rethunk-git`

Bundles the multi-root git MCP server (`@rethunk/mcp-multi-root-git`). Tools surface as `mcp__rethunk-git__<tool>` — `git_status`, `git_inventory`, `git_parity`, `git_diff`, `git_log`, `git_show`, `batch_commit`, `git_push`, `git_merge`, `git_worktree_*`, and more.

**Requirements:** Git on `PATH`; Node.js ≥ 22 (`npx` ships with it). No token needed — repositories resolve from the MCP workspace roots Claude Code passes at startup. Optional: `GIT_SUBPROCESS_PARALLELISM` (default `4`) tunes fleet-scan concurrency.

### `rethunk-github`

Bundles the GitHub rollup MCP server (`@rethunk/github-mcp`). Tools surface as `mcp__rethunk-github__<tool>` — read-only (`repo_status`, `my_work`, `pr_preflight`, `ci_diagnosis`, `org_pulse`, …) and write-capable (`pr_create`, `release_create`, `labels_sync`, …).

**Requirements:** Node.js ≥ 22. A **GitHub token** is required for every tool except `gh_auth_status`. Export `GITHUB_TOKEN` in the environment that launches Claude Code (scopes: `repo`, plus `read:org` for `org_pulse`); the plugin's `.mcp.json` forwards it via `${GITHUB_TOKEN}`. For GitHub Enterprise, also export `GITHUB_API_URL` / `GITHUB_GRAPHQL_URL` and add them to the `env` block.

### citadel-sdd

Bundles the Citadel Spec-Driven Development MCP server (`@rethunk/citadel-sdd`). Tools surface as `mcp__citadel-sdd__<tool>` — the spec lifecycle (`spec_init`, `spec_claim`, `spec_handoff`, `spec_approve`, `spec_ratify`, `spec_park`, `spec_close`, …), task tracking (`spec_task_add`, `spec_task_check`, `spec_task_list`), plus `spec_lint`, `spec_status`, and `sdd_doctor`. Local-only — no telemetry, no remote API.

**Requirements:** Node.js ≥ 22; Git ≥ 2.28 (the server's file-system and commit tools shell out to `git`). No token needed.

> **Pre-publication note:** this plugin pins `@rethunk/citadel-sdd@0.5.0`, which is not yet on npmjs as of 2026-05-22. Installing `citadel-sdd` will fail until Rethunk-AI publishes that release; the pin is in place so the plugin works the moment it lands.

## Source registries

Each MCP server is published under two names. The plugins here pin the **npmjs** package with an exact version, so installs need no extra registry configuration.

| Server | npmjs (pinned here) | GitHub Packages (CI on each tag) |
|--------|---------------------|----------------------------------|
| git | `@rethunk/mcp-multi-root-git` | `@rethunk-ai/mcp-multi-root-git` |
| github | `@rethunk/github-mcp` | `@rethunk-ai/github-mcp` |
| citadel-sdd | `@rethunk/citadel-sdd` | `@rethunk-ai/citadel-sdd` |

To track the CI-aligned GitHub Packages build instead, configure `@rethunk-ai:registry` with a `read:packages` token (see each upstream repo's `docs/install.md`) and edit the plugin's `.mcp.json`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Plugin tools never appear | Restart Claude Code, or `claude plugin marketplace update` then reinstall. |
| `npx` not found | Install Node.js ≥ 22; ensure it is on `PATH` for the process that launches Claude Code. |
| `rethunk-github` tools fail with auth errors | Export `GITHUB_TOKEN` before launching Claude Code; verify with the `gh_auth_status` tool. |
| `rethunk-git` returns `git_not_found` | Install Git and ensure it is on `PATH`. |
| Wrong repo targeted by `rethunk-git` | Open Claude Code at the intended workspace root; tools follow MCP file roots, not a fixed `cwd`. |
