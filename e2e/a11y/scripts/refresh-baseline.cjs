#!/usr/bin/env node
/**
 * Refresh e2e/a11y/baseline.json by re-running the axe scan on every page +
 * atom and capturing the current fingerprints as the new accepted set.
 *
 * Usage:
 *   node e2e/a11y/scripts/refresh-baseline.cjs        # write new baseline
 *   node e2e/a11y/scripts/refresh-baseline.cjs --dry  # print the diff only
 *
 * Implementation note: we don't re-implement the scan here. Instead, we run
 * the existing Playwright spec with PLAYWRIGHT_A11Y_DUMP=1, which makes the
 * spec emit a JSONL stream of fingerprints to stdout. The script collects
 * those lines, diffs against the existing baseline, and rewrites the file.
 *
 * This keeps "what counts as a violation" in one place (the spec itself) and
 * avoids the two-implementations-drift trap.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const BASELINE_PATH = path.resolve(__dirname, '..', 'baseline.json');
const SPEC_PATH = 'e2e/a11y/axe-baseline.spec.ts';

const dryRun = process.argv.includes('--dry');

function readBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return { description: '', generatedAt: null, violations: [] };
  }
}

function writeBaseline(violations) {
  const baseline = {
    $schema: './baseline.schema.json',
    description:
      'Allowed axe-core violations on v2 pages and DS atoms. Each entry is a fingerprint of an accepted violation. Future PRs MUST NOT add new fingerprints unless explicitly approved via e2e/a11y/scripts/refresh-baseline.cjs. See e2e/README.md (V2 axe A11y Baseline) for the policy.',
    generatedAt: new Date().toISOString(),
    violations: violations.slice().sort(),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
}

function runSpec() {
  const result = spawnSync(
    'node',
    ['node_modules/playwright/cli.js', 'test', SPEC_PATH, '--reporter=line'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        PLAYWRIGHT_A11Y_DUMP: '1',
        // Don't fail the parent run just because new violations exist — we are
        // refreshing the baseline precisely to accept them.
        PLAYWRIGHT_A11Y_ACCEPT_ALL: '1',
      },
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'inherit'],
    },
  );
  return result.stdout || '';
}

function extractFingerprints(stdout) {
  const fingerprints = new Set();
  const re = /^A11Y_FP:(.+)$/gm;
  let match;
  while ((match = re.exec(stdout)) !== null) {
    fingerprints.add(match[1].trim());
  }
  return Array.from(fingerprints);
}

function main() {
  const previous = new Set((readBaseline().violations || []));
  const stdout = runSpec();
  const found = extractFingerprints(stdout);
  const foundSet = new Set(found);

  const added = found.filter((fp) => !previous.has(fp));
  const removed = Array.from(previous).filter((fp) => !foundSet.has(fp));

  console.log(`\n── axe baseline diff ────────────────────────────────`);
  console.log(`  current baseline : ${previous.size} fingerprints`);
  console.log(`  scan result      : ${foundSet.size} fingerprints`);
  console.log(`  + added          : ${added.length}`);
  console.log(`  - removed        : ${removed.length}`);
  if (added.length) {
    console.log(`\n  Added:`);
    for (const fp of added) console.log(`    + ${fp}`);
  }
  if (removed.length) {
    console.log(`\n  Removed:`);
    for (const fp of removed) console.log(`    - ${fp}`);
  }
  console.log(`────────────────────────────────────────────────────`);

  if (dryRun) {
    console.log(`\n[dry-run] baseline NOT written.`);
    return;
  }

  writeBaseline(found);
  console.log(`\nWrote ${BASELINE_PATH} (${found.length} fingerprints).`);
}

main();
