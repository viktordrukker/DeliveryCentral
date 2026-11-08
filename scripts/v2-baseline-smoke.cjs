#!/usr/bin/env node
/**
 * V2 Playwright baseline smoke check.
 *
 * Validates the routes manifest and asserts the spec file is structurally
 * sound, without running the 120 actual snapshot tests (those only execute
 * via `.github/workflows/v2-playwright-baseline.yml` against v2-staging).
 *
 * Wired up as `npm run test:e2e:v2-baseline:smoke` and intended for the
 * standard PR pipeline as a cheap canary.
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'e2e/v2/routes.json');
const specPath = path.join(repoRoot, 'e2e/v2/baseline.spec.ts');
const workflowPath = path.join(repoRoot, '.github/workflows/v2-playwright-baseline.yml');

function fail(message) {
  console.error(`[v2-baseline-smoke] FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  fail(`missing manifest at ${manifestPath}`);
}
if (!fs.existsSync(specPath)) {
  fail(`missing spec at ${specPath}`);
}
if (!fs.existsSync(workflowPath)) {
  fail(`missing workflow at ${workflowPath}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (err) {
  fail(`routes.json is not valid JSON: ${err.message}`);
}

if (!Array.isArray(manifest.viewports) || manifest.viewports.length !== 4) {
  fail(`expected exactly 4 viewports, got ${manifest.viewports?.length ?? 'undefined'}`);
}
if (!Array.isArray(manifest.routes) || manifest.routes.length !== 30) {
  fail(`expected exactly 30 routes, got ${manifest.routes?.length ?? 'undefined'}`);
}

const allowedRoles = new Set([
  'admin',
  'director',
  'hrManager',
  'resourceManager',
  'projectManager',
  'deliveryManager',
  'employee',
  'unauthenticated',
]);

const viewportNames = new Set();
for (const vp of manifest.viewports) {
  if (typeof vp.name !== 'string' || !vp.name) fail('viewport missing name');
  if (viewportNames.has(vp.name)) fail(`duplicate viewport name ${vp.name}`);
  viewportNames.add(vp.name);
  if (!Number.isInteger(vp.width) || vp.width <= 0) fail(`viewport ${vp.name} width invalid`);
  if (!Number.isInteger(vp.height) || vp.height <= 0) fail(`viewport ${vp.name} height invalid`);
}

const routeIds = new Set();
for (const route of manifest.routes) {
  if (typeof route.id !== 'string' || !route.id) fail('route missing id');
  if (routeIds.has(route.id)) fail(`duplicate route id ${route.id}`);
  routeIds.add(route.id);
  if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
    fail(`route ${route.id} path must start with /`);
  }
  if (!allowedRoles.has(route.role)) {
    fail(`route ${route.id} has unknown role ${route.role}`);
  }
}

const totalPairs = manifest.viewports.length * manifest.routes.length;
if (totalPairs !== 120) {
  fail(`expected 120 snapshot pairs, computed ${totalPairs}`);
}

const spec = fs.readFileSync(specPath, 'utf8');
if (!spec.includes('toHaveScreenshot')) fail('spec missing toHaveScreenshot call');
if (!spec.includes('routes.json')) fail('spec does not reference routes.json');

const workflow = fs.readFileSync(workflowPath, 'utf8');
if (!workflow.includes('workflow_dispatch')) fail('workflow missing workflow_dispatch trigger');
if (!workflow.includes('v2-baseline-snapshots')) fail('workflow missing artefact upload name');

console.log(`[v2-baseline-smoke] ok — ${manifest.routes.length} routes × ${manifest.viewports.length} viewports = ${totalPairs} snapshots`);
process.exit(0);
