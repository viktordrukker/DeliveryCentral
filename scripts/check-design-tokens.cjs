#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const baselineFile = path.join(__dirname, 'design-token-baseline.json');
const includeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const allowedFiles = new Set([
  path.join(frontendDir, 'src/styles/design-tokens.ts'),
]);
const allowedDirectories = [
  path.join(frontendDir, 'src/test'),
  path.join(frontendDir, 'test'),
];

const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const violations = [];
const shouldWriteBaseline = process.argv.includes('--write-baseline');
const baseline = fs.existsSync(baselineFile)
  ? new Set(JSON.parse(fs.readFileSync(baselineFile, 'utf8')))
  : new Set();

function serializeViolation(filePath, matches, line) {
  return `${filePath}|${matches.join(',')}|${line}`;
}

function shouldSkipFile(filePath) {
  if (allowedFiles.has(filePath)) {
    return true;
  }

  if (allowedDirectories.some((directory) => filePath.startsWith(directory + path.sep))) {
    return true;
  }

  return (
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.test.tsx') ||
    filePath.endsWith('.spec.ts') ||
    filePath.endsWith('.spec.tsx')
  );
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!includeExtensions.has(path.extname(entry.name)) || shouldSkipFile(fullPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const matches = line.match(rawColorPattern);
      if (!matches) {
        return;
      }

      violations.push({
        filePath: path.relative(rootDir, fullPath),
        lineNumber: index + 1,
        matches,
        line: line.trim(),
      });
    });
  }
}

walk(path.join(frontendDir, 'src'));

const serializedViolations = violations
  .map(({ filePath, matches, line }) => serializeViolation(filePath, matches, line))
  .sort();

if (shouldWriteBaseline) {
  fs.writeFileSync(baselineFile, `${JSON.stringify(serializedViolations, null, 2)}\n`);
  console.log(`Wrote ${serializedViolations.length} baseline token exceptions to scripts/design-token-baseline.json.`);
  process.exit(0);
}

const newViolations = violations.filter(({ filePath, matches, line }) => {
  const signature = serializeViolation(filePath, matches, line);
  return !baseline.has(signature);
});

if (newViolations.length > 0) {
  console.error('Raw color literals found outside design-token files:');
  newViolations.forEach(({ filePath, lineNumber, matches, line }) => {
    console.error(`- ${filePath}:${lineNumber} [${matches.join(', ')}] ${line}`);
  });
  process.exit(1);
}

console.log('Design token guardrail passed.');
