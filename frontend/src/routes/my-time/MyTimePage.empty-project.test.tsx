/**
 * GitHub #174 — clicking "Add line" inside the PROJECT TIME section landed the
 * draft input in BENCH TIME when the user had zero project assignments.
 *
 * Root cause: the no-projects branch pushed an add-trigger with scope='bench'
 * into the Project section, so the placement logic correctly routed the draft
 * under Bench (matching the scope) while the click visually originated under
 * "Project time".
 *
 * Fix: drop the mis-scoped trigger; render an explanatory hint row instead.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GitHub #174 — my-time empty-project hint replaces mis-scoped add-trigger', () => {
  const src = readFileSync('src/routes/my-time/MyTimePage.tsx', 'utf-8');

  it('no projects branch pushes an empty-project-hint, NOT a bench add-trigger', () => {
    const section = src.slice(
      src.indexOf('if (projectIds.length === 0)'),
      src.indexOf('for (const pid of projectIds)'),
    );
    expect(section).toMatch(/kind: 'empty-project-hint'/);
    expect(section).not.toMatch(/kind: 'add-trigger'/);
    expect(section).not.toMatch(/scope: 'bench'/);
  });

  it('CalendarRow union admits the new kind', () => {
    expect(src).toMatch(/kind: 'empty-project-hint';/);
  });

  it('fullSpanRow renders a hint cell for empty-project-hint rows', () => {
    expect(src).toMatch(/cr\.kind === 'empty-project-hint'/);
    expect(src).toMatch(/log non-project hours in Bench Time below/);
  });
});
