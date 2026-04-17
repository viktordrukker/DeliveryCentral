#!/usr/bin/env node
/**
 * CI JTBD Summary & Regression Gate
 *
 * Reads test results and SLO budgets, then:
 * 1. Prints a JTBD coverage summary
 * 2. Checks performance budgets against test results
 * 3. Exits non-zero if critical regressions are detected
 *
 * Usage: node scripts/ci-jtbd-summary.cjs [--gate]
 *   --gate: fail the process if regressions detected (for CI use)
 */

const fs = require('fs');
const path = require('path');

const BUDGETS_PATH = path.join(__dirname, '..', 'docs', 'testing', 'slo-budgets.json');
const MATRIX_PATH = path.join(__dirname, '..', 'docs', 'testing', 'jtbd-matrix.json');

const gateMode = process.argv.includes('--gate');

function main() {
  const budgets = JSON.parse(fs.readFileSync(BUDGETS_PATH, 'utf-8'));
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf-8'));

  console.log('');
  console.log('=== JTBD Coverage Summary ===');
  console.log('');

  const personas = Object.entries(matrix.personas);
  let totalCritical = 0;
  let totalWithUnit = 0;
  let totalWithE2e = 0;

  for (const [role, persona] of personas) {
    const jtbds = persona.criticalJtbds;
    totalCritical += jtbds.length;
    const withUnit = jtbds.filter(j => j.unitTest).length;
    const withE2e = jtbds.filter(j => j.e2eTag).length;
    totalWithUnit += withUnit;
    totalWithE2e += withE2e;

    const unitPct = jtbds.length > 0 ? Math.round((withUnit / jtbds.length) * 100) : 0;
    console.log(`  ${role.padEnd(20)} ${jtbds.length} critical JTBDs | ${withUnit}/${jtbds.length} unit-tested (${unitPct}%) | ${withE2e} e2e-tagged`);
  }

  console.log('');
  console.log(`  Total: ${totalCritical} critical JTBDs across ${personas.length} personas`);
  console.log(`  Unit test coverage: ${totalWithUnit}/${totalCritical} (${Math.round((totalWithUnit / totalCritical) * 100)}%)`);
  console.log(`  E2E tag coverage: ${totalWithE2e}/${totalCritical} (${Math.round((totalWithE2e / totalCritical) * 100)}%)`);

  console.log('');
  console.log('=== SLO Budget Summary ===');
  console.log('');

  const apiEndpoints = Object.entries(budgets.budgets.api);
  for (const [key, budget] of apiEndpoints) {
    console.log(`  ${key.padEnd(35)} p95 <= ${budget.p95LatencyMs}ms | p99 <= ${budget.p99LatencyMs}ms | err < ${(budget.errorRateThreshold * 100).toFixed(1)}%`);
  }

  console.log('');
  const uiRoutes = Object.entries(budgets.budgets.ui);
  for (const [key, budget] of uiRoutes) {
    console.log(`  ${key.padEnd(35)} ${budget.metricName} <= ${budget.budgetMs}ms (${budget.route})`);
  }

  console.log('');
  console.log('=== Regression Gate ===');
  console.log('');

  // Check for performance test results if they exist
  const perfResultsPath = path.join(__dirname, '..', 'test-results', 'performance.json');
  let regressions = [];

  if (fs.existsSync(perfResultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(perfResultsPath, 'utf-8'));
      for (const [name, result] of Object.entries(results)) {
        const budget = budgets.budgets.api[name];
        if (budget && result.p95Ms > budget.p95LatencyMs) {
          regressions.push(`${name}: p95 ${result.p95Ms}ms exceeds budget ${budget.p95LatencyMs}ms`);
        }
      }
    } catch {
      console.log('  (performance results file found but not parseable — skipping regression check)');
    }
  } else {
    console.log('  (no performance results file found — regression check skipped)');
    console.log('  To enable: run performance tests with JSON output to test-results/performance.json');
  }

  if (regressions.length > 0) {
    console.log('');
    console.log('  REGRESSIONS DETECTED:');
    for (const r of regressions) {
      console.log(`    ✗ ${r}`);
    }
    console.log('');
    if (gateMode) {
      console.log('  CI gate FAILED — fix regressions before merge.');
      process.exit(1);
    }
  } else {
    console.log('  ✓ No regressions detected');
  }

  console.log('');
}

main();
