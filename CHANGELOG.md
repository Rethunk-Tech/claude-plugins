# Changelog

All notable changes to this marketplace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `scripts/validate.test.mjs` — `node:test` regression suite for the manifest validator; run with `node --test`. Paired with a root `package.json` exposing `test`, `validate`, and `drift` scripts. Zero dependencies.
- CI job running `claude plugin validate` per plugin alongside the existing `node scripts/validate.mjs` gate.
- `.github/workflows/release.yml` — on a `vX.Y.Z` tag, verifies the tag matches `marketplace.json` `version`, validates all manifests, and publishes a GitHub Release from the matching `CHANGELOG.md` section.
- `.github/dependabot.yml` — weekly `github-actions` ecosystem updates to keep SHA-pinned actions current.

### Changed

- `scripts/validate.mjs` now enforces exact-version pins on npm/npx MCP servers (rejects `latest`, ranges, and unpinned specs — previously a documented-but-unenforced SECURITY.md invariant), detects orphan plugin directories not registered in `marketplace.json`, and scans `command`, `args`, and `env` for hardcoded secrets with a broadened pattern set (GitHub/OpenAI/npm tokens, AWS AKIA, GitLab `glpat-`, Slack `xox*`); `${VAR}` references remain safe.
- `scripts/check-drift.mjs` now reports `npm view` failures as errors and exits non-zero instead of masking them as "all pins current"; adds an `--apply` mode that rewrites drifted pins in lockstep and prepends a CHANGELOG entry.
- `.github/workflows/drift-check.yml` opens a reviewable pull request (not an issue) when an upstream MCP server has a newer release, staging the lockstep bump for human review — never auto-merged.
- All GitHub Actions are pinned to commit SHAs (was mutable `@v6` tags).

## [1.2.0] — 2026-05-22

### Fixed

- **`scripts/validate.mjs` failed CI on valid object-form plugin sources.** A non-string `source` (`github`, `git-subdir`, `url`, `npm` — all documented as supported in [AGENTS.md](AGENTS.md)) was reported as an error, so CI would reject a correct manifest the first time a plugin was re-exported from another repo. Object sources are now accepted and skipped (nothing local to cross-check).
- `validate.mjs` no longer crashes with an uncaught `TypeError` when `marketplace.json` has a non-array `plugins` value or a `null` plugin entry — these now surface as clean validation errors.

### Changed

- `validate.mjs` now requires every `plugin.json` to declare a `version`. Without one, Claude Code tracks the commit SHA and silently updates all installed users — the validator now catches this.
- **`rethunk-git`** bumped to `2.6.0` (`@rethunk/mcp-multi-root-git@2.6.0`).
- **`rethunk-github`** bumped to `1.2.0` (`@rethunk/github-mcp@1.2.0`).
- **`citadel-sdd`** bumped to `0.6.0` (`@rethunk/citadel-sdd@0.6.0`).

## [1.1.0] — 2026-05-22

### Added

- **`citadel-sdd`** plugin — bundles the `@rethunk/citadel-sdd` Citadel Spec-Driven Development MCP server, pinned to `0.5.0`. Local-only, no token.
- **CI** (`.github/workflows/ci.yml`) — runs `scripts/validate.mjs` on every PR and push: parses every manifest, cross-checks marketplace ↔ plugin `name`, verifies `source` paths resolve, asserts version pins match `plugin.json`, and rejects hardcoded secrets.
- **Upstream drift check** (`.github/workflows/drift-check.yml`) — weekly scheduled run of `scripts/check-drift.mjs` compares each `.mcp.json` pin against npm `latest` and opens an issue on drift.
- Issue forms (`.github/ISSUE_TEMPLATE/`), a pull-request template, and `.gitignore`.

### Changed

- Renamed the marketplace from `rethunk-marketplace` to **`rethunk-plugins`**. Installs are now `<plugin>@rethunk-plugins`. Anyone who added the old marketplace must re-add it.

### Fixed

- **Plugin installs failed with "Source path does not exist."** Each `marketplace.json` plugin `source` was a bare `"./<name>"` paired with `metadata.pluginRoot: "plugins"`, but the installed Claude Code does not prepend `pluginRoot` — it resolves `source` relative to the marketplace root. Sources are now the full path (`"./plugins/<name>"`) and `metadata.pluginRoot` is removed.

## [1.0.0] — 2026-05-22

### Added

- Initial marketplace catalog (`.claude-plugin/marketplace.json`, name `rethunk-marketplace`).
- **`rethunk-git`** plugin — bundles the `@rethunk/mcp-multi-root-git` MCP server, pinned to `2.5.0`.
- **`rethunk-github`** plugin — bundles the `@rethunk/github-mcp` MCP server, pinned to `1.1.0`; forwards `GITHUB_TOKEN` from the environment.
- Repository documentation tier: `README.md`, `HUMANS.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, and per-plugin `README.md` files.
- `CODEOWNERS`, Apache-2.0 `LICENSE`.

[Unreleased]: https://github.com/Rethunk-Tech/claude-plugins/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Rethunk-Tech/claude-plugins/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Rethunk-Tech/claude-plugins/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Rethunk-Tech/claude-plugins/releases/tag/v1.0.0
