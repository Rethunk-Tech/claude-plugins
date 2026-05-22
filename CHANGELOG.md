# Changelog

All notable changes to this marketplace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable MD024 -->

## [Unreleased]

### Added

- **`citadel-sdd`** plugin — bundles the `@rethunk/citadel-sdd` Citadel Spec-Driven Development MCP server, pinned to `0.5.0`. That version is not yet published to npmjs; the plugin works once Rethunk-AI publishes the release.

## [1.0.0] — 2026-05-22

### Added

- Initial marketplace catalog (`.claude-plugin/marketplace.json`, name `rethunk-marketplace`).
- **`rethunk-git`** plugin — bundles the `@rethunk/mcp-multi-root-git` MCP server, pinned to `2.5.0`.
- **`rethunk-github`** plugin — bundles the `@rethunk/github-mcp` MCP server, pinned to `1.1.0`; forwards `GITHUB_TOKEN` from the environment.
- Repository documentation tier: `README.md`, `HUMANS.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, and per-plugin `README.md` files.
- `CODEOWNERS`, Apache-2.0 `LICENSE`.

[Unreleased]: https://github.com/Rethunk-Tech/claude-plugins/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Rethunk-Tech/claude-plugins/releases/tag/v1.0.0

<!-- markdownlint-enable MD024 -->
