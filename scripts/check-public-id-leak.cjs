#!/usr/bin/env node

/**
 * controller-uuid-leak lint (DM-2.5-7).
 *
 * Static check for response-DTO classes that expose `id: string` without a
 * matching `publicId: string`. Pairs with the runtime `PublicIdSerializerInterceptor`
 * (DM-2.5-5) which catches any leak the lint misses. Together they enforce
 * DMD-026 — "UUIDs never leave the API boundary".
 *
 * What the lint flags:
 *   A class in src/** whose file matches *.dto.ts, *.response.ts, or
 *   *.controller.ts, AND whose name is *NOT* an action/request DTO
 *   (see REQUEST_PREFIXES), AND that declares `id: string` (or id!:/id?: etc.)
 *   but does NOT declare `publicId: string`.
 *
 * Signature format: `<rel-file>|<class-name>|controller-uuid-leak`.
 *
 * Usage:
 *   node scripts/check-public-id-leak.cjs                (lint)
 *   node scripts/check-public-id-leak.cjs --write-baseline (regenerate baseline)
 */

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const baselineFile = path.join(__dirname, 'public-id-leak-baseline.json');
const shouldWriteBaseline = process.argv.includes('--write-baseline');

const INCLUDE_FILE_PATTERNS = [
  /\.dto\.ts$/,
  /\.response\.ts$/,
  /\.controller\.ts$/,
];

const REQUEST_PREFIXES = [
  'Create', 'Update', 'Patch', 'Upsert', 'Delete', 'Remove', 'Cancel',
  'Approve', 'Reject', 'Submit', 'Activate', 'Deactivate', 'Archive',
  'Bulk', 'Filter', 'Search', 'Query', 'Set', 'Add', 'Assign', 'Override',
  'Finalize', 'Complete', 'Reassign', 'Terminate', 'Revoke', 'End',
  'Mark', 'Nudge', 'Undo', 'Grant', 'Revoke', 'Pin', 'Unpin', 'Acknowledge',
  'Request', 'Respond', 'Reset', 'Verify', 'Enable', 'Disable', 'Login',
  'Logout', 'Refresh', 'Register', 'Hire', 'Rehire', 'Import', 'Export',
  'Close', 'Reopen', 'Plan', 'Promote', 'Demote',
];

const EXPLICIT_OPT_OUTS = new Set([
  // Files/classes that legitimately carry non-publicId identifiers we want the
  // lint to ignore. Add entries with a one-line justification comment above.
]);

const ID_DECL = /^\s*(?:public\s+|private\s+|protected\s+)?(?:readonly\s+)?id[?!]?\s*:\s*string\b/m;
const PUBLIC_ID_DECL = /^\s*(?:public\s+|private\s+|protected\s+)?(?:readonly\s+)?publicId[?!]?\s*:\s*string\b/m;
const CLASS_HEADER = /^\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Z]\w*)/;

function shouldScan(filePath) {
  return INCLUDE_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, dist, etc. — they should not be under src, but just in case
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__generated__') continue;
      out.push(...listFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!shouldScan(full)) continue;
    out.push(full);
  }
  return out;
}

function isRequestDtoName(name) {
  return REQUEST_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Naive but effective: find classes via header regex, then scan the source
 * between each header and the next top-level class (or EOF) for `id:` and
 * `publicId:` property declarations. We do not attempt full brace tracking
 * because (a) it is fragile against string literals containing braces, and
 * (b) properties appearing after a class closes in the same file would only
 * cause false-negatives (not false-positives) on the next class, which the
 * baseline handles.
 */
function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n');
  const classHeaders = [];
  lines.forEach((line, idx) => {
    const match = CLASS_HEADER.exec(line);
    if (match) {
      classHeaders.push({ name: match[1], lineIndex: idx });
    }
  });
  if (classHeaders.length === 0) return [];

  const violations = [];
  for (let i = 0; i < classHeaders.length; i++) {
    const { name, lineIndex } = classHeaders[i];
    if (isRequestDtoName(name)) continue;
    if (EXPLICIT_OPT_OUTS.has(name)) continue;
    const endLine = i + 1 < classHeaders.length ? classHeaders[i + 1].lineIndex : lines.length;
    const slice = lines.slice(lineIndex, endLine).join('\n');
    if (!ID_DECL.test(slice)) continue;
    if (PUBLIC_ID_DECL.test(slice)) continue;
    violations.push({
      file: path.relative(rootDir, filePath),
      className: name,
      lineNumber: lineIndex + 1,
    });
  }
  return violations;
}

function serializeViolation(v) {
  return `${v.file}|${v.className}|controller-uuid-leak`;
}

function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`src directory not found: ${srcDir}`);
    process.exit(2);
  }
  const files = listFiles(srcDir);
  const violations = files.flatMap(scanFile);
  const signatures = violations.map(serializeViolation).sort();

  if (shouldWriteBaseline) {
    fs.writeFileSync(baselineFile, `${JSON.stringify(signatures, null, 2)}\n`);
    console.log(`Wrote ${signatures.length} baseline public-id-leak exceptions to scripts/public-id-leak-baseline.json.`);
    process.exit(0);
  }

  const baseline = fs.existsSync(baselineFile)
    ? new Set(JSON.parse(fs.readFileSync(baselineFile, 'utf8')))
    : new Set();

  const current = new Set(signatures);
  const newViolations = violations.filter((v) => !baseline.has(serializeViolation(v)));
  const stale = [...baseline].filter((sig) => !current.has(sig));

  if (newViolations.length > 0) {
    console.error('controller-uuid-leak violations (new — not in baseline):');
    for (const v of newViolations) {
      console.error(`  - ${v.file}:${v.lineNumber} class ${v.className} exposes id: string without publicId: string`);
    }
    console.error('');
    console.error('Every user-facing DTO that carries an identifier must declare `publicId: string`.');
    console.error('If this violation is intentional, add the class name to EXPLICIT_OPT_OUTS with a justification,');
    console.error('then regenerate the baseline with:');
    console.error('  node scripts/check-public-id-leak.cjs --write-baseline');
    process.exit(1);
  }

  if (stale.length > 0) {
    console.log(`public-id-leak baseline has ${stale.length} stale entries (violation fixed — please rerun --write-baseline to shrink):`);
    for (const sig of stale) {
      console.log(`  - ${sig}`);
    }
  }

  console.log(`controller-uuid-leak guardrail passed (${violations.length} existing violations baselined).`);
}

main();
