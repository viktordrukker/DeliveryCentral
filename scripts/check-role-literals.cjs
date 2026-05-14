#!/usr/bin/env node

// F-5.1 / D-130 step 1 — Role-literal ratchet.
//
// Every `@RequireRoles(...)` call with two or more literal-string role
// arguments is a drift risk: if the same set is repeated across N
// controllers and one site adds/removes a role, the others go stale.
//
// Rules:
//   - `@RequireRoles('admin')` — single literal, OK (no drift surface).
//   - `@RequireRoles('admin', 'director')` — 2+ literals, **violation**.
//   - `@RequireRoles(...EXEC_ROLES)` — spread of identifier, OK.
//   - `@RequireRoles(...EXEC_ROLES, 'employee')` — mixed spread + literal, OK
//     (treats as a documented extension to a named preset).
//
// Baseline: `scripts/role-literals-baseline.json`. The baseline carries
// the current count of legacy multi-literal sites. New violations beyond
// the baseline FAIL. Drops below the baseline auto-update on green
// runs (matching the design-tokens ratchet pattern).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(REPO_ROOT, 'scripts/role-literals-baseline.json');

function listControllerFiles() {
  const out = execSync('find src -type f -name "*.controller.ts"', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return out.split('\n').filter(Boolean);
}

const REQUIRE_ROLES_CALL_RE = /@RequireRoles\s*\(([^)]*)\)/g;

function parseArgs(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function classifyArgs(args) {
  let literals = 0;
  let spreads = 0;
  for (const a of args) {
    if (a.startsWith('...')) spreads++;
    else if (/^['"]/.test(a)) literals++;
  }
  return { literals, spreads };
}

function checkFile(filePath) {
  const violations = [];
  const text = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    REQUIRE_ROLES_CALL_RE.lastIndex = 0;
    const m = REQUIRE_ROLES_CALL_RE.exec(lines[i]);
    if (!m) continue;
    const args = parseArgs(m[1]);
    const { literals, spreads } = classifyArgs(args);
    if (literals >= 2 && spreads === 0) {
      violations.push({ file: filePath, line: i + 1, snippet: lines[i].trim() });
    }
  }
  return violations;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return { count: 0, recordedAt: null, sites: [] };
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(violations) {
  const out = {
    count: violations.length,
    recordedAt: new Date().toISOString(),
    sites: violations.map((v) => `${v.file}:${v.line}`),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + '\n');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const files = listControllerFiles();
  let all = [];
  for (const f of files) all = all.concat(checkFile(f));

  if (args.has('--update-baseline')) {
    writeBaseline(all);
    console.log(`Baseline updated: ${all.length} multi-literal sites recorded.`);
    return;
  }

  const baseline = readBaseline();
  if (all.length > baseline.count) {
    console.error(
      `Role-literal ratchet violation: ${all.length} multi-literal @RequireRoles sites (baseline allows ${baseline.count}).`,
    );
    console.error('Use a preset from src/shared/auth/role-presets.ts instead.');
    const baselineSet = new Set(baseline.sites);
    const newOnes = all.filter((v) => !baselineSet.has(`${v.file}:${v.line}`));
    for (const v of newOnes) console.error(`  ${v.file}:${v.line}  ${v.snippet}`);
    process.exit(1);
  }
  if (all.length < baseline.count) {
    writeBaseline(all);
    console.log(
      `Role-literal ratchet improved: ${all.length} sites (was ${baseline.count}). Baseline auto-updated.`,
    );
    return;
  }
  console.log(
    `OK — ${all.length} multi-literal @RequireRoles site(s); matches baseline.`,
  );
}

main();
