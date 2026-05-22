# rethunk-git

Bundles the **multi-root git MCP server** for Claude Code.

Tools register under the `rethunk-git` server name and appear as `mcp__rethunk-git__<tool>` — `git_status`, `git_inventory`, `git_parity`, `git_diff` / `git_diff_summary`, `git_log`, `git_show`, `git_fetch`, `git_stash_*`, `git_tag`, `batch_commit`, `git_push`, `git_merge`, `git_cherry_pick`, `git_worktree_*`, `git_reset_soft`, and `list_presets`.

## Source package

| Registry | Package |
|----------|---------|
| npmjs (manual releases) | [`@rethunk/mcp-multi-root-git`](https://www.npmjs.com/package/@rethunk/mcp-multi-root-git) |
| GitHub Packages (CI on each tag) | [`@rethunk-ai/mcp-multi-root-git`](https://github.com/Rethunk-AI/mcp-multi-root-git/packages) |

This plugin pins the **npmjs** package — no `.npmrc` setup required. To track the CI-aligned GitHub Packages build instead, configure `@rethunk-ai:registry` per [the upstream install guide](https://github.com/Rethunk-AI/mcp-multi-root-git/blob/main/docs/install.md#github-packages) and edit `.mcp.json` to use `@rethunk-ai/mcp-multi-root-git`.

## Requirements

- **Git** on `PATH` — the server shells out to `git` (`git_not_found` otherwise).
- **Node.js ≥ 22** (`npx` ships with it).

No token or `cwd` needed: repos resolve from the MCP workspace roots Claude Code passes at `initialize`. Optional: set `GIT_SUBPROCESS_PARALLELISM` (default `4`) in the environment to tune fleet-scan concurrency.
