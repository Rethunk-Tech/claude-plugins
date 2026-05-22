## Summary

<!-- What changed and why. -->

## Checklist

- [ ] `node scripts/validate.mjs` passes.
- [ ] `claude plugin validate` passes for every changed plugin.
- [ ] Marketplace entry `name` matches the plugin manifest `name`.
- [ ] MCP version pins in `.mcp.json` match the `plugin.json` `version`.
- [ ] No secrets in any `.mcp.json` — only `${VAR}` references.
- [ ] `CHANGELOG.md` entry added under `[Unreleased]`.
- [ ] Public-facing changes reflected in `README.md`, `HUMANS.md`, and `AGENTS.md`.
