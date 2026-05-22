# Rethunk Claude Plugins

[![GitHub release](https://img.shields.io/github/v/release/Rethunk-Tech/claude-plugins?logo=github&label=release)](https://github.com/Rethunk-Tech/claude-plugins/releases/latest)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin%20marketplace-d97757.svg)](https://docs.claude.com/en/docs/claude-code/plugins)

A [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins) for Rethunk's prompts, agents, and MCP servers — one `marketplace add` wires a teammate's Claude Code to the whole catalog.

## Highlights

- **One-command install** — `claude plugin marketplace add Rethunk-Tech/claude-plugins`, then install any plugin by name.
- **`rethunk-git`** — multi-root git MCP server: status, inventory, HEAD parity, diffs, batch commit, push, merge, worktrees. No token required.
- **`rethunk-github`** — GitHub rollup MCP server: multi-repo dashboards, PR preflight, CI diagnosis, releases, and write tools.
- **`citadel-sdd`** — Citadel Spec-Driven Development MCP server: the spec lifecycle, task tracking, lint, and status for agent workflows.
- **Reproducible** — each plugin pins its MCP server to an exact npm version; no GitHub Packages auth needed to install.
- **Secret-free manifests** — tokens are forwarded from the environment, never committed.

## Documentation

| Doc | Audience |
|-----|----------|
| **[HUMANS.md](HUMANS.md)** | Operators: adding the marketplace, installing plugins, requirements, troubleshooting |
| **[AGENTS.md](AGENTS.md)** | Agents & contributors: marketplace architecture, the two-tier manifest model, conventions |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Adding or updating a plugin, validation, commit conventions, releases |
| **[SECURITY.md](SECURITY.md)** | Disclosure policy, supply-chain and token-handling risk model |
| **[CHANGELOG.md](CHANGELOG.md)** | Notable changes per release |

## License

[Apache-2.0](LICENSE). The wrapped MCP servers (`@rethunk/mcp-multi-root-git`, `@rethunk/github-mcp`, `@rethunk/citadel-sdd`) are distributed separately by Rethunk-AI under their own MIT licenses.
