#!/usr/bin/env node

/**
 * Refresh the bundle-size baseline (BUNDLE-SIZE-GATE).
 *
 * Opt-in tool — does NOT run in CI. Use only when an intentional bundle
 * regression has been reviewed and approved (e.g., a redesign that adds
 * shipping weight on purpose). Analogous to:
 *   - scripts/refresh-baseline-schema.sh         (schema hash)
 *   - design-token-baseline.json --write-baseline (raw colors)
 *
 * Usage:
 *   1. npm --prefix frontend run build
 *   2. node scripts/refresh-bundle-size-baseline.cjs
 *   3. git add scripts/bundle-size-baseline.json && commit
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'frontend', 'dist', 'assets');
const baselineFile = path.join(__dirname, 'bundle-size-baseline.json');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  fail(`frontend/dist/assets not found. Run \`npm --prefix frontend run build\` first.`);
}

const files = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => path.join(assetsDir, f));

if (files.length === 0) {
  fail(`No .js files found in ${assetsDir}.`);
}

let totalRawBytes = 0;
let totalGzipBytes = 0;
for (const f of files) {
  totalRawBytes += fs.statSync(f).size;
  totalGzipBytes += zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length;
}

const previous = fs.existsSync(baselineFile)
  ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
  : {};

const next = {
  totalGzipBytes,
  totalRawBytes,
  lastUpdated: new Date().toISOString().slice(0, 10),
  tolerancePercent: typeof previous.tolerancePercent === 'number' ? previous.tolerancePercent : 15,
  notes:
    previous.notes ??
    'Pre-redesign baseline. Refresh with `node scripts/refresh-bundle-size-baseline.cjs` when an intentional bundle increase is approved.',
};

fs.writeFileSync(baselineFile, `${JSON.stringify(next, null, 2)}\n`);

const prevGzip = typeof previous.totalGzipBytes === 'number' ? previous.totalGzipBytes : 0;
const deltaBytes = totalGzipBytes - prevGzip;
const deltaPct = prevGzip > 0 ? (deltaBytes / prevGzip) * 100 : 0;

process.stdout.write(
  `Updated ${path.relative(rootDir, baselineFile)}\n` +
    `  files         : ${files.length}\n` +
    `  gzip bytes    : ${totalGzipBytes} (${(totalGzipBytes / 1024).toFixed(1)} kB)\n` +
    `  raw bytes     : ${totalRawBytes} (${(totalRawBytes / 1024).toFixed(1)} kB)\n` +
    `  previous gzip : ${prevGzip} (${(prevGzip / 1024).toFixed(1)} kB)\n` +
    `  delta         : ${deltaBytes >= 0 ? '+' : ''}${(deltaBytes / 1024).toFixed(1)} kB ` +
    `(${deltaPct.toFixed(2)}%)\n`,
);
