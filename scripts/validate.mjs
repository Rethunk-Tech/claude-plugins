#!/usr/bin/env node
// Validates the marketplace catalog and every plugin manifest.
// No dependencies — runs on plain Node. CI runs this on every PR and push.

import { existsSync, readFileSync, readdirSync } from "node:fs";
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

// E8 — expanded secret patterns (applied to command, args, and env values).
// A ${VAR} forwarding reference is explicitly safe — skip exact matches.
const SECRET_PATTERNS = [
  /(ghp_|github_pat_|sk-|npm_)[A-Za-z0-9]/,
  /AKIA[0-9A-Z]{16}/,
  /glpat-[A-Za-z0-9_-]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]+/,
];

function isEnvRef(v) {
  return /^\$\{[^}]+\}$/.test(v);
}

function looksLikeSecret(v) {
  if (isEnvRef(v)) return false;
  return SECRET_PATTERNS.some((p) => p.test(v));
}

// E1 — determine whether a server is npm/npx-sourced and enforce exact pin.
// Exact pin = @scope/name@X.Y.Z where X.Y.Z is plain semver digits, nothing else.
const EXACT_PIN_RE = /@[^@\s]+@\d+\.\d+\.\d+$/;

function findPackageSpecArg(args) {
  // The package spec arg starts with @ (scoped) or is an npm package name.
  // We only flag scoped packages (@scope/name) since those are the ones used here.
  return args.find((a) => a.startsWith("@"));
}

function isNpmNpxServer(cfg) {
  if (cfg.command === "npx") return true;
  const args = (cfg.args ?? []).map(String);
  return args.some((a) => a.startsWith("@"));
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
      const args = (cfg.args ?? []).map(String);

      // E8 — scan command, args, and env values for hardcoded secrets.
      if (typeof cfg.command === "string" && looksLikeSecret(cfg.command)) {
        err(`plugin "${label}" server "${server}": command looks like a hardcoded secret — use \${VAR}`);
      }
      for (let i = 0; i < args.length; i++) {
        if (looksLikeSecret(args[i])) {
          err(`plugin "${label}" server "${server}": args[${i}] looks like a hardcoded secret — use \${VAR}`);
        }
      }
      for (const [k, v] of Object.entries(cfg.env ?? {})) {
        if (typeof v === "string" && looksLikeSecret(v)) {
          err(`plugin "${label}" server "${server}": env "${k}" looks like a hardcoded secret — use \${VAR}`);
        }
      }

      // E1 — enforce exact npm/npx pin.
      if (isNpmNpxServer(cfg)) {
        const spec = findPackageSpecArg(args);
        if (spec !== undefined) {
          if (!EXACT_PIN_RE.test(spec)) {
            err(`plugin "${label}" server "${server}": package "${spec}" is not pinned to an exact version — use @scope/name@X.Y.Z (SECURITY.md: never latest or a range)`);
          } else if (manifest.version) {
            // Existing lockstep check: pin version must equal plugin.json version.
            const m = spec.match(/@(\d+\.\d+\.\d+)$/);
            if (m && m[1] !== manifest.version) {
              err(`plugin "${label}": .mcp.json pins ${m[1]} but plugin.json version is ${manifest.version} — keep them in lockstep`);
            }
          }
        }
      }
    }
  }

  // E7 — orphan plugin detection: scan plugins/ for directories with a plugin.json
  // that are not registered in marketplace.json.
  const pluginsDir = join(root, "plugins");
  if (existsSync(pluginsDir)) {
    for (const dirName of readdirSync(pluginsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)) {
      const pluginJson = join(pluginsDir, dirName, ".claude-plugin/plugin.json");
      if (!existsSync(pluginJson)) continue;
      const pluginManifest = readJson(pluginJson, `plugins/${dirName}/plugin.json`);
      const matchKey = pluginManifest?.name ?? dirName;
      if (!seen.has(matchKey)) {
        err(`plugin directory "plugins/${dirName}" has a plugin.json but is not registered in marketplace.json`);
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
