#!/usr/bin/env node
// Compares each plugin's pinned MCP-server version against npm `latest`.
// Prints a table; writes drift-report.md and GitHub Actions outputs.
// No dependencies — runs on plain Node.
//
// Usage:
//   node scripts/check-drift.mjs           # report mode (default)
//   node scripts/check-drift.mjs --apply   # rewrite drifted pins + CHANGELOG in place

import { appendFileSync, existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv } from "node:process";

// ─── Pure helpers (exported for testing) ─────────────────────────────────────

/** Rewrite a single @scope/pkg@OLD arg in .mcp.json content. */
export function rewriteMcpPin(content, pkg, pinned, latest) {
  return content.replace(`${pkg}@${pinned}`, `${pkg}@${latest}`);
}

/** Rewrite the "version" field in plugin.json content. */
export function rewritePluginVersion(content, pinned, latest) {
  return content.replace(`"version": "${pinned}"`, `"version": "${latest}"`);
}

/**
 * Prepend / append bullets under ## [Unreleased] → ### Changed in CHANGELOG.md.
 * Scoped strictly to the [Unreleased] block; never touches dated releases.
 */
export function patchChangelog(content, bullets) {
  const unreleasedIdx = content.indexOf("\n## [Unreleased]");
  if (unreleasedIdx === -1) return content; // no Unreleased block — leave untouched

  const blockStart = unreleasedIdx + 1; // start of "## [Unreleased]" line
  // Find the next top-level "## " heading after [Unreleased]
  const nextSectionIdx = content.indexOf("\n## ", unreleasedIdx + 1);
  const blockEnd = nextSectionIdx === -1 ? content.length : nextSectionIdx;

  const unreleasedBlock = content.slice(blockStart, blockEnd);
  const changedHeaderIdx = unreleasedBlock.indexOf("\n### Changed");

  let newBlock;
  if (changedHeaderIdx !== -1) {
    // Append to existing ### Changed section under [Unreleased]
    const afterChanged = changedHeaderIdx + "\n### Changed".length;
    const nextSubsectionIdx = unreleasedBlock.indexOf("\n### ", afterChanged);
    const changedBlockEnd = nextSubsectionIdx === -1 ? unreleasedBlock.length : nextSubsectionIdx;

    const changedSection = unreleasedBlock.slice(changedHeaderIdx, changedBlockEnd);
    const newChangedSection = changedSection.trimEnd() + "\n" + bullets.map((b) => `- ${b}`).join("\n") + "\n";
    newBlock = unreleasedBlock.slice(0, changedHeaderIdx) + newChangedSection + unreleasedBlock.slice(changedBlockEnd);
  } else {
    // Create a new ### Changed block directly under [Unreleased]
    const trimmed = unreleasedBlock.trimEnd();
    newBlock = trimmed + "\n\n### Changed\n\n" + bullets.map((b) => `- ${b}`).join("\n") + "\n";
  }

  return content.slice(0, blockStart) + newBlock + content.slice(blockEnd);
}

// Generate a CHANGELOG bullet matching the existing style:
//   **`<plugin>`** bumped to `<NEW>` (`<pkg>@<NEW>`).
export function makeBullet(plugin, pkg, latest) {
  return `**\`${plugin}\`** bumped to \`${latest}\` (\`${pkg}@${latest}\`).`;
}

// ─── Main (IO / exec / process.exit) ─────────────────────────────────────────

function main() {
  const root = process.cwd();
  const pluginsDir = join(root, "plugins");
  const applyMode = process.argv.includes("--apply");

  // ─── Collect rows ──────────────────────────────────────────────────────────

  const rows = [];

  for (const name of readdirSync(pluginsDir)) {
    const mcpPath = join(pluginsDir, name, ".mcp.json");
    if (!existsSync(mcpPath)) continue;
    const mcp = JSON.parse(readFileSync(mcpPath, "utf8"));
    for (const cfg of Object.values(mcp.mcpServers ?? {})) {
      const pin = (cfg.args ?? []).map(String).find((a) => /@[^@]+@\d+\.\d+\.\d+/.test(a));
      if (!pin) continue;
      const m = pin.match(/^(.+)@(\d+\.\d+\.\d+)$/);
      if (!m) continue;
      const [, pkg, pinned] = m;
      let latest = null;
      let error = false;
      try {
        latest = execFileSync("npm", ["view", pkg, "version"], { encoding: "utf8" }).trim();
      } catch {
        error = true;
      }
      const drift = !error && /^\d+\.\d+\.\d+$/.test(latest) && latest !== pinned;
      rows.push({ plugin: name, pkg, pinned, latest, drift, error });
    }
  }

  // ─── Build and write report ────────────────────────────────────────────────

  let table = "| Plugin | Package | Pinned | npm latest |\n|---|---|---|---|\n";
  for (const r of rows) {
    let latestCell;
    if (r.error) {
      latestCell = "(npm view failed) ✖";
    } else {
      latestCell = r.drift ? `${r.latest} ⚠️` : r.latest;
    }
    table += `| ${r.plugin} | \`${r.pkg}\` | ${r.pinned} | ${latestCell} |\n`;
  }
  console.log(table);

  const drifted = rows.filter((r) => r.drift);
  const errored = rows.filter((r) => r.error);

  const body =
    `One or more bundled MCP servers have a newer release on npm than the version pinned in this marketplace.\n\n` +
    `${table}\n` +
    `For each drifted row: bump the pin in the plugin's \`.mcp.json\` **and** \`.claude-plugin/plugin.json\` ` +
    `together, then add a \`CHANGELOG.md\` entry. See [AGENTS.md](../AGENTS.md).\n`;
  writeFileSync(join(root, "drift-report.md"), body);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `drift=${drifted.length > 0}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `errors=${errored.length}\n`);
  }

  if (errored.length > 0) {
    console.error(`✖  ${errored.length} plugin(s) could not be checked (npm view failed)`);
  }
  if (drifted.length > 0) {
    console.log(`⚠️  ${drifted.length} plugin(s) behind npm latest`);
  } else if (errored.length === 0) {
    console.log("✓ all pins current");
  }

  // ─── Apply mode ────────────────────────────────────────────────────────────

  if (!applyMode) {
    // Exit with a non-zero code when npm view failed so CI sees a check failure.
    if (errored.length > 0) process.exit(1);
    process.exit(0);
  }

  // --apply: rewrite drifted pins only (never errored rows).
  if (drifted.length === 0) {
    console.log("Nothing to apply — all reachable pins are current.");
    process.exit(0);
  }

  // Apply each drifted pin.
  for (const r of drifted) {
    const mcpPath = join(pluginsDir, r.plugin, ".mcp.json");
    const pluginJsonPath = join(pluginsDir, r.plugin, ".claude-plugin", "plugin.json");

    const newMcp = rewriteMcpPin(readFileSync(mcpPath, "utf8"), r.pkg, r.pinned, r.latest);
    writeFileSync(mcpPath, newMcp);

    const newPlugin = rewritePluginVersion(readFileSync(pluginJsonPath, "utf8"), r.pinned, r.latest);
    writeFileSync(pluginJsonPath, newPlugin);

    console.log(`  bumped ${r.plugin}: ${r.pinned} → ${r.latest}`);
  }

  // Patch CHANGELOG.md.
  const changelogPath = join(root, "CHANGELOG.md");
  if (existsSync(changelogPath)) {
    const bullets = drifted.map((r) => makeBullet(r.plugin, r.pkg, r.latest));
    const patched = patchChangelog(readFileSync(changelogPath, "utf8"), bullets);
    writeFileSync(changelogPath, patched);
    console.log("  updated CHANGELOG.md");
  }

  console.log(`✓ applied ${drifted.length} bump(s).`);
}

// ─── Direct-run guard ─────────────────────────────────────────────────────────

if (argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(argv[1])) {
  main();
}
