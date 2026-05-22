# AGENTS.md — LLM + contributor onboarding

IDEs injecting context: don't re-link from rules.

A **Claude Code plugin marketplace** for Rethunk-Tech — a curated catalog distributing Rethunk's prompts (slash commands / skills), subagents, hooks, and MCP servers. It is consumed, not run: teammates add it with `claude plugin marketplace add Rethunk-Tech/claude-plugins` and install individual plugins.

**Canonical docs — don't duplicate:**

- Adding the marketplace, installing plugins, requirements → [HUMANS.md](HUMANS.md)
- Adding/updating a plugin, validation, commit conventions, releases → [CONTRIBUTING.md](CONTRIBUTING.md)
- Disclosure policy, supply-chain risk → [SECURITY.md](SECURITY.md)
- Notable changes per release → [CHANGELOG.md](CHANGELOG.md)

## Repository layout

```
.claude-plugin/marketplace.json     # The catalog — REQUIRED, the single entrypoint
plugins/<plugin-name>/              # One directory per plugin (source: "./plugins/<name>")
  .claude-plugin/plugin.json        # Plugin manifest
  .mcp.json                         # MCP server definitions
  commands/*.md                     # Slash-command prompts (flat .md files)
  skills/<name>/SKILL.md            # Model-invoked skills
  agents/*.md                       # Subagent definitions
  hooks/hooks.json                  # Event handlers
```

Current plugins, both pure MCP re-exports of servers maintained in `Rethunk-AI/`:

| Plugin | Wraps npm package | Upstream repo |
|--------|-------------------|---------------|
| `rethunk-git` | `@rethunk/mcp-multi-root-git` | `Rethunk-AI/mcp-multi-root-git` |
| `rethunk-github` | `@rethunk/github-mcp` | `Rethunk-AI/rethunk-github-mcp` |

## Architecture: the two-tier manifest model

There is no build, test, or run step. Correctness = **valid JSON manifests** that resolve. Two tiers must stay consistent:

1. **`.claude-plugin/marketplace.json`** — the catalog. Required fields: `name` (kebab-case), `owner` `{name, email?}`, `plugins[]`. Each plugin entry needs `name` + `source`. `metadata.pluginRoot` sets a base dir (`"plugins"`) so entries use bare relative paths.

2. **`plugins/<name>/.claude-plugin/plugin.json`** — per-plugin manifest. Only `name` is required; set `version` (semver) to pin updates — omitting it makes Claude Code track the git commit SHA, so every push silently updates installed users.

The marketplace entry's `name` and the plugin manifest's `name` must match. Component directories (`commands/`, `skills/`, `agents/`, `hooks/`, `.mcp.json`) live at the **plugin root**, not inside `.claude-plugin/`.

## Plugin sources

`source` in a marketplace entry can be a relative path (`"./plugins/foo"`) or an object: `{source: "github", repo: "owner/repo", ref?, sha?}`, `git-subdir`, `url`, or `npm`. Prefer in-repo relative paths for plugins authored here; use `github`/`git-subdir` only to re-export plugins maintained elsewhere.

## Bundling MCP servers

MCP servers go in a plugin's `.mcp.json` (or inline under `mcpServers` in `plugin.json`). Reference plugin-bundled files with the `${CLAUDE_PLUGIN_ROOT}` variable for `command` and `args` paths — never hardcode absolute paths, since the plugin installs into an arbitrary location on the user's machine.

## Two registries per MCP package

Each upstream MCP server is published twice under different names:

- **npmjs** — `@rethunk/<pkg>`, manual releases. The plugin `.mcp.json` files pin **this** name with an exact version (`@rethunk/...@x.y.z`) so no `.npmrc` auth is needed.
- **GitHub Packages** — `@rethunk-ai/<pkg>` (org-scoped), published by CI on every tag. Requires `@rethunk-ai:registry` + a `read:packages` token in `~/.npmrc`.

Keep a plugin's `.claude-plugin/plugin.json` `version` and the pinned `@rethunk/...@x.y.z` in `.mcp.json` in lockstep with the upstream package version.

## Conventions

- Plugin and marketplace `name` values are kebab-case.
- The MCP server name inside `.mcp.json` (`rethunk-git`, `rethunk-github`) is fixed by the upstream docs — tools surface as `mcp__<server-name>__<tool>`. Don't rename it.
- Secrets are never written into `.mcp.json`. Forward them from the environment with `${VAR}` (e.g. `"GITHUB_TOKEN": "${GITHUB_TOKEN}"`).
- Slash commands are namespaced on install as `/<plugin-name>:<command-name>` — name commands so that reads well.
- Bump a plugin's `version` on any change to its commands/agents/MCP config; users on pinned versions only get updates when the number changes.

## Changing things

- **Add or update a plugin:** follow [CONTRIBUTING.md](CONTRIBUTING.md) — validate, bump versions, add a `CHANGELOG.md` entry.
- **Public-facing change** (new plugin, renamed plugin, changed install command): update [README.md](README.md), [HUMANS.md](HUMANS.md), and this file together.
- Every manifest is JSON — a trailing comma or an unmatched `name` breaks installation for all users. Treat manifest edits as releases.
