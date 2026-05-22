# rethunk-github

Bundles the **GitHub rollup MCP server** for Claude Code — composite GitHub reads and writes that replace several API round-trips with one call.

Tools register under the `rethunk-github` server name and appear as `mcp__rethunk-github__<tool>`. Read-only: `repo_status`, `my_work`, `pr_preflight`, `release_readiness`, `ci_diagnosis`, `org_pulse`, `pin_drift`, `ecosystem_activity`, `module_pin_hint`, `changelog_draft`, `gh_auth_status`, `actions_runs_filter`. Write-capable: `pr_comment_batch`, `pr_create`, `issue_from_template`, `release_create`, `workflow_dispatch`, `labels_sync`, `check_run_create`.

## Source package

| Registry | Package |
|----------|---------|
| npmjs | [`@rethunk/github-mcp`](https://www.npmjs.com/package/@rethunk/github-mcp) |
| GitHub Packages (CI on each tag) | [`@rethunk-ai/github-mcp`](https://github.com/Rethunk-AI/rethunk-github-mcp/packages) |

This plugin pins the **npmjs** package. To use the GitHub Packages build, configure `@rethunk-ai:registry` per [the upstream install guide](https://github.com/Rethunk-AI/rethunk-github-mcp/blob/main/docs/install.md#github-packages) and edit `.mcp.json` to use `@rethunk-ai/github-mcp`.

## Requirements

- **Node.js ≥ 22** (`npx` ships with it).
- **GitHub token** — every tool except `gh_auth_status` needs one. Export `GITHUB_TOKEN` (scopes: `repo`, plus `read:org` for `org_pulse`) in the environment that launches Claude Code; `.mcp.json` forwards it via `${GITHUB_TOKEN}`.

GitHub Enterprise: also export `GITHUB_API_URL` / `GITHUB_GRAPHQL_URL` and add them to the `env` block in `.mcp.json`.
