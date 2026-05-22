# Security Policy

## Reporting Security Vulnerabilities

**DO NOT** open a public GitHub issue for security vulnerabilities. Report them responsibly to [security@rethunk.tech](mailto:security@rethunk.tech).

**Response SLA:** We aim to respond to security reports within 24 hours.

When reporting a vulnerability, please include:

- Description of the vulnerability
- Affected component(s) and version(s)
- Steps to reproduce, if applicable
- Potential impact
- Suggested fix, if available

## Scope & Risk Profile

This repository is a **Claude Code plugin marketplace** — a catalog of JSON manifests. It contains no executable code of its own. The security surface is what installing a plugin causes a user's Claude Code to run, and the integrity of the manifests that point there.

### Supply-chain Risk

- **High:** Each plugin's `.mcp.json` instructs Claude Code to run an MCP server. The plugins here use `npx -y @scope/pkg@x.y.z`, which downloads and executes that package from npm at launch.
- Plugins pin **exact** versions (`@x.y.z`), never ranges or `latest`, so an installed plugin runs the same code until its `version` is deliberately bumped.
- Review the upstream package and its release before bumping a pinned version. The wrapped servers are maintained at [`Rethunk-AI/mcp-multi-root-git`](https://github.com/Rethunk-AI/mcp-multi-root-git) and [`Rethunk-AI/rethunk-github-mcp`](https://github.com/Rethunk-AI/rethunk-github-mcp).
- A compromised manifest in this repo could redirect a plugin to a malicious package. Branch protection and CODEOWNERS review on `main` are the primary defense; treat manifest edits as releases.

### Credential Handling

- **Critical:** Manifests must never contain tokens or secrets. Credentials are forwarded from the environment with `${VAR}` expansion (e.g. `"GITHUB_TOKEN": "${GITHUB_TOKEN}"`); the value lives only in the user's environment, never in the repo.
- Any PR introducing a literal secret into a `.mcp.json` must be rejected and the secret rotated.
- The `rethunk-github` plugin consumes a GitHub token at the user's machine — see that server's own `SECURITY.md` for token-scope and mutation-risk guidance. Prefer least-privilege, read-only tokens unless write tools are needed.

### Manifest Integrity

- **Medium:** A malformed manifest (trailing comma, mismatched `name`, wrong `source`) breaks installation for every user of the marketplace.
- Validate with `claude plugin validate` before merging; confirm `source` paths resolve within this repository.

## Security Practices

- Pin every wrapped npm package to an exact version; never `latest` or a range.
- Keep `marketplace.json` and each `plugin.json` `version` in lockstep with the upstream package version they wrap.
- Require CODEOWNERS review for any change under `.claude-plugin/` or `plugins/`.
- Audit upstream MCP server releases before bumping a pinned version.
- Never commit a `.npmrc` with a registry auth token.

## Supported Versions

Latest release only.

| Version | Supported |
|---------|-----------|
| 1.x | Yes |
| < 1.0 | No |

## Known Vulnerabilities

None currently known. Reports are welcome via [security@rethunk.tech](mailto:security@rethunk.tech).

## Incident Response

If a security vulnerability is discovered:

1. Report immediately to [security@rethunk.tech](mailto:security@rethunk.tech) and do not disclose publicly.
2. Include reproduction steps and affected version(s).
3. Allow 24-48 hours for initial response and triage.
4. Coordinate a disclosure timeline if a patch is required.
5. Credit will be given to the reporter if desired.

## Contact

- **Security Issues:** [security@rethunk.tech](mailto:security@rethunk.tech)
- **General Support:** [support@rethunk.tech](mailto:support@rethunk.tech)
- **Website:** [rethunk.tech](https://rethunk.tech)

---

**Last updated:** 2026-05-22
