#!/usr/bin/env node

// F-6.1 / D-110 — FK-index guardrail.
//
// Every `*Id` field declared as part of a `@relation(fields: [...])` in
// prisma/schema.prisma is a FK column. Postgres doesn't auto-index FK
// columns; without an explicit index, JOINs and `WHERE <fk>=?` filters
// degrade to sequential scans as the referenced table grows.
//
// A FK is considered covered when at least one of these is present:
//   - `@id`                                  (PK covers the column)
//   - inline `@unique`                       (unique already indexed)
//   - `@@unique([<fk>, …])`                  (composite unique, FK first)
//   - `@@index([<fk>, …])`                   (explicit index, FK first)
//
// Anything else is a violation. Exit non-zero on any violation.

const fs = require('fs');
const path = require('path');

const SCHEMA = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');

function main() {
  const src = fs.readFileSync(SCHEMA, 'utf8');
  const lines = src.split('\n');

  const violations = [];
  let modelName = null;
  let bodyLines = [];

  function processModel(name, body) {
    const fkFieldNames = new Set();
    const inlineUnique = new Set();
    const indexedFirstCols = new Set();
    for (const line of body) {
      const rel = /@relation\([^)]*fields\s*:\s*\[([^\]]+)\]/.exec(line);
      if (rel) for (const f of rel[1].split(',').map((s) => s.trim())) fkFieldNames.add(f);
      const fieldMatch = /^\s*(\w+)\s+\S/.exec(line);
      if (fieldMatch && (/@id\b/.test(line) || /@unique\b/.test(line))) {
        inlineUnique.add(fieldMatch[1]);
      }
      const ix = /@@(?:index|unique)\s*\(\s*\[([^\]]+)\]/.exec(line);
      if (ix) {
        const cols = ix[1].split(',').map((s) => s.trim().replace(/\(.*\)/, ''));
        if (cols.length > 0) indexedFirstCols.add(cols[0]);
      }
    }
    for (const fk of fkFieldNames) {
      if (inlineUnique.has(fk)) continue;
      if (indexedFirstCols.has(fk)) continue;
      violations.push({ model: name, field: fk });
    }
  }

  for (const line of lines) {
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m) {
      modelName = m[1];
      bodyLines = [];
      continue;
    }
    if (modelName && /^\}\s*$/.test(line)) {
      processModel(modelName, bodyLines);
      modelName = null;
      bodyLines = [];
      continue;
    }
    if (modelName) bodyLines.push(line);
  }

  if (violations.length > 0) {
    console.error(`FK-index guardrail: ${violations.length} unindexed FK column(s) found.`);
    console.error(
      'Each *Id column in a @relation(fields: [...]) needs @@index([<fk>]) or coverage by a composite index where <fk> is the first column.',
    );
    for (const v of violations) console.error(`  ${v.model}.${v.field}`);
    process.exit(1);
  }
  console.log('OK — every FK column has a covering index.');
}

main();
