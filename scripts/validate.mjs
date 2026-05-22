#!/usr/bin/env node
// Validates the marketplace catalog and every plugin manifest.
// No dependencies — runs on plain Node. CI runs this on every PR and push.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];
const err = (m) => errors.push(m);

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(`${label}: invalid JSON — ${e.message}`);
    return null;
  }
}

const mk = readJson(join(root, ".claude-plugin/marketplace.json"), "marketplace.json");
if (mk) {
  if (!mk.name) err('marketplace.json: missing "name"');
  if (!mk.owner?.name) err('marketplace.json: missing "owner.name"');
  if (!Array.isArray(mk.plugins)) err('marketplace.json: "plugins" must be an array');
  const plugins = Array.isArray(mk.plugins) ? mk.plugins : [];

  const seen = new Set();

  for (const entry of plugins) {
    const label = entry?.name ?? "(unnamed entry)";
    if (!entry?.name) {
      err("marketplace.json: a plugin entry is missing \"name\"");
      continue;
    }
    if (seen.has(entry.name)) err(`plugin "${label}": duplicate marketplace entry`);
    seen.add(entry.name);

    // Object sources (github, git-subdir, url, npm) are valid — see AGENTS.md.
    // They point outside this repo, so there is nothing local to cross-check; skip.
    if (typeof entry.source !== "string") continue;
    // `source` resolves relative to the marketplace root — see AGENTS.md.
    const dir = join(root, entry.source);
    if (!existsSync(dir)) {
      err(`plugin "${label}": source path does not resolve — ${entry.source}`);
      continue;
    }

    const manifestPath = join(dir, ".claude-plugin/plugin.json");
    if (!existsSync(manifestPath)) {
      err(`plugin "${label}": missing .claude-plugin/plugin.json`);
      continue;
    }
    const manifest = readJson(manifestPath, `${label}/plugin.json`);
    if (!manifest) continue;
    if (manifest.name !== entry.name) {
      err(`plugin "${label}": plugin.json name "${manifest.name}" != marketplace entry name`);
    }
    if (!manifest.version) {
      err(`plugin "${label}": plugin.json has no "version" — Claude Code would track the commit SHA and silently update every installed user`);
    }

    const mcpPath = join(dir, ".mcp.json");
    if (!existsSync(mcpPath)) continue;
    const mcp = readJson(mcpPath, `${label}/.mcp.json`);
    if (!mcp) continue;

    for (const [server, cfg] of Object.entries(mcp.mcpServers ?? {})) {
      for (const [k, v] of Object.entries(cfg.env ?? {})) {
        if (typeof v === "string" && /(ghp_|github_pat_|sk-|npm_)[A-Za-z0-9]/.test(v)) {
          err(`plugin "${label}" server "${server}": env "${k}" looks like a hardcoded secret — use \${VAR}`);
        }
      }
      const pin = (cfg.args ?? []).map(String).find((a) => /@[^@]+@\d+\.\d+\.\d+/.test(a));
      if (pin && manifest.version) {
        const m = pin.match(/@(\d+\.\d+\.\d+)$/);
        if (m && m[1] !== manifest.version) {
          err(`plugin "${label}": .mcp.json pins ${m[1]} but plugin.json version is ${manifest.version} — keep them in lockstep`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} validation error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✓ marketplace and all plugin manifests are valid");
