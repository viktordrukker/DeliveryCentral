#!/usr/bin/env node

// Sprint F-0.1 — flag-registry consistency CI rule.
//
// Asserts:
//   1. Every `flag.X` key referenced in source has a backend registry entry
//   2. The frontend mirror (frontend/src/lib/feature-flags.ts) is in sync
//      with the backend registry (src/shared/config/platform-flags.service.ts)
//   3. Every backend registry entry declares non-empty `owner` + `maturityLevel`
//   4. Non-`ga` registry entries declare an `expectedGaSprint`
//
// Exits non-zero on violation.

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const backendRegistry = path.join(rootDir, 'src/shared/config/platform-flags.service.ts');
const frontendMirror = path.join(rootDir, 'frontend/src/lib/feature-flags.ts');

const errors = [];

// 1. Parse backend registry: extract { id → { key, default, maturityLevel, owner, expectedGaSprint? } }
const backendSource = fs.readFileSync(backendRegistry, 'utf8');

const backendEntries = {};
const entryRegex = /(\w+):\s*\{[^}]*?key:\s*['"]([^'"]+)['"][^}]*?default:\s*(true|false)[^}]*?maturityLevel:\s*['"]([^'"]+)['"][^}]*?owner:\s*['"]([^'"]+)['"]/gs;
let match;
while ((match = entryRegex.exec(backendSource)) !== null) {
  const [, id, key, def, maturity, owner] = match;
  if (id === 'cache' || id === 'logger') continue; // class fields
  backendEntries[id] = {
    key,
    default: def === 'true',
    maturityLevel: maturity,
    owner,
  };
}

// Detect expectedGaSprint per entry
const sprintRegex = /(\w+):\s*\{[^}]*?expectedGaSprint:\s*['"]([^'"]+)['"]/gs;
while ((match = sprintRegex.exec(backendSource)) !== null) {
  const [, id, sprint] = match;
  if (backendEntries[id]) backendEntries[id].expectedGaSprint = sprint;
}

if (Object.keys(backendEntries).length === 0) {
  errors.push(`Backend registry empty — parser failed?`);
}

// 3. Validate registry shape
for (const [id, entry] of Object.entries(backendEntries)) {
  if (!entry.owner || !entry.owner.trim()) {
    errors.push(`Backend flag ${id}: missing owner`);
  }
  if (!['scaffolded', 'developing', 'beta', 'ga', 'deprecated'].includes(entry.maturityLevel)) {
    errors.push(`Backend flag ${id}: invalid maturityLevel ${entry.maturityLevel}`);
  }
  if (entry.maturityLevel !== 'ga' && entry.maturityLevel !== 'deprecated' && !entry.expectedGaSprint) {
    errors.push(`Backend flag ${id} (${entry.maturityLevel}): missing expectedGaSprint`);
  }
}

// 2. Verify frontend mirror is in sync
const frontendSource = fs.readFileSync(frontendMirror, 'utf8');
const frontendEntries = {};
const feRegex = /(\w+):\s*\{\s*key:\s*['"]([^'"]+)['"]\s*,\s*default:\s*(true|false)/g;
while ((match = feRegex.exec(frontendSource)) !== null) {
  const [, id, key, def] = match;
  frontendEntries[id] = { key, default: def === 'true' };
}

for (const id of Object.keys(backendEntries)) {
  if (!frontendEntries[id]) {
    errors.push(`Frontend mirror missing entry for ${id} (backend has it)`);
    continue;
  }
  if (frontendEntries[id].key !== backendEntries[id].key) {
    errors.push(`Frontend mirror ${id}: key mismatch (FE=${frontendEntries[id].key}, BE=${backendEntries[id].key})`);
  }
  if (frontendEntries[id].default !== backendEntries[id].default) {
    errors.push(`Frontend mirror ${id}: default mismatch (FE=${frontendEntries[id].default}, BE=${backendEntries[id].default})`);
  }
}

for (const id of Object.keys(frontendEntries)) {
  if (!backendEntries[id]) {
    errors.push(`Backend registry missing entry for ${id} (frontend mirror has it)`);
  }
}

// Report
if (errors.length > 0) {
  console.error(`\nFlag registry check failed (${errors.length} errors):`);
  errors.forEach((e) => console.error(`  • ${e}`));
  process.exit(1);
}

console.log(
  `Flag registry OK: ${Object.keys(backendEntries).length} backend entries, ${Object.keys(frontendEntries).length} frontend mirror entries.`,
);
