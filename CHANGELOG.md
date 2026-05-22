# Changelog

All notable changes to this marketplace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CI** (`.github/workflows/ci.yml`) — runs `scripts/validate.mjs` on every PR and push: parses every manifest, cross-checks marketplace ↔ plugin `name`, verifies `source` paths resolve, asserts version pins match `plugin.json`, and rejects hardcoded secrets.
- **Upstream drift check** (`.github/workflows/drift-check.yml`) — weekly scheduled run of `scripts/check-drift.mjs` compares each `.mcp.json` pin against npm `latest` and opens an issue on drift.
- Issue forms (`.github/ISSUE_TEMPLATE/`), a pull-request template, and `.gitignore`.

## [1.1.0] — 2026-05-22

### Added

- **`citadel-sdd`** plugin — bundles the `@rethunk/citadel-sdd` Citadel Spec-Driven Development MCP server, pinned to `0.5.0`. Local-only, no token.

## [1.0.0] — 2026-05-22

### Added

- Initial marketplace catalog (`.claude-plugin/marketplace.json`, name `rethunk-marketplace`).
- **`rethunk-git`** plugin — bundles the `@rethunk/mcp-multi-root-git` MCP server, pinned to `2.5.0`.
- **`rethunk-github`** plugin — bundles the `@rethunk/github-mcp` MCP server, pinned to `1.1.0`; forwards `GITHUB_TOKEN` from the environment.
- Repository documentation tier: `README.md`, `HUMANS.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, and per-plugin `README.md` files.
- `CODEOWNERS`, Apache-2.0 `LICENSE`.

[Unreleased]: https://github.com/Rethunk-Tech/claude-plugins/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Rethunk-Tech/claude-plugins/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Rethunk-Tech/claude-plugins/releases/tag/v1.0.0
