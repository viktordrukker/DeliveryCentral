/**
 * W3-10 — `/staffing-desk?view=board` URL coercion.
 *
 * The legacy `view=board` (kanban) view was retired in Phase 2. A prior fix
 * rendered the Table component for `view=board`, but the URL still read
 * `view=board`. W3-10 coerces the URL itself so bookmarks, back/forward, and
 * deep-links land on the canonical `view=table`, and the View switcher tab
 * reflects that.
 *
 * Pattern follows StaffingDeskPage.positionIds.test.tsx — source-string
 * inspection avoids the cost of mocking ~12 hooks just to assert wiring.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('W3-10 — StaffingDeskPage coerces ?view=board to ?view=table', () => {
  const src = readFileSync('src/routes/staffing-desk/StaffingDeskPage.tsx', 'utf-8');

  it('runs a useEffect that flips filters.view from board to table', () => {
    expect(src).toMatch(/if \(filters\.view === 'board'\)/);
    expect(src).toMatch(/setFilters\(\{\s*view:\s*'table'\s*\}\)/);
  });

  it('removes the board branch from the table render guard', () => {
    // The render guard previously read `filters.view === 'table' || filters.view === 'board' || !filters.view`.
    // After W3-10 the URL is coerced, so the disjunction must no longer mention 'board'.
    expect(src).not.toMatch(/filters\.view === 'table' \|\| filters\.view === 'board'/);
  });

  it('does not import the deleted StaffingDeskBoard component', () => {
    expect(src).not.toMatch(/StaffingDeskBoard/);
  });
});
