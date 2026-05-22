# Rethunk Claude Marketplace

A [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins) for Rethunk's prompts, agents, and MCP servers.

## Use it

```sh
claude plugin marketplace add Rethunk-Tech/claude-plugins
claude plugin install rethunk-git@rethunk-marketplace
claude plugin install rethunk-github@rethunk-marketplace
```

Or interactively with `/plugin` inside Claude Code.

## Plugins

| Plugin | What it adds |
|--------|--------------|
| [`rethunk-git`](plugins/rethunk-git) | Multi-root git MCP server — status, inventory, HEAD parity, diffs, batch commit, push, merge, worktrees. No token needed. |
| [`rethunk-github`](plugins/rethunk-github) | GitHub rollup MCP server — multi-repo dashboards, PR preflight, CI diagnosis, releases, write tools. Needs `GITHUB_TOKEN`. |

## Layout

```
.claude-plugin/marketplace.json   # the catalog
plugins/<name>/
  .claude-plugin/plugin.json      # plugin manifest
  .mcp.json                       # bundled MCP server
  README.md
```

## License

[Apache-2.0](LICENSE). The wrapped MCP servers (`@rethunk/mcp-multi-root-git`, `@rethunk/github-mcp`) are distributed separately by Rethunk-AI under their own MIT licenses.
