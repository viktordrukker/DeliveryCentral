/**
 * W4-06 — Staffing Desk button copy clarification.
 *
 * The audit flagged the two adjacent Create-Staffing-Request CTAs as
 * ambiguous: both opened the same domain flow but landed on different
 * surfaces (drawer vs full page). The labels now disambiguate the
 * surface explicitly. Source-string assertion follows the established
 * pattern (StaffingDeskPage.viewBoard.test, .positionIds.test).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('W4-06 — StaffingDeskPage clarifies Create-Staffing-Request button copy', () => {
  const src = readFileSync('src/routes/staffing-desk/StaffingDeskPage.tsx', 'utf-8');

  it('primary CTA is labelled "+ New Staffing Request (Quick)"', () => {
    expect(src).toMatch(/\+ New Staffing Request \(Quick\)/);
  });

  it('secondary CTA is labelled "New Staffing Request (Full page)"', () => {
    expect(src).toMatch(/New Staffing Request \(Full page\)/);
  });

  it('drops the ambiguous "Open full create page" copy', () => {
    expect(src).not.toMatch(/Open full create page/);
  });
});
