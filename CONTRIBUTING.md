# Contributing

Rethunk-Tech internal project. External PRs are not expected, but the process is documented for clarity. Marketplace architecture and the manifest model are in [AGENTS.md](AGENTS.md).

## Prerequisites

- **Claude Code** — provides `claude plugin validate` and `claude plugin marketplace`.
- **Node.js ≥ 22** — to smoke-test an MCP-bundling plugin (`npx`).
- **Git ≥ 2.28**.

There is no build, test runner, or dependency install — this repository is JSON manifests and Markdown.

## Adding or updating a plugin

1. Create `plugins/<plugin-name>/.claude-plugin/plugin.json` with at least `name` (kebab-case, matching the directory) and a semver `version`.
2. Add the plugin's components at the plugin root — `.mcp.json`, `commands/`, `skills/`, `agents/`, and/or `hooks/`.
3. Add a `plugins/<plugin-name>/README.md` describing what the plugin adds.
4. Register the plugin in `.claude-plugin/marketplace.json` under `plugins[]` with a matching `name` and a `source` (`"./<plugin-name>"` — `metadata.pluginRoot` prepends `plugins/`).
5. For MCP servers wrapped from npm, pin an **exact** version (`@scope/pkg@x.y.z`) and keep it in lockstep with the `plugin.json` `version`.
6. Never put secrets in `.mcp.json` — forward them from the environment with `${VAR}`.

## Validation

Run before every commit — there is no CI gate, so this is the only check:

```sh
claude plugin validate ./plugins/<plugin-name>     # validate one plugin
claude plugin marketplace add ./ --scope local     # smoke-test the catalog locally
```

Confirm every JSON file parses (a trailing comma breaks installation for all users) and that each marketplace entry `name` matches its `plugin.json` `name`.

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

- [ ] `claude plugin validate` passes for every changed plugin.
- [ ] Catalog smoke-tests: `claude plugin marketplace add ./ --scope local`.
- [ ] Marketplace entry `name` matches the plugin manifest `name`.
- [ ] MCP version pins in `.mcp.json` match the `plugin.json` `version`.
- [ ] No secrets in any `.mcp.json` — only `${VAR}` references.
- [ ] `CHANGELOG.md` entry added under `[Unreleased]`.
- [ ] Public-facing changes reflected in `README.md`, `HUMANS.md`, and `AGENTS.md`.

## Releases

The marketplace itself is versioned via `version` in `marketplace.json` and `CHANGELOG.md`. Bumping an individual plugin's `version` is what delivers updates to installed users (those on pinned versions only update when the number changes). On release: move `[Unreleased]` notes under a new dated heading and tag `vX.Y.Z`.
