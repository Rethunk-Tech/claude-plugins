#!/usr/bin/env node
// Compares each plugin's pinned MCP-server version against npm `latest`.
// Prints a table; writes drift-report.md and a `drift` GitHub Actions output.
// No dependencies — runs on plain Node.

import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const pluginsDir = join(root, "plugins");
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
    let latest;
    try {
      latest = execFileSync("npm", ["view", pkg, "version"], { encoding: "utf8" }).trim();
    } catch {
      latest = "(npm view failed)";
    }
    rows.push({ plugin: name, pkg, pinned, latest, drift: /^\d/.test(latest) && latest !== pinned });
  }
}

let table = "| Plugin | Package | Pinned | npm latest |\n|---|---|---|---|\n";
for (const r of rows) {
  table += `| ${r.plugin} | \`${r.pkg}\` | ${r.pinned} | ${r.latest}${r.drift ? " ⚠️" : ""} |\n`;
}
console.log(table);

const drifted = rows.filter((r) => r.drift);
const body =
  `One or more bundled MCP servers have a newer release on npm than the version pinned in this marketplace.\n\n` +
  `${table}\n` +
  `For each drifted row: bump the pin in the plugin's \`.mcp.json\` **and** \`.claude-plugin/plugin.json\` ` +
  `together, then add a \`CHANGELOG.md\` entry. See [AGENTS.md](../AGENTS.md).\n`;
writeFileSync(join(root, "drift-report.md"), body);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `drift=${drifted.length > 0}\n`);
}
console.log(drifted.length ? `⚠️  ${drifted.length} plugin(s) behind npm latest` : "✓ all pins current");
