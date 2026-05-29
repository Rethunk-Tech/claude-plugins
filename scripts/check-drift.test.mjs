#!/usr/bin/env node
/**
 * Tests for the pure helpers exported by scripts/check-drift.mjs.
 *
 * Uses ONLY Node built-ins: node:test, node:assert, node:fs, node:os, node:path,
 * node:child_process. Zero third-party dependencies.
 *
 * No network calls, no mutation of real repo files — all tests operate on
 * in-memory strings or isolated temp fixtures under os.tmpdir().
 *
 * Run:  node --test scripts/check-drift.test.mjs
 *   or: node --test   (from repo root, picks up all *.test.mjs)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  rewriteMcpPin,
  rewritePluginVersion,
  patchChangelog,
  makeBullet,
} from "./check-drift.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHECK_DRIFT_MJS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "check-drift.mjs"
);

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "drift-test-"));
}

// ---------------------------------------------------------------------------
// rewriteMcpPin
// ---------------------------------------------------------------------------

describe("rewriteMcpPin", () => {
  it("replaces pkg@OLD with pkg@NEW in .mcp.json content", () => {
    const original = JSON.stringify(
      {
        mcpServers: {
          "rethunk-git": {
            command: "npx",
            args: ["-y", "@rethunk/mcp-multi-root-git@2.5.0"],
          },
        },
      },
      null,
      2
    );

    const result = rewriteMcpPin(
      original,
      "@rethunk/mcp-multi-root-git",
      "2.5.0",
      "2.6.0"
    );

    // New pin is present
    assert.ok(
      result.includes("@rethunk/mcp-multi-root-git@2.6.0"),
      "new pin should be present"
    );
    // Old pin is gone
    assert.ok(
      !result.includes("@rethunk/mcp-multi-root-git@2.5.0"),
      "old pin should be absent"
    );
    // JSON structure is still valid and intact
    const parsed = JSON.parse(result);
    assert.ok(parsed.mcpServers?.["rethunk-git"], "mcpServers structure preserved");
    assert.equal(
      parsed.mcpServers["rethunk-git"].command,
      "npx",
      "command field preserved"
    );
    assert.deepEqual(
      parsed.mcpServers["rethunk-git"].args,
      ["-y", "@rethunk/mcp-multi-root-git@2.6.0"],
      "args updated correctly"
    );
  });

  it("only replaces the first exact match — does not corrupt other packages", () => {
    const original = JSON.stringify(
      {
        mcpServers: {
          "server-a": {
            command: "npx",
            args: ["-y", "@rethunk/pkg-a@1.0.0"],
          },
          "server-b": {
            command: "npx",
            args: ["-y", "@rethunk/pkg-b@1.0.0"],
          },
        },
      },
      null,
      2
    );

    const result = rewriteMcpPin(original, "@rethunk/pkg-a", "1.0.0", "2.0.0");

    const parsed = JSON.parse(result);
    // pkg-a bumped
    assert.ok(
      parsed.mcpServers["server-a"].args.includes("@rethunk/pkg-a@2.0.0"),
      "pkg-a updated"
    );
    // pkg-b unchanged
    assert.ok(
      parsed.mcpServers["server-b"].args.includes("@rethunk/pkg-b@1.0.0"),
      "pkg-b untouched"
    );
  });
});

// ---------------------------------------------------------------------------
// rewritePluginVersion
// ---------------------------------------------------------------------------

describe("rewritePluginVersion", () => {
  it("replaces version field value from OLD to NEW", () => {
    const original = JSON.stringify(
      {
        name: "rethunk-git",
        version: "2.5.0",
        description: "A plugin",
      },
      null,
      2
    );

    const result = rewritePluginVersion(original, "2.5.0", "2.6.0");

    const parsed = JSON.parse(result);
    assert.equal(parsed.version, "2.6.0", "version should be updated to latest");
    assert.equal(parsed.name, "rethunk-git", "name preserved");
    assert.equal(parsed.description, "A plugin", "description preserved");
  });

  it("does not modify the content if pinned version is not found", () => {
    const original = JSON.stringify({ name: "foo", version: "3.0.0" }, null, 2);
    const result = rewritePluginVersion(original, "1.0.0", "2.0.0");
    // No match: content is unchanged
    assert.equal(result, original, "content unchanged when pinned not found");
  });
});

// ---------------------------------------------------------------------------
// patchChangelog
// ---------------------------------------------------------------------------

describe("patchChangelog", () => {
  // Shared dated-release anchor used across cases to verify it is untouched.
  const DATED_SECTION = `## [1.2.0] — 2026-05-22

### Fixed

- Some important fix.
- Another fix.`;

  // Case A: [Unreleased] with NO ### Changed — creates ### Changed
  it("case A: creates ### Changed under [Unreleased] when none exists", () => {
    const content = `# Changelog

## [Unreleased]

### Added

- Something new.

${DATED_SECTION}
`;
    const bullets = ["**`rethunk-git`** bumped to `2.6.0` (`@rethunk/mcp-multi-root-git@2.6.0`)."];
    const result = patchChangelog(content, bullets);

    // ### Changed section created
    assert.ok(result.includes("### Changed"), "### Changed header added");
    assert.ok(
      result.includes("- **`rethunk-git`** bumped to `2.6.0`"),
      "bullet present"
    );
    // ### Added still there
    assert.ok(result.includes("### Added"), "### Added preserved");
    // Dated section untouched
    assert.ok(result.includes(DATED_SECTION), "dated release section untouched");
  });

  // Case B: [Unreleased] WITH existing ### Changed — appends without duplicating header
  it("case B: appends bullet to existing ### Changed under [Unreleased]", () => {
    const content = `# Changelog

## [Unreleased]

### Changed

- Existing change.

${DATED_SECTION}
`;
    const bullets = ["**`citadel-sdd`** bumped to `0.6.0` (`@rethunk/citadel-sdd@0.6.0`)."];
    const result = patchChangelog(content, bullets);

    // Existing bullet still there
    assert.ok(result.includes("- Existing change."), "existing bullet preserved");
    // New bullet appended
    assert.ok(
      result.includes("- **`citadel-sdd`** bumped to `0.6.0`"),
      "new bullet appended"
    );
    // Header appears exactly once
    const headerCount = (result.match(/### Changed/g) ?? []).length;
    assert.equal(headerCount, 1, "### Changed header not duplicated");
    // Dated section untouched
    assert.ok(result.includes(DATED_SECTION), "dated release section untouched");
  });

  // Case C: dated release sections below [Unreleased] are left untouched
  it("case C: dated release body is byte-for-byte unchanged after patch", () => {
    const content = `# Changelog

## [Unreleased]

${DATED_SECTION}
`;
    const bullets = ["**`rethunk-github`** bumped to `1.2.0` (`@rethunk/github-mcp@1.2.0`)."];
    const result = patchChangelog(content, bullets);

    // The entire dated section string is still present verbatim
    assert.ok(result.includes(DATED_SECTION), "dated section content unchanged");

    // Extract dated section from result and compare to original
    const idx = result.indexOf("## [1.2.0]");
    assert.ok(idx !== -1, "dated heading still findable");
    const extractedDated = result.slice(idx, idx + DATED_SECTION.length);
    assert.equal(extractedDated, DATED_SECTION, "dated section bytes identical");
  });

  // Edge: no [Unreleased] block — content returned unchanged
  it("returns content unchanged when no [Unreleased] block present", () => {
    const content = `# Changelog\n\n${DATED_SECTION}\n`;
    const result = patchChangelog(content, ["some bullet"]);
    assert.equal(result, content, "no mutation when [Unreleased] absent");
  });
});

// ---------------------------------------------------------------------------
// makeBullet
// ---------------------------------------------------------------------------

describe("makeBullet", () => {
  it("returns the expected backtick-formatted bullet string", () => {
    const result = makeBullet("rethunk-git", "@rethunk/mcp-multi-root-git", "2.6.0");
    assert.equal(
      result,
      "**`rethunk-git`** bumped to `2.6.0` (`@rethunk/mcp-multi-root-git@2.6.0`).",
      "bullet format matches expected pattern"
    );
  });

  it("correctly formats different plugin/package/version combinations", () => {
    const result = makeBullet("citadel-sdd", "@rethunk/citadel-sdd", "0.7.0");
    assert.equal(
      result,
      "**`citadel-sdd`** bumped to `0.7.0` (`@rethunk/citadel-sdd@0.7.0`).",
    );
  });
});

// ---------------------------------------------------------------------------
// Subprocess test: npm-view failure exits non-zero
// ---------------------------------------------------------------------------
//
// Builds a minimal temp fixture (plugins/ + one .mcp.json) and injects a
// fake `npm` on PATH that always exits 1. Asserts check-drift.mjs exits
// non-zero and reports the failure — proving npm view errors are surfaced
// rather than masking as "all pins current".

describe("subprocess: npm view failure surfaces as non-zero exit", () => {
  it("exits 1 and reports npm view failure when npm is stubbed to fail", () => {
    const dir = makeTempDir();
    const fakeBinDir = join(dir, "fakebin");
    try {
      // Build minimal fixture: one plugin with a pinned .mcp.json
      const pluginDir = join(dir, "plugins", "test-plugin");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, ".mcp.json"),
        JSON.stringify({
          mcpServers: {
            "test-server": {
              command: "npx",
              args: ["-y", "@scope/test-plugin@1.0.0"],
            },
          },
        }),
        "utf8"
      );

      // Create a fake `npm` executable that always exits 1
      mkdirSync(fakeBinDir, { recursive: true });
      const fakeNpm = join(fakeBinDir, "npm");
      writeFileSync(fakeNpm, "#!/bin/sh\nexit 1\n", "utf8");
      chmodSync(fakeNpm, 0o755);

      // Prepend fakeBinDir to PATH so our stub wins
      const env = {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH}`,
      };

      const result = spawnSync(process.execPath, [CHECK_DRIFT_MJS], {
        cwd: dir,
        env,
        encoding: "utf8",
      });

      // Must exit non-zero
      assert.notEqual(
        result.status,
        0,
        `expected non-zero exit; got ${result.status}. stdout: ${result.stdout}, stderr: ${result.stderr}`
      );

      // Must report the failure on stdout or stderr
      const combined = (result.stdout ?? "") + (result.stderr ?? "");
      const mentionsFailure =
        /npm view failed/i.test(combined) ||
        /could not be checked/i.test(combined) ||
        /error/i.test(combined);
      assert.ok(
        mentionsFailure,
        `expected failure message in output; combined output: ${combined}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// check-drift --apply integration
// ---------------------------------------------------------------------------
//
// Builds an isolated temp mini-marketplace fixture, injects a stub `npm` on
// PATH, runs `node check-drift.mjs --apply`, and asserts the full lockstep
// mutation (or non-mutation) in the fixture files. The real repo manifests are
// never touched — all IO is confined to os.tmpdir().

describe("check-drift --apply integration", () => {
  // Shared fixture strings for the dated-release section we must NOT mutate.
  const DATED_SECTION_HEADER = "## [0.9.0] — 2026-01-01";
  const DATED_SECTION_BULLET = "- Initial public release.";
  const DATED_SECTION = `${DATED_SECTION_HEADER}\n\n### Added\n\n${DATED_SECTION_BULLET}`;

  /** Build the temp fixture tree and return a tear-down function. */
  function buildFixture(pinnedVersion) {
    const dir = mkdtempSync(join(tmpdir(), "drift-apply-test-"));
    const fakeBinDir = join(dir, "fakebin");

    // .claude-plugin/marketplace.json
    const marketplaceDir = join(dir, ".claude-plugin");
    mkdirSync(marketplaceDir, { recursive: true });
    writeFileSync(
      join(marketplaceDir, "marketplace.json"),
      JSON.stringify(
        {
          name: "test-marketplace",
          owner: { name: "test" },
          plugins: [{ name: "foo", source: "./plugins/foo" }],
        },
        null,
        2
      ),
      "utf8"
    );

    // plugins/foo/.mcp.json — pin the given version
    const pluginDir = join(dir, "plugins", "foo");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, ".mcp.json"),
      JSON.stringify(
        {
          mcpServers: {
            foo: {
              command: "npx",
              args: ["-y", `@scope/foo@${pinnedVersion}`],
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    // plugins/foo/.claude-plugin/plugin.json — must be pretty-printed so
    // rewritePluginVersion's literal '"version": "..."' replace can match.
    const pluginMetaDir = join(pluginDir, ".claude-plugin");
    mkdirSync(pluginMetaDir, { recursive: true });
    writeFileSync(
      join(pluginMetaDir, "plugin.json"),
      JSON.stringify({ name: "foo", version: pinnedVersion }, null, 2),
      "utf8"
    );

    // CHANGELOG.md — has \n## [Unreleased] so patchChangelog can find it.
    const changelog = `# Changelog\n\n## [Unreleased]\n\n${DATED_SECTION}\n`;
    writeFileSync(join(dir, "CHANGELOG.md"), changelog, "utf8");

    return { dir, fakeBinDir };
  }

  /** Inject a stub npm that echoes the given version string on stdout. */
  function buildStubNpm(fakeBinDir, version) {
    mkdirSync(fakeBinDir, { recursive: true });
    const fakeNpm = join(fakeBinDir, "npm");
    writeFileSync(fakeNpm, `#!/bin/sh\necho ${version}\n`, "utf8");
    chmodSync(fakeNpm, 0o755);
  }

  // ─── Case 1: drifted pin → expect full lockstep mutation ─────────────────

  it("drifted pin: rewrites .mcp.json, plugin.json, and CHANGELOG in lockstep", () => {
    const pinnedVersion = "1.0.0";
    const latestVersion = "1.1.0";
    const { dir, fakeBinDir } = buildFixture(pinnedVersion);

    try {
      buildStubNpm(fakeBinDir, latestVersion);

      const env = {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH}`,
        GITHUB_OUTPUT: "", // neutralise CI env if present
      };

      const result = spawnSync(process.execPath, [CHECK_DRIFT_MJS, "--apply"], {
        cwd: dir,
        env,
        encoding: "utf8",
      });

      // Should exit 0
      assert.equal(
        result.status,
        0,
        `expected exit 0; got ${result.status}. stdout: ${result.stdout}\nstderr: ${result.stderr}`
      );

      // --- .mcp.json assertions ---
      const mcpRaw = readFileSync(join(dir, "plugins", "foo", ".mcp.json"), "utf8");
      const mcpParsed = JSON.parse(mcpRaw);
      assert.ok(
        mcpRaw.includes(`@scope/foo@${latestVersion}`),
        `expected @scope/foo@${latestVersion} in .mcp.json`
      );
      assert.ok(
        !mcpRaw.includes(`@scope/foo@${pinnedVersion}`),
        `expected old pin @scope/foo@${pinnedVersion} to be absent from .mcp.json`
      );
      assert.deepEqual(
        mcpParsed.mcpServers?.foo?.args,
        ["-y", `@scope/foo@${latestVersion}`],
        ".mcp.json args reflect new pin and JSON is still valid"
      );

      // --- plugin.json assertions ---
      const pluginRaw = readFileSync(
        join(dir, "plugins", "foo", ".claude-plugin", "plugin.json"),
        "utf8"
      );
      const pluginParsed = JSON.parse(pluginRaw);
      assert.equal(
        pluginParsed.version,
        latestVersion,
        `plugin.json version should be ${latestVersion}`
      );

      // --- CHANGELOG.md assertions ---
      const changelog = readFileSync(join(dir, "CHANGELOG.md"), "utf8");

      // ### Changed header added under [Unreleased]
      assert.ok(changelog.includes("### Changed"), "### Changed header present in CHANGELOG");

      // Bullet mentions foo and the new version
      assert.ok(
        changelog.includes(`foo`) && changelog.includes(latestVersion),
        `CHANGELOG bullet should mention foo and ${latestVersion}`
      );
      assert.ok(
        changelog.includes(`@scope/foo@${latestVersion}`),
        `CHANGELOG bullet should contain @scope/foo@${latestVersion}`
      );

      // Dated section is byte-for-byte unchanged
      assert.ok(
        changelog.includes(DATED_SECTION),
        "dated ## [0.9.0] section should be verbatim unchanged in CHANGELOG"
      );
      assert.ok(
        changelog.includes(DATED_SECTION_BULLET),
        "dated section bullet should be present and unchanged"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ─── Case 2: pin already current → expect no mutation ────────────────────

  it("current pin: exits 0, prints nothing-to-apply, leaves files unchanged", () => {
    const version = "1.0.0";
    const { dir, fakeBinDir } = buildFixture(version);

    try {
      // Stub npm returns the SAME version as pinned
      buildStubNpm(fakeBinDir, version);

      const env = {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH}`,
        GITHUB_OUTPUT: "",
      };

      // Capture original file contents before running
      const mcpBefore = readFileSync(join(dir, "plugins", "foo", ".mcp.json"), "utf8");
      const pluginBefore = readFileSync(
        join(dir, "plugins", "foo", ".claude-plugin", "plugin.json"),
        "utf8"
      );
      const changelogBefore = readFileSync(join(dir, "CHANGELOG.md"), "utf8");

      const result = spawnSync(process.execPath, [CHECK_DRIFT_MJS, "--apply"], {
        cwd: dir,
        env,
        encoding: "utf8",
      });

      // Should exit 0
      assert.equal(
        result.status,
        0,
        `expected exit 0; got ${result.status}. stdout: ${result.stdout}\nstderr: ${result.stderr}`
      );

      // Output should indicate nothing to apply
      const combined = (result.stdout ?? "") + (result.stderr ?? "");
      assert.ok(
        /nothing to apply/i.test(combined) || /all reachable pins are current/i.test(combined),
        `expected "nothing to apply" message; combined output: ${combined}`
      );

      // All three fixture files must be byte-for-byte unchanged
      const mcpAfter = readFileSync(join(dir, "plugins", "foo", ".mcp.json"), "utf8");
      assert.equal(mcpAfter, mcpBefore, ".mcp.json must be unchanged when pin is current");

      const pluginAfter = readFileSync(
        join(dir, "plugins", "foo", ".claude-plugin", "plugin.json"),
        "utf8"
      );
      assert.equal(pluginAfter, pluginBefore, "plugin.json must be unchanged when pin is current");

      const changelogAfter = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
      assert.equal(changelogAfter, changelogBefore, "CHANGELOG.md must be unchanged when pin is current");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
