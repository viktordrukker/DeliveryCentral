#!/usr/bin/env node

// Sprint F-0.1 — feature-doc presence CI rule.
//
// Asserts:
//   1. Every GA flag has a `docs/features/<feature-name>.md` file
//   2. Every beta flag has at minimum a CHANGELOG.md entry containing the flag id
//   3. Every scaffolded flag has `expectedGaSprint` set (already enforced in check-flags)
//
// Exits non-zero on violation. Soft mode (warnings, exit 0) when --soft passed.

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const backendRegistry = path.join(rootDir, 'src/shared/config/platform-flags.service.ts');
const featuresDir = path.join(rootDir, 'docs/features');
const changelogFile = path.join(rootDir, 'CHANGELOG.md');
const softMode = process.argv.includes('--soft');

const warnings = [];
const errors = [];

const backendSource = fs.readFileSync(backendRegistry, 'utf8');
const backendEntries = {};
const entryRegex = /(\w+):\s*\{[^}]*?key:\s*['"]([^'"]+)['"][^}]*?maturityLevel:\s*['"]([^'"]+)['"]/gs;
let match;
while ((match = entryRegex.exec(backendSource)) !== null) {
  const [, id, key, maturity] = match;
  if (id === 'cache' || id === 'logger') continue;
  backendEntries[id] = { key, maturityLevel: maturity };
}

const featuresFiles = fs.existsSync(featuresDir)
  ? fs.readdirSync(featuresDir).filter((f) => f.endsWith('.md'))
  : [];
const changelog = fs.existsSync(changelogFile) ? fs.readFileSync(changelogFile, 'utf8') : '';

for (const [id, entry] of Object.entries(backendEntries)) {
  // 1. GA flags need a doc
  if (entry.maturityLevel === 'ga') {
    // Allow either kebab-case or camel id-named doc
    const camelDoc = `${id}.md`;
    const kebabDoc = id.replace(/([A-Z])/g, '-$1').toLowerCase() + '.md';
    const matches = featuresFiles.includes(camelDoc) || featuresFiles.includes(kebabDoc);
    if (!matches) {
      const msg = `GA flag '${id}' missing doc at docs/features/${kebabDoc} (or ${camelDoc})`;
      if (softMode) warnings.push(msg);
      else errors.push(msg);
    }
  }

  // 2. Beta flags need a CHANGELOG entry
  if (entry.maturityLevel === 'beta') {
    const referenced = changelog.includes(id) || changelog.includes(entry.key);
    if (!referenced) {
      const msg = `Beta flag '${id}' (${entry.key}) not referenced in CHANGELOG.md`;
      if (softMode) warnings.push(msg);
      else errors.push(msg);
    }
  }
}

// Report
if (warnings.length > 0) {
  console.warn(`\nFeature-doc check warnings (${warnings.length}):`);
  warnings.forEach((w) => console.warn(`  • ${w}`));
}
if (errors.length > 0) {
  console.error(`\nFeature-doc check failed (${errors.length} errors):`);
  errors.forEach((e) => console.error(`  • ${e}`));
  process.exit(1);
}

const gaCount = Object.values(backendEntries).filter((e) => e.maturityLevel === 'ga').length;
const betaCount = Object.values(backendEntries).filter((e) => e.maturityLevel === 'beta').length;
console.log(
  `Feature-doc check ${softMode ? '(soft mode) ' : ''}OK: ${gaCount} GA flags, ${betaCount} beta flags${
    softMode && warnings.length > 0 ? ` (${warnings.length} warnings)` : ''
  }.`,
);
