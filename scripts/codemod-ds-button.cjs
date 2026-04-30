#!/usr/bin/env node
/**
 * Phase DS-1-7 codemod — replace static `<button className="button button--*">` and
 * `<Link className="button button--*">` callsites with the DS `<Button>` atom.
 *
 * Scope (intentionally narrow for safety):
 *  - Static string classNames only. Dynamic `className={`button button--${...}`}` is left
 *    for manual sweep — the script logs each occurrence as a residual.
 *  - The button class must be the FIRST class (e.g. `className="button button--primary ..."`).
 *  - Multi-class strings supported: `button button--secondary button--sm` →
 *    `variant="secondary" size="sm"`.
 *  - The script preserves every other attribute (style, onClick, disabled, type, etc.).
 *  - The script adds `import { Button } from '@/components/ds'` if absent.
 *  - For `<Link>` callsites, the existing `Link` import (typically from react-router-dom)
 *    is preserved and the rendered tag becomes `<Button as={Link} ...>`.
 *
 * Usage:
 *   node scripts/codemod-ds-button.cjs --dry-run                    # full-repo dry run
 *   node scripts/codemod-ds-button.cjs --dry-run --file <path>      # single-file dry run
 *   node scripts/codemod-ds-button.cjs --apply                      # apply to repo
 *   node scripts/codemod-ds-button.cjs --apply --file <path>        # apply to single file
 *
 * Output:
 *   Per-file: transforms applied + residual dynamic patterns left untouched.
 *   Repo-wide totals at the end.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'frontend', 'src');
const DS_IMPORT = "import { Button } from '@/components/ds';";

// ── CLI ───────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flags = {
  dryRun: argv.includes('--dry-run'),
  apply: argv.includes('--apply'),
  file: null,
};
const fileFlag = argv.indexOf('--file');
if (fileFlag !== -1) flags.file = argv[fileFlag + 1];

if (!flags.dryRun && !flags.apply) {
  console.error('Specify --dry-run or --apply.');
  process.exit(2);
}

// ── File discovery ────────────────────────────────────────────────────────────

function collectTsxFiles(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTsxFiles(full, acc);
    else if (entry.isFile() && full.endsWith('.tsx')) acc.push(full);
  }
}

const targetFiles = (() => {
  if (flags.file) return [path.resolve(flags.file)];
  const acc = [];
  collectTsxFiles(SRC_ROOT, acc);
  return acc;
})();

// ── className parsing ─────────────────────────────────────────────────────────

const VARIANT_FROM_CLASS = {
  'button--primary': 'primary',
  'button--secondary': 'secondary',
  'button--danger': 'danger',
};
const SIZE_FROM_CLASS = {
  'button--xs': 'xs',
  'button--sm': 'sm',
  'button--lg': 'lg',
};

/**
 * Parse a className value like "button button--secondary button--sm extra-class".
 * Returns { variant, size, residualClasses, ok }.
 *  - `ok` is false if `button` isn't the literal first class (e.g. when the
 *    class string was a template literal, even if static).
 */
function parseClassValue(value) {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length === 0 || tokens[0] !== 'button') return { ok: false };
  let variant = null;
  let size = null;
  const residual = [];
  for (const token of tokens.slice(1)) {
    if (VARIANT_FROM_CLASS[token]) {
      if (!variant) variant = VARIANT_FROM_CLASS[token];
      else residual.push(token); // unexpected duplicate variant — keep as residual
    } else if (SIZE_FROM_CLASS[token]) {
      if (!size) size = SIZE_FROM_CLASS[token];
      else residual.push(token);
    } else {
      residual.push(token);
    }
  }
  return { ok: true, variant: variant ?? 'primary', size, residualClasses: residual };
}

// ── Transformations ───────────────────────────────────────────────────────────

/**
 * Match a complete element block — opening tag + body + closing tag — for
 * `<button>` or `<Link>` whose opening tag carries className="button ...".
 *
 * The opening regex tolerates multi-line attributes (since `[^>]` includes
 * newlines). It captures the attributes before and after className so we can
 * reassemble the new tag preserving every other prop.
 */
// Attr-segment matcher that understands JSX expressions. Each iteration matches:
//   - one non-special char,        OR
//   - a "..." double-quoted string, OR
//   - a '...' single-quoted string, OR
//   - a {...} JSX expression with up to 2 levels of brace nesting (covers `style={{…}}`).
// This is what keeps the regex from prematurely terminating on `=>` arrows or `>`
// characters that sit inside JSX expressions.
const ATTR_SEGMENT = String.raw`(?:[^>{"']|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*?`;

function makeElementRegex(tag) {
  // Group layout:
  //   1 = pre-className attrs
  //   2 = className value (must start with literal `button`)
  //   3 = post-className attrs
  //   4 = body (lazy across newlines)
  return new RegExp(
    String.raw`<${tag}\b(${ATTR_SEGMENT})\bclassName="(button(?:\s+[^"]*)?)"(${ATTR_SEGMENT})>([\s\S]*?)</${tag}>`,
    'g',
  );
}

const BUTTON_BLOCK_REGEX = makeElementRegex('button');
const LINK_BLOCK_REGEX = makeElementRegex('Link');

/**
 * Build the `variant=`/`size=` JSX attribute fragment.
 */
function variantSizeAttrs({ variant, size }) {
  const parts = [];
  // Always emit variant; default to primary even when source had bare `className="button"`
  parts.push(`variant="${variant}"`);
  if (size) parts.push(`size="${size}"`);
  return parts.join(' ');
}

/**
 * Re-assemble residual classes (anything that wasn't variant/size) as className=.
 */
function residualClassAttr(residual) {
  if (!residual.length) return '';
  return ` className="${residual.join(' ')}"`;
}

/**
 * Normalize whitespace inside the reconstructed opening tag.
 * Collapses every internal whitespace run (including newlines) to a single
 * space and trims. Multi-line tags become single-line — that's deliberate
 * and predictable. Reflow is delegated to prettier / eslint --fix.
 */
function tidyAttrs(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function transformButtonBlock(_match, preAttrs, classValue, postAttrs, body) {
  const parsed = parseClassValue(classValue);
  if (!parsed.ok) return null;

  const attrPrefix = tidyAttrs(`${preAttrs} ${variantSizeAttrs(parsed)}${residualClassAttr(parsed.residualClasses)} ${postAttrs}`);
  const opening = `<Button ${attrPrefix}>`;
  return `${opening}${body}</Button>`;
}

function transformLinkBlock(_match, preAttrs, classValue, postAttrs, body) {
  const parsed = parseClassValue(classValue);
  if (!parsed.ok) return null;
  const attrPrefix = tidyAttrs(`as={Link} ${preAttrs} ${variantSizeAttrs(parsed)}${residualClassAttr(parsed.residualClasses)} ${postAttrs}`);
  const opening = `<Button ${attrPrefix}>`;
  return `${opening}${body}</Button>`;
}

/**
 * Find static-className button/Link callsites that the regex can't safely
 * transform (multi-line className, conditional classes inside the string,
 * template literal classNames). Used for residual reporting.
 */
function findResiduals(content) {
  const residuals = [];
  // Template literal classNames containing 'button'
  const tlRegex = /<(button|Link)\b[\s\S]*?className=\{`[^`]*\bbutton\b[^`]*`\}/g;
  let m;
  while ((m = tlRegex.exec(content))) {
    residuals.push({ kind: 'template-literal', tag: m[1], snippet: trimSnippet(content, m.index) });
  }
  // Variable / expression classNames mentioning 'button' — covered by the same
  // regex for any `className={…}` containing 'button'. We approximate by
  // looking for `className={` followed by something that mentions 'button'
  // somewhere in the next 200 chars within the same opening tag.
  const exprRegex = /<(button|Link)\b[^>]*?\bclassName=\{(?!`)([^}]+)\}/g;
  let m2;
  while ((m2 = exprRegex.exec(content))) {
    if (/['"`]?button\b/.test(m2[2])) {
      residuals.push({ kind: 'expression', tag: m2[1], snippet: trimSnippet(content, m2.index) });
    }
  }
  return residuals;
}

function trimSnippet(content, index, span = 120) {
  return content.slice(index, Math.min(content.length, index + span)).replace(/\n/g, ' ');
}

/**
 * Add the `import { Button } from '@/components/ds';` line if not already present.
 * Inserts after the LAST import statement in the file.
 */
function ensureDsImport(content) {
  if (content.includes(DS_IMPORT)) return content;
  if (/from ['"]@\/components\/ds['"]/.test(content)) {
    // Existing import from @/components/ds — append `Button` to the named imports.
    return content.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/ds['"];/,
      (full, names) => {
        const list = names.split(',').map((n) => n.trim()).filter(Boolean);
        if (list.includes('Button')) return full;
        list.push('Button');
        return `import { ${list.join(', ')} } from '@/components/ds';`;
      },
    );
  }
  // Insert after the last import statement in the file. Match only
  // trailing spaces/tabs on the import line — NOT newlines — so the
  // original blank line between imports and code is preserved.
  const lastImportRegex = /^import [^;]+;[ \t]*$/gm;
  let lastMatch;
  let m;
  while ((m = lastImportRegex.exec(content))) lastMatch = m;
  if (lastMatch) {
    const insertAt = lastMatch.index + lastMatch[0].length;
    return content.slice(0, insertAt) + `\n${DS_IMPORT}` + content.slice(insertAt);
  }
  // No imports at all — prepend.
  return `${DS_IMPORT}\n\n${content}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const summary = {
  filesScanned: 0,
  filesChanged: 0,
  buttonReplacements: 0,
  linkReplacements: 0,
  filesWithResiduals: 0,
  residualCount: 0,
  residualsByFile: [],
};

for (const file of targetFiles) {
  summary.filesScanned += 1;
  const original = fs.readFileSync(file, 'utf8');
  let next = original;
  let buttonCount = 0;
  let linkCount = 0;

  next = next.replace(BUTTON_BLOCK_REGEX, (m, pre, cls, post, body) => {
    const out = transformButtonBlock(m, pre, cls, post, body);
    if (out == null) return m;
    buttonCount += 1;
    return out;
  });

  next = next.replace(LINK_BLOCK_REGEX, (m, pre, cls, post, body) => {
    const out = transformLinkBlock(m, pre, cls, post, body);
    if (out == null) return m;
    linkCount += 1;
    return out;
  });

  if (buttonCount + linkCount > 0) {
    next = ensureDsImport(next);
  }

  const residuals = findResiduals(next);
  if (residuals.length > 0) {
    summary.filesWithResiduals += 1;
    summary.residualCount += residuals.length;
    summary.residualsByFile.push({ file, residuals });
  }

  if (next !== original) {
    summary.filesChanged += 1;
    summary.buttonReplacements += buttonCount;
    summary.linkReplacements += linkCount;
    if (flags.apply) {
      fs.writeFileSync(file, next, 'utf8');
    }
    if (flags.file && flags.dryRun) {
      // Print full transformed content for single-file dry run review.
      process.stdout.write(`--- ${path.relative(ROOT, file)} (transformed) ---\n`);
      process.stdout.write(next);
      process.stdout.write('\n--- end ---\n');
    } else {
      console.log(
        `${flags.apply ? 'wrote' : 'would write'} ${path.relative(ROOT, file)} ` +
          `(${buttonCount} button, ${linkCount} link)`,
      );
    }
  }
}

console.log('');
console.log(`Files scanned:       ${summary.filesScanned}`);
console.log(`Files changed:       ${summary.filesChanged}`);
console.log(`<button> replaced:   ${summary.buttonReplacements}`);
console.log(`<Link> replaced:     ${summary.linkReplacements}`);
console.log(`Residual files:      ${summary.filesWithResiduals}`);
console.log(`Residual occurrences: ${summary.residualCount}`);

if (flags.dryRun && summary.residualsByFile.length > 0) {
  console.log('');
  console.log('Residuals (left untouched, need manual review):');
  for (const { file, residuals } of summary.residualsByFile) {
    console.log(`  ${path.relative(ROOT, file)}`);
    for (const r of residuals) {
      console.log(`    [${r.kind}] ${r.snippet}`);
    }
  }
}
