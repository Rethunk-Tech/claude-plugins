# Contributing

Rethunk-Tech internal project. External PRs are not expected, but the process is documented for clarity. Marketplace architecture and the manifest model are in [AGENTS.md](AGENTS.md).

## Prerequisites

- **Claude Code** — provides `claude plugin validate` and `claude plugin marketplace`.
- **Node.js ≥ 22** — to smoke-test an MCP-bundling plugin (`npx`).
- **Git ≥ 2.28**.

There is no build or dependency install — this repository is JSON manifests and Markdown. The only check is `scripts/validate.mjs` (plain Node, no dependencies), which CI also runs.

## Adding or updating a plugin

1. Create `plugins/<plugin-name>/.claude-plugin/plugin.json` with at least `name` (kebab-case, matching the directory) and a semver `version`.
2. Add the plugin's components at the plugin root — `.mcp.json`, `commands/`, `skills/`, `agents/`, and/or `hooks/`.
3. Add a `plugins/<plugin-name>/README.md` describing what the plugin adds.
4. Register the plugin in `.claude-plugin/marketplace.json` under `plugins[]` with a matching `name` and a `source` — the full path relative to the marketplace root, e.g. `"./plugins/<plugin-name>"`.
5. For MCP servers wrapped from npm, pin an **exact** version (`@scope/pkg@x.y.z`) and keep it in lockstep with the `plugin.json` `version`.
6. Never put secrets in `.mcp.json` — forward them from the environment with `${VAR}`.

## Validation

`scripts/validate.mjs` parses every manifest, cross-checks each marketplace entry `name` against its `plugin.json` `name`, confirms `source` paths resolve, asserts version pins match `plugin.json` `version`, and rejects hardcoded secrets in `.mcp.json`. CI (`.github/workflows/ci.yml`) runs it on every PR and push to `main`. Run it locally before committing:

```sh
node scripts/validate.mjs                          # full catalog check (what CI runs)
claude plugin validate ./plugins/<plugin-name>     # deeper per-plugin check
claude plugin marketplace add ./ --scope local     # smoke-test the catalog locally
```

A trailing comma or an unmatched `name` breaks installation for every user — `validate.mjs` is the gate that catches it.

A scheduled workflow (`.github/workflows/drift-check.yml`) runs `scripts/check-drift.mjs` weekly, comparing each `.mcp.json` version pin against npm `latest` and opening an issue when an upstream MCP server has a newer release.

## Commit conventions

```text
type(scope): imperative summary ≤72 chars

Body explains WHY this change exists — motivation, context, constraints.
Not a file list. Not a summary of what the diff already shows.
```

| Type | When |
|------|------|
| `feat` | New plugin or new plugin capability |
| `fix` | Broken manifest or wiring corrected |
| `docs` | Documentation only |
| `chore` | Maintenance, version bumps, tooling |
| `ci` | CI/CD config |

One logical unit per commit. Scope to a single plugin where possible.

## Pull request checklist

- [ ] `node scripts/validate.mjs` passes.
- [ ] `claude plugin validate` passes for every changed plugin.
- [ ] Marketplace entry `name` matches the plugin manifest `name`.
- [ ] MCP version pins in `.mcp.json` match the `plugin.json` `version`.
- [ ] No secrets in any `.mcp.json` — only `${VAR}` references.
- [ ] `CHANGELOG.md` entry added under `[Unreleased]`.
- [ ] Public-facing changes reflected in `README.md`, `HUMANS.md`, and `AGENTS.md`.

## Releases

The marketplace itself is versioned via `version` in `marketplace.json` and `CHANGELOG.md`. Bumping an individual plugin's `version` is what delivers updates to installed users (those on pinned versions only update when the number changes). On release: move `[Unreleased]` notes under a new dated heading and tag `vX.Y.Z`.
