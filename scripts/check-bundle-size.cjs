#!/usr/bin/env node

/**
 * Bundle size gate (BUNDLE-SIZE-GATE).
 *
 * Measures total gzipped size of frontend/dist/assets/*.js after a Vite build
 * and fails CI if the delta vs the committed baseline exceeds the tolerance
 * (default 15%). Pairs with `scripts/bundle-size-baseline.json` and is
 * refreshed via `scripts/refresh-bundle-size-baseline.cjs` when an intentional
 * regression is approved.
 *
 * Why gzipped: HTTP transport size is what users actually pay for. Raw bytes
 * are reported alongside for diagnostics but are not gated.
 *
 * Usage:
 *   node scripts/check-bundle-size.cjs                          (check)
 *   node scripts/check-bundle-size.cjs --json                   (machine-readable)
 *   node scripts/refresh-bundle-size-baseline.cjs               (refresh baseline)
 *
 * Prereq: `npm --prefix frontend run build` must have produced frontend/dist.
 * CI reuses the dist already built by the Frontend quality job — see
 * .github/workflows/bundle-size-check.yml.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'frontend', 'dist', 'assets');
const baselineFile = path.join(__dirname, 'bundle-size-baseline.json');
const jsonOutput = process.argv.includes('--json');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function gzipSize(filePath) {
  const buf = fs.readFileSync(filePath);
  return zlib.gzipSync(buf, { level: 9 }).length;
}

function measure() {
  if (!fs.existsSync(assetsDir)) {
    fail(
      `frontend/dist/assets not found. Run \`npm --prefix frontend run build\` first.`,
    );
  }
  const files = fs
    .readdirSync(assetsDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(assetsDir, f));
  if (files.length === 0) {
    fail(`No .js files in ${assetsDir}.`);
  }
  let raw = 0;
  let gzip = 0;
  for (const f of files) {
    raw += fs.statSync(f).size;
    gzip += gzipSize(f);
  }
  return { fileCount: files.length, totalRawBytes: raw, totalGzipBytes: gzip };
}

function loadBaseline() {
  if (!fs.existsSync(baselineFile)) {
    fail(`Baseline missing: ${baselineFile}. Run scripts/refresh-bundle-size-baseline.cjs.`);
  }
  const raw = fs.readFileSync(baselineFile, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`Failed to parse ${baselineFile}: ${err.message}`);
  }
  if (typeof parsed.totalGzipBytes !== 'number' || parsed.totalGzipBytes <= 0) {
    fail(`Baseline ${baselineFile} missing valid totalGzipBytes.`);
  }
  if (typeof parsed.tolerancePercent !== 'number' || parsed.tolerancePercent <= 0) {
    fail(`Baseline ${baselineFile} missing valid tolerancePercent.`);
  }
  return parsed;
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(1);
}

function main() {
  const baseline = loadBaseline();
  const current = measure();
  const deltaBytes = current.totalGzipBytes - baseline.totalGzipBytes;
  const deltaPercent = (deltaBytes / baseline.totalGzipBytes) * 100;
  const overBudget = deltaPercent > baseline.tolerancePercent;

  if (jsonOutput) {
    process.stdout.write(
      `${JSON.stringify(
        {
          baseline: {
            totalGzipBytes: baseline.totalGzipBytes,
            tolerancePercent: baseline.tolerancePercent,
            lastUpdated: baseline.lastUpdated,
          },
          current: {
            ...current,
            deltaBytes,
            deltaPercent: Number(deltaPercent.toFixed(2)),
          },
          status: overBudget ? 'fail' : 'pass',
        },
        null,
        2,
      )}\n`,
    );
  } else {
    process.stdout.write('Bundle size gate\n');
    process.stdout.write(`  files          : ${current.fileCount}\n`);
    process.stdout.write(
      `  baseline gzip  : ${formatKb(baseline.totalGzipBytes)} kB (${baseline.lastUpdated})\n`,
    );
    process.stdout.write(`  current gzip   : ${formatKb(current.totalGzipBytes)} kB\n`);
    process.stdout.write(`  raw bytes      : ${formatKb(current.totalRawBytes)} kB\n`);
    process.stdout.write(
      `  delta          : ${deltaBytes >= 0 ? '+' : ''}${formatKb(deltaBytes)} kB (${deltaPercent.toFixed(2)}%)\n`,
    );
    process.stdout.write(`  tolerance      : +${baseline.tolerancePercent}%\n`);
    process.stdout.write(`  status         : ${overBudget ? 'FAIL' : 'OK'}\n`);
  }

  if (overBudget) {
    process.stderr.write(
      `\nBundle size grew by ${deltaPercent.toFixed(2)}%, over the +${baseline.tolerancePercent}% tolerance.\n` +
        `If this is intentional, refresh the baseline:\n` +
        `  node scripts/refresh-bundle-size-baseline.cjs\n`,
    );
    process.exit(1);
  }
}

main();
