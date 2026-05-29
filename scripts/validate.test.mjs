#!/usr/bin/env node
/**
 * Regression tests for scripts/validate.mjs
 *
 * Uses ONLY Node built-ins: node:test, node:assert, node:fs, node:os, node:path,
 * node:child_process. Zero third-party dependencies.
 *
 * Each test builds an isolated temp fixture under os.tmpdir(), runs validate.mjs
 * as a subprocess with cwd= that temp dir, and asserts on exit code + output.
 *
 * Run:  node --test scripts/validate.test.mjs
 *   or: node --test   (from repo root, picks up all *.test.mjs via glob)
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALIDATE_MJS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "validate.mjs"
);

/**
 * Write a tree of files described by `layout` into `dir`.
 * Keys are relative paths; values are strings (written as-is) or objects
 * (JSON.stringified with 2-space indent).
 *
 * @param {string} dir  - absolute base directory (must already exist)
 * @param {Record<string, string | object>} layout
 */
function writeFixture(dir, layout) {
  for (const [rel, content] of Object.entries(layout)) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(
      abs,
      typeof content === "string" ? content : JSON.stringify(content, null, 2),
      "utf8"
    );
  }
}

/**
 * Create a fresh mkdtemp directory under os.tmpdir().
 * Returns the absolute path.
 */
function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "mkt-test-"));
}

/**
 * Run validate.mjs inside `cwd` and return { status, stdout, stderr }.
 */
function runValidate(cwd) {
  const result = spawnSync(process.execPath, [VALIDATE_MJS], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

// ---------------------------------------------------------------------------
// Shared fixture builders
// ---------------------------------------------------------------------------

/**
 * Build a minimal, fully-valid single-plugin marketplace in `dir`.
 * Accepts optional overrides for each of the three JSON files.
 */
function validMarketplace(dir, {
  marketplaceOverride = null,
  pluginManifestOverride = null,
  mcpOverride = null,
  pluginName = "test-plugin",
  pluginVersion = "1.0.0",
} = {}) {
  const marketplace = marketplaceOverride ?? {
    name: "test-marketplace",
    owner: { name: "Test Org" },
    plugins: [
      { name: pluginName, source: `./plugins/${pluginName}` },
    ],
  };

  const pluginManifest = pluginManifestOverride ?? {
    name: pluginName,
    version: pluginVersion,
  };

  const mcp = mcpOverride ?? {
    mcpServers: {
      "test-server": {
        command: "npx",
        args: ["-y", `@scope/${pluginName}@${pluginVersion}`],
        env: { MY_TOKEN: "${MY_TOKEN}" },
      },
    },
  };

  writeFixture(dir, {
    ".claude-plugin/marketplace.json": marketplace,
    [`plugins/${pluginName}/.claude-plugin/plugin.json`]: pluginManifest,
    [`plugins/${pluginName}/.mcp.json`]: mcp,
  });
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("validate.mjs", () => {

  // -------------------------------------------------------------------------
  // T1: Happy path
  // -------------------------------------------------------------------------
  it("T1 – happy path: well-formed catalog exits 0 and prints success", () => {
    const dir = makeTempDir();
    try {
      validMarketplace(dir);
      const { status, stdout } = runValidate(dir);
      assert.equal(status, 0, "expected exit 0 for valid catalog");
      assert.match(stdout, /valid/, "expected success message on stdout");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T2: Invalid JSON in marketplace.json
  // -------------------------------------------------------------------------
  it("T2 – invalid JSON in marketplace.json exits 1 with JSON error", () => {
    const dir = makeTempDir();
    try {
      writeFixture(dir, {
        ".claude-plugin/marketplace.json": "{ this is not valid json }",
      });
      const { status, stderr } = runValidate(dir);
      assert.equal(status, 1, "expected exit 1 for invalid JSON");
      assert.match(
        stderr,
        /invalid JSON/i,
        "expected 'invalid JSON' in stderr"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T3: marketplace entry name != plugin.json name
  // -------------------------------------------------------------------------
  it("T3 – marketplace name != plugin.json name exits 1", () => {
    const dir = makeTempDir();
    try {
      // marketplace says "test-plugin" but plugin.json says "wrong-name"
      validMarketplace(dir, {
        pluginManifestOverride: { name: "wrong-name", version: "1.0.0" },
      });
      const { status, stderr } = runValidate(dir);
      assert.equal(status, 1, "expected exit 1 for name mismatch");
      // validate.mjs: `plugin.json name "${manifest.name}" != marketplace entry name`
      assert.match(
        stderr,
        /plugin\.json name/,
        "expected name mismatch message in stderr"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T4: plugin.json missing `version`
  // -------------------------------------------------------------------------
  it("T4 – plugin.json missing version exits 1", () => {
    const dir = makeTempDir();
    try {
      validMarketplace(dir, {
        pluginManifestOverride: { name: "test-plugin" }, // no version
        mcpOverride: {
          mcpServers: {
            "test-server": {
              command: "npx",
              args: ["-y", "@scope/test-plugin@1.0.0"],
            },
          },
        },
      });
      const { status, stderr } = runValidate(dir);
      assert.equal(status, 1, "expected exit 1 for missing version");
      // validate.mjs: `plugin.json has no "version"`
      assert.match(
        stderr,
        /no "version"/,
        "expected missing version message in stderr"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T5a: .mcp.json env contains a hardcoded secret
  // -------------------------------------------------------------------------
  it("T5a – hardcoded secret in .mcp.json env exits 1", () => {
    const dir = makeTempDir();
    try {
      validMarketplace(dir, {
        mcpOverride: {
          mcpServers: {
            "test-server": {
              command: "npx",
              args: ["-y", "@scope/test-plugin@1.0.0"],
              env: {
                // ghp_ token is a GitHub personal access token — detected as secret
                GH_TOKEN: "ghp_AABBCCDD1122334455667788990011",
              },
            },
          },
        },
      });
      const { status, stderr } = runValidate(dir);
      assert.equal(status, 1, "expected exit 1 for hardcoded secret");
      assert.match(
        stderr,
        /hardcoded secret/,
        "expected 'hardcoded secret' in stderr"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T5b: ${VAR} reference does NOT trigger secret detection (no false positive)
  // -------------------------------------------------------------------------
  it("T5b – ${VAR} env reference does not trigger secret detection (exit 0)", () => {
    const dir = makeTempDir();
    try {
      validMarketplace(dir, {
        mcpOverride: {
          mcpServers: {
            "test-server": {
              command: "npx",
              args: ["-y", "@scope/test-plugin@1.0.0"],
              env: {
                GH_TOKEN: "${GITHUB_TOKEN}",
              },
            },
          },
        },
      });
      const { status, stdout } = runValidate(dir);
      assert.equal(status, 0, "expected exit 0 — ${VAR} should not be flagged as a secret");
      assert.match(stdout, /valid/, "expected success message");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T6: Unpinned / @latest npm spec — PENDING E1 INTEGRATION
  //
  // validate.mjs does not yet enforce exact version pins on npx args.
  // This test asserts the INTENDED behavior: an @latest spec should exit 1
  // with a message about exact pinning.
  // Expected to FAIL until the E1 pin-enforcement change lands.
  // -------------------------------------------------------------------------
  it("T6 – unpinned @latest npx spec exits 1 (pending E1 integration)", () => {
    const dir = makeTempDir();
    try {
      validMarketplace(dir, {
        mcpOverride: {
          mcpServers: {
            "test-server": {
              command: "npx",
              args: ["-y", "@scope/test-plugin@latest"],
            },
          },
        },
      });
      const { status, stderr } = runValidate(dir);
      assert.equal(status, 1, "expected exit 1 for unpinned @latest spec");
      // Match on stable substring once the check lands
      const hasPinMessage =
        /exact version/i.test(stderr) || /pinned/i.test(stderr);
      assert.ok(
        hasPinMessage,
        `expected a pin-related message in stderr; got: ${stderr}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // T7: Orphan plugin directory — PENDING E7 INTEGRATION
  //
  // validate.mjs does not yet scan plugins/ for directories not listed in
  // marketplace.json. This test asserts the INTENDED behavior.
  // Expected to FAIL until the E7 orphan-detection change lands.
  // -------------------------------------------------------------------------
  it("T7 – orphan plugin not in marketplace.json exits 1 (pending E7 integration)", () => {
    const dir = makeTempDir();
    try {
      // Write a valid single-plugin catalog
      validMarketplace(dir);
      // Also drop an extra plugin directory that is NOT registered
      writeFixture(dir, {
        "plugins/orphan-plugin/.claude-plugin/plugin.json": {
          name: "orphan-plugin",
          version: "1.0.0",
        },
      });
      const { status, stderr } = runValidate(dir);
      assert.equal(status, 1, "expected exit 1 for orphan plugin");
      assert.match(
        stderr,
        /not registered/i,
        "expected 'not registered' in stderr for orphan plugin"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
