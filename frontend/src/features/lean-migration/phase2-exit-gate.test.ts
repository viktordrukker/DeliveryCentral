/**
 * Phase 2 exit-gate guardrail.
 *
 * Asserts that every remaining import of the legacy
 * `@/lib/api/assignments` and `@/lib/api/staffing-requests` clients is a
 * pure `import type` statement (or imports the type via the `type` qualifier
 * inside a value-import).
 *
 * Any non-type runtime import re-introduces the Phase 2 regression caught by
 * the 2026-06-05 QA walk — fail the suite loudly so the maintainer is forced
 * to migrate the callsite onto `@/lib/api/project-positions` (via the
 * `position-to-assignment-mapper` if a legacy DTO shape is still needed).
 *
 * Allow-list:
 *  - `frontend/src/features/lean-migration/position-to-assignment-mapper.ts`
 *    intentionally imports legacy types to bridge the two schemas.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const FRONTEND_SRC = resolve(__dirname, '..', '..');

// Files whose runtime imports of the legacy clients are deliberate and
// out-of-scope for the Phase 2 exit-gate. Keep this list minimal — every
// entry is a debt item the LEAN-P2-10 write-bridge work will remove.
const ALLOWED_RUNTIME_IMPORTERS = new Set<string>([
  // The mapper itself imports legacy types to project the lean DTO back
  // into the legacy shape.
  'features/lean-migration/position-to-assignment-mapper.ts',
  // Audit lock file enumerates every legacy callsite as data; it imports
  // nothing at runtime but contains the literal strings in arrays.
  'features/lean-migration/callsite-audit.test.ts',
  // The exit-gate test itself contains literal strings that the walker
  // detects — skip self.
  'features/lean-migration/phase2-exit-gate.test.ts',
  // ── LEAN-P2-10 write-bridge debt (write-deferred per callsite-audit) ──
  // The proposal slate aggregate is still served by the legacy
  // /staffing-requests controller; the lean /project-positions write
  // surface does not expose proposal-slate writes today. These three files
  // import `createStaffingRequest` / `submitStaffingRequest` /
  // `submitProposalSlate` / `pickProposalCandidate` / `rejectProposalSlate`
  // and the matching read suggestion helper. Tracked in callsite-audit as
  // `write-deferred`; remove the entry below when LEAN-P2-10 ships.
  'components/staffing-requests/ProposalBuilderDrawer.tsx',
  'components/staffing-requests/ProposalReviewPanel.tsx',
  'components/staffing-requests/StaffingRequestForm.tsx',
]);

interface ImportFinding {
  file: string;
  lineNumber: number;
  rawLine: string;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // skip node_modules / .git just in case
      if (entry === 'node_modules' || entry === '.git') continue;
      yield* walk(full);
    } else if (
      entry.endsWith('.ts') ||
      entry.endsWith('.tsx')
    ) {
      yield full;
    }
  }
}

function findLegacyImports(): {
  runtime: ImportFinding[];
  typeOnly: ImportFinding[];
} {
  const runtime: ImportFinding[] = [];
  const typeOnly: ImportFinding[] = [];

  for (const file of walk(FRONTEND_SRC)) {
    const rel = relative(FRONTEND_SRC, file).split(sep).join('/');
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');

    // Look for multi-line and single-line import statements that reference
    // either legacy module.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // We only care about the `from` clause to pin the import statement.
      // The matched line is the last line of the import, where the path
      // literal appears.
      const matches = /from\s+'@\/lib\/api\/(assignments|staffing-requests)'/.exec(line);
      if (!matches) continue;

      // Walk backwards to find the start of this import (the `import`
      // keyword). This handles both single-line and multi-line forms.
      let startIdx = i;
      while (startIdx >= 0 && !/^\s*import\b/.test(lines[startIdx])) {
        startIdx -= 1;
      }
      const importBlock = lines.slice(startIdx, i + 1).join('\n');

      const finding: ImportFinding = {
        file: rel,
        lineNumber: i + 1,
        rawLine: importBlock,
      };

      // Two type-only forms:
      //  1. `import type { ... } from '@/lib/api/assignments'`
      //  2. `import { type Foo, type Bar } from '@/lib/api/assignments'`
      //     — every named specifier must be qualified with `type`.
      // Plus the test-only `import('@/lib/api/...')` dynamic-import-as-type
      // expression doesn't show up as `from '...'` here — it never matches.
      const isImportTypeForm = /^\s*import\s+type\b/.test(importBlock);

      if (isImportTypeForm) {
        typeOnly.push(finding);
        continue;
      }

      // Value-form import. The specifiers must each carry the `type` keyword
      // to qualify as type-only at runtime.
      // Extract specifier block between { and }.
      const specifierMatch = /import\s*\{([\s\S]*?)\}\s*from\s+'@\/lib\/api\/(assignments|staffing-requests)'/m.exec(importBlock);
      if (!specifierMatch) {
        // Default / namespace import — definitely runtime.
        runtime.push(finding);
        continue;
      }
      const specifiers = specifierMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      // Every specifier must start with `type ` (e.g. `type Foo`,
      // `type Foo as Bar`).
      const allTypeQualified = specifiers.every((s) => /^type\s+/.test(s));

      if (allTypeQualified) {
        typeOnly.push(finding);
      } else {
        runtime.push(finding);
      }
    }
  }

  return { runtime, typeOnly };
}

describe('Phase 2 exit-gate — legacy client imports', () => {
  it('does not introduce any new runtime import of @/lib/api/assignments or @/lib/api/staffing-requests', () => {
    const { runtime } = findLegacyImports();

    const offenders = runtime.filter(
      (entry) => !ALLOWED_RUNTIME_IMPORTERS.has(entry.file),
    );

    if (offenders.length > 0) {
      const message = offenders
        .map(
          (o) =>
            `  - ${o.file}:${o.lineNumber}\n${o.rawLine
              .split('\n')
              .map((l) => `      ${l}`)
              .join('\n')}`,
        )
        .join('\n');
      throw new Error(
        `Phase 2 exit-gate violation: ${offenders.length} runtime import(s) of the legacy ` +
          `assignments/staffing-requests clients found. Migrate each to ` +
          `@/lib/api/project-positions (use position-to-assignment-mapper if ` +
          `the legacy DTO shape is still required):\n${message}`,
      );
    }

    expect(offenders).toEqual([]);
  });

  it('reports at least one type-only legacy import (sanity check the walker)', () => {
    // The mapper itself + many consumers still use the legacy type aliases.
    // If this assertion ever drops to zero we either deleted all legacy
    // types (great!) or the walker stopped working (bad!) — either way the
    // maintainer needs to look at this test.
    const { typeOnly } = findLegacyImports();
    expect(typeOnly.length).toBeGreaterThan(0);
  });
});
