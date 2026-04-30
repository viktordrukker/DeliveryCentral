#!/usr/bin/env node
/**
 * Phase DS-1-6 / DS-7 — Design-system conformance check with severity ratchet.
 *
 * Scans `frontend/src/components/**` and `frontend/src/routes/**` for
 * forbidden primitives that DS-1 has replacements for, with a ratcheting
 * baseline (same model as `scripts/design-token-baseline.json`).
 *
 * DS-7 ratchet model — each rule has a `severity`:
 *   - `'warning'` → baselined: existing offenders allowed; new ones fail.
 *   - `'error'`   → no baseline: ANY occurrence fails the build.
 *
 * The promotion path is: ship as warning + baseline → reduce baseline through
 * targeted sweeps → when baseline reaches zero, flip the rule to `'error'`
 * and the rule is locked. New violations of error-tier rules cannot be
 * baselined; they must be fixed before merging.
 *
 * Forbidden in scope:
 *   - <button …>                         (warning) → use <Button>
 *   - <Link className="button…">…</Link> (error)   → use <Button as={Link} …>
 *   - className="button…" / template     (warning) → use <Button>
 *   - <table …> in routes/components     (warning) → use <Table variant="compact"/>
 *   - window.confirm(                    (error)   → use <ConfirmDialog>
 *   - window.alert(                      (error)   → use sonner toast.*
 *
 * Allowed (excluded from scan):
 *   - frontend/src/components/ds/**        — the DS itself
 *   - frontend/src/components/common/ConfirmDialog.tsx — built on raw <button>
 *   - frontend/src/components/layout/**    — sidebar / topbar contain raw buttons
 *   - frontend/src/styles/**, frontend/src/app/main.tsx
 *
 * Usage:
 *   node scripts/check-ds-conformance.cjs                  # check; nonzero on regression
 *   node scripts/check-ds-conformance.cjs --write-baseline # regenerate baseline
 *   node scripts/check-ds-conformance.cjs --report         # show per-rule breakdown
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_ROOTS = [
  path.join(ROOT, 'frontend', 'src', 'routes'),
  path.join(ROOT, 'frontend', 'src', 'components'),
];
const BASELINE_FILE = path.join(__dirname, 'ds-conformance-baseline.json');

// Files/dirs the rule does not apply to.
const ALLOWED_FILES = new Set([
  path.join(ROOT, 'frontend', 'src', 'components', 'common', 'ConfirmDialog.tsx'),
  // SR-only table — accessibility primitive that intentionally renders raw <table>
  // for WCAG 1.3.1 chart equivalents; cannot use DS Table chrome.
  path.join(ROOT, 'frontend', 'src', 'components', 'charts', 'SrOnlyTable.tsx'),
]);
const ALLOWED_DIR_PREFIXES = [
  path.join(ROOT, 'frontend', 'src', 'components', 'ds'),
  path.join(ROOT, 'frontend', 'src', 'components', 'layout'),
];

const includeExtensions = new Set(['.tsx', '.ts']);

const RULES = [
  {
    id: 'no-raw-button',
    severity: 'error', // promoted 2026-04-28 — baseline reached zero
    pattern: /<button\b/g,
    message: 'Raw <button>. Use <Button> from @/components/ds.',
  },
  {
    id: 'no-button-className',
    severity: 'error', // promoted 2026-04-28 — baseline reached zero
    // Matches className="button"…, className={`button…`}, ternary like className={x ? 'button…' : 'button…'}.
    pattern: /className=\s*(?:"button\b[^"]*"|\{`button\b[^`]*`\}|\{[^}]*'button\b[^'}]*'[^}]*\})/g,
    message: 'className="button…" / template-literal — use <Button variant="…" size="…">.',
  },
  {
    id: 'no-link-button-className',
    severity: 'error', // promoted 2026-04-27 — baseline reached zero
    pattern: /<Link\b[^>]*className="button\b/g,
    message: '<Link className="button…"> — use <Button as={Link} variant="…">.',
  },
  {
    id: 'no-raw-table',
    severity: 'error', // promoted 2026-04-28 — baseline reached zero
    pattern: /<table\b/g,
    message: 'Raw <table>. Use <Table variant="compact" /> from @/components/ds (see ds-dash-compact-table-playbook.md).',
  },
  {
    id: 'no-window-confirm',
    severity: 'error', // promoted 2026-04-27 — baseline reached zero
    pattern: /\bwindow\.confirm\s*\(/g,
    message: 'window.confirm() — use <ConfirmDialog>.',
  },
  {
    id: 'no-window-alert',
    severity: 'error', // promoted 2026-04-27 — baseline reached zero
    pattern: /\bwindow\.alert\s*\(/g,
    message: 'window.alert() — use sonner toast.* or in-page <Alert>.',
  },
];

const args = process.argv.slice(2);
const writeBaseline = args.includes('--write-baseline');
const verbose = args.includes('--report') || writeBaseline;

const baseline = (() => {
  if (!fs.existsSync(BASELINE_FILE)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')));
})();

function isAllowed(file) {
  if (ALLOWED_FILES.has(file)) return true;
  for (const prefix of ALLOWED_DIR_PREFIXES) {
    if (file.startsWith(prefix + path.sep)) return true;
  }
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return true;
  if (file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) return true;
  if (file.endsWith('.stories.tsx') || file.endsWith('.stories.ts')) return true;
  return false;
}

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && includeExtensions.has(path.extname(entry.name))) acc.push(full);
  }
}

function violationKey(file, ruleId, line, lineText) {
  // Trim leading whitespace from line text so reformatting that only changes
  // indentation doesn't break the baseline.
  const trimmed = lineText.replace(/^\s+/, '');
  return `${path.relative(ROOT, file)}|${ruleId}|${line}|${trimmed}`;
}

const allFiles = [];
for (const root of SCAN_ROOTS) walk(root, allFiles);

const violations = [];
for (const file of allFiles) {
  if (isAllowed(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(content))) {
      // 1-based line number of the match
      const upto = content.slice(0, m.index);
      const line = upto.split('\n').length;
      const lineText = lines[line - 1] ?? '';
      violations.push({
        file,
        ruleId: rule.id,
        line,
        lineText,
        message: rule.message,
        key: violationKey(file, rule.id, line, lineText),
      });
    }
  }
}

// Severity-aware partitioning:
//   - Warning rules: use baseline; new violations fail.
//   - Error rules:   no baseline allowed; ANY violation fails.
const errorRuleIds = new Set(RULES.filter((r) => r.severity === 'error').map((r) => r.id));
const warningRuleIds = new Set(RULES.filter((r) => r.severity === 'warning').map((r) => r.id));

if (writeBaseline) {
  // Only warning-tier violations belong in the baseline. Error-tier rules
  // must be at zero — refuse to write a baseline that would smuggle them in.
  const errorViolations = violations.filter((v) => errorRuleIds.has(v.ruleId));
  if (errorViolations.length > 0) {
    console.error(`Cannot --write-baseline: ${errorViolations.length} violation(s) of error-tier rules.`);
    for (const v of errorViolations) {
      console.error(`  ${path.relative(ROOT, v.file)}:${v.line} [${v.ruleId}]`);
      console.error(`    ${v.lineText.trim()}`);
    }
    console.error('\nFix these first, or demote the rule to severity: "warning".');
    process.exit(1);
  }
  const keys = violations.filter((v) => warningRuleIds.has(v.ruleId)).map((v) => v.key).sort();
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(keys, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${keys.length} entries to ${path.relative(ROOT, BASELINE_FILE)}.`);
  process.exit(0);
}

const errorViolations = violations.filter((v) => errorRuleIds.has(v.ruleId));
const warningViolations = violations.filter((v) => warningRuleIds.has(v.ruleId));
const news = warningViolations.filter((v) => !baseline.has(v.key));
const stale = [...baseline].filter((b) => !warningViolations.some((v) => v.key === b));

// Per-rule breakdown for the report.
function buildBreakdown() {
  const rows = [];
  for (const rule of RULES) {
    const count = violations.filter((v) => v.ruleId === rule.id).length;
    const baselined = [...baseline].filter((b) => b.split('|')[1] === rule.id).length;
    const newCount = news.filter((v) => v.ruleId === rule.id).length;
    rows.push({ id: rule.id, severity: rule.severity, count, baselined, newCount });
  }
  return rows;
}

if (verbose) {
  console.log(`Total scanned files:    ${allFiles.length}`);
  console.log(`Violations seen:        ${violations.length}`);
  console.log(`Baseline entries:       ${baseline.size}`);
  console.log(`New (warning-tier):     ${news.length}`);
  console.log(`Error-tier occurrences: ${errorViolations.length}`);
  console.log(`Stale baseline entries: ${stale.length}`);

  console.log('\nPer-rule breakdown:');
  for (const r of buildBreakdown()) {
    const flag = r.severity === 'error' ? '🔒 ERROR' : '⚠️  warn';
    const ratchetReady = r.severity === 'warning' && r.count === 0 ? '  (ready to flip → error)' : '';
    console.log(`  ${flag}  ${r.id.padEnd(28)} total=${String(r.count).padStart(3)}  baseline=${String(r.baselined).padStart(3)}  new=${String(r.newCount).padStart(3)}${ratchetReady}`);
  }

  if (errorViolations.length) {
    console.log('\n🔒 ERROR-tier violations (rule has been promoted; baseline not allowed):');
    for (const v of errorViolations) {
      console.log(`  ${path.relative(ROOT, v.file)}:${v.line} [${v.ruleId}]`);
      console.log(`    ${v.lineText.trim()}`);
    }
  }
  if (news.length) {
    console.log('\n⚠️  NEW warning-tier violations (regression — fix or accept by rebaselining):');
    for (const v of news) {
      console.log(`  ${path.relative(ROOT, v.file)}:${v.line} [${v.ruleId}]`);
      console.log(`    ${v.lineText.trim()}`);
    }
  }
  if (stale.length) {
    console.log(`\nStale baseline entries (already fixed — re-run with --write-baseline to clean):`);
    for (const s of stale) console.log(`  ${s}`);
  }
}

if (errorViolations.length > 0 || news.length > 0) {
  if (!verbose) {
    if (errorViolations.length > 0) {
      console.error(`DS conformance check FAILED: ${errorViolations.length} error-tier violation(s).`);
    }
    if (news.length > 0) {
      console.error(`DS conformance check FAILED: ${news.length} new warning-tier violation(s).`);
    }
    console.error('Run `node scripts/check-ds-conformance.cjs --report` to see them.');
    console.error('To accept warning-tier additions, run with --write-baseline. Error-tier must be fixed.');
  }
  process.exit(1);
}

if (verbose) console.log('\nDS conformance: OK ✓');
process.exit(0);
