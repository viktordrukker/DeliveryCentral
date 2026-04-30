#!/usr/bin/env node
/**
 * Phase DS-3-4 — sweep raw `<input type="date" .../>` callsites to
 * `<DatePicker .../>` (the DS molecule).
 *
 * Transforms applied:
 *   1. `<input ... type="date" ... />`  →  `<DatePicker ... />`
 *      (the `type="date"` attribute is removed; DatePicker is implicitly typed)
 *   2. `className="field__control"` is removed — DatePicker brings its own
 *      `ds-input` class.
 *   3. `onChange={(e) => f(e.target.value)}` (or with `(event) =>`) is
 *      rewritten to `onValueChange={(value) => f(value)}`.
 *      Any other shape of `onChange` is left as-is and the callsite is
 *      reported as a residual for manual review.
 *   4. `import { DatePicker } from '@/components/ds';` is added to each
 *      changed file (or appended to an existing `@/components/ds` import).
 *
 * Usage:
 *   node scripts/codemod-ds-datepicker.cjs --dry-run
 *   node scripts/codemod-ds-datepicker.cjs --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'frontend', 'src');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const apply = argv.includes('--apply');
if (!dryRun && !apply) {
  console.error('Specify --dry-run or --apply.');
  process.exit(2);
}

function* walkTsx(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkTsx(full);
    else if (entry.isFile() && full.endsWith('.tsx')) yield full;
  }
}

function isExcluded(file) {
  if (file.endsWith('.test.tsx') || file.endsWith('.spec.tsx')) return true;
  if (file.endsWith('.stories.tsx')) return true;
  if (file.includes(path.sep + 'components' + path.sep + 'ds' + path.sep)) return true;
  return false;
}

// Match `<input ... type="date" ... />` allowing JSX expressions (which can
// contain `=>` arrows) inside attributes. Same JSX-aware attr segment as the
// Button codemod uses.
const ATTR = String.raw`(?:[^>{"']|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*?`;
const INPUT_RE = new RegExp(
  String.raw`<input(${ATTR}\btype="date"${ATTR})\/>`,
  'g',
);

const ON_CHANGE_RE = /onChange=\{\(([a-zA-Z0-9_]+)\)\s*=>\s*([\s\S]+?\b\1\.target\.value[\s\S]*?)\}/;

const summary = {
  filesScanned: 0,
  filesChanged: 0,
  inputsConverted: 0,
  residualsFile: [],
};

function transformFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let next = src;
  let convertedHere = 0;
  const residualsHere = [];

  next = next.replace(INPUT_RE, (full, attrs) => {
    // Remove `type="date"` (with optional surrounding whitespace).
    let cleanedAttrs = attrs.replace(/\s*type="date"\s*/g, ' ');
    // Drop className="field__control" — DatePicker brings its own.
    cleanedAttrs = cleanedAttrs.replace(/\s*className="field__control"\s*/g, ' ');

    // Rewrite onChange handlers that just read e.target.value.
    const onChangeMatch = ON_CHANGE_RE.exec(cleanedAttrs);
    if (onChangeMatch) {
      const eventName = onChangeMatch[1];
      const body = onChangeMatch[2];
      // Replace `e.target.value` with `value` and rename arg to `value`.
      const rewritten = body.replace(new RegExp(`\\b${eventName}\\.target\\.value\\b`, 'g'), 'value');
      cleanedAttrs = cleanedAttrs.replace(
        ON_CHANGE_RE,
        `onValueChange={(value) => ${rewritten}}`,
      );
    } else if (/onChange=/.test(cleanedAttrs)) {
      // Non-trivial onChange — leave for manual review.
      residualsHere.push({
        file,
        snippet: full.slice(0, 160).replace(/\s+/g, ' '),
      });
      return full;
    }

    // Collapse runs of whitespace to single space inside attrs, preserve newlines.
    cleanedAttrs = cleanedAttrs.replace(/[ \t]+/g, ' ').replace(/ \n/g, '\n');

    convertedHere += 1;
    return `<DatePicker${cleanedAttrs}/>`;
  });

  if (convertedHere > 0) {
    next = ensureDsImport(next);
  }

  return { changed: next !== src, next, convertedHere, residualsHere };
}

function ensureDsImport(content) {
  // If a DS import line exists, append DatePicker to its named imports.
  const dsImportRe = /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/ds['"];/;
  const existing = dsImportRe.exec(content);
  if (existing) {
    const imports = existing[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (imports.includes('DatePicker')) return content;
    imports.push('DatePicker');
    imports.sort();
    return content.replace(dsImportRe, `import { ${imports.join(', ')} } from '@/components/ds';`);
  }
  // No DS import yet — insert one after the last import statement.
  const lastImportRe = /^import [^;]+;[ \t]*$/gm;
  let lastMatch;
  let m;
  while ((m = lastImportRe.exec(content))) lastMatch = m;
  if (lastMatch) {
    const insertAt = lastMatch.index + lastMatch[0].length;
    return (
      content.slice(0, insertAt) +
      `\nimport { DatePicker } from '@/components/ds';` +
      content.slice(insertAt)
    );
  }
  return `import { DatePicker } from '@/components/ds';\n\n${content}`;
}

for (const file of walkTsx(SRC_ROOT)) {
  if (isExcluded(file)) continue;
  summary.filesScanned += 1;
  const { changed, next, convertedHere, residualsHere } = transformFile(file);
  if (residualsHere.length > 0) summary.residualsFile.push(...residualsHere);
  if (!changed) continue;
  summary.filesChanged += 1;
  summary.inputsConverted += convertedHere;
  console.log(`${apply ? 'wrote' : 'would write'} ${path.relative(ROOT, file)} (${convertedHere} input)`);
  if (apply) fs.writeFileSync(file, next, 'utf8');
}

console.log('');
console.log(`Files scanned:        ${summary.filesScanned}`);
console.log(`Files changed:        ${summary.filesChanged}`);
console.log(`<input> converted:    ${summary.inputsConverted}`);
console.log(`Residuals (manual):   ${summary.residualsFile.length}`);
if (summary.residualsFile.length > 0) {
  console.log('');
  console.log('Residuals — non-trivial onChange handlers, left untouched:');
  for (const r of summary.residualsFile) {
    console.log(`  ${path.relative(ROOT, r.file)}`);
    console.log(`    ${r.snippet}`);
  }
}
