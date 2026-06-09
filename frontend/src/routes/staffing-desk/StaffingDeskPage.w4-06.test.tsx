/**
 * W4-06 — Staffing Desk button copy.
 *
 * Original W4-06 audit clarified two adjacent Create-Position CTAs that opened
 * different surfaces (drawer vs full page). SoT PR 8 retires the full-page
 * surface entirely (V2-done criterion 6 — "no separate full-page
 * CreatePositionPage"); the secondary CTA now opens the embedded
 * CreatePositionDrawer, and the legacy "(Full page)" link is gone.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Staffing Desk Create-Position CTAs (W4-06 + SoT PR 8)', () => {
  const src = readFileSync('src/routes/staffing-desk/StaffingDeskPage.tsx', 'utf-8');

  it('primary CTA opens the embedded CreatePositionDrawer', () => {
    expect(src).toMatch(/\+ New Position</);
    expect(src).toMatch(/data-testid="create-position-open"/);
    expect(src).toMatch(/<CreatePositionDrawer/);
  });

  it('drops the legacy "(Full page)" link to /staffing-requests/new', () => {
    expect(src).not.toMatch(/New Position \(Full page\)/);
    expect(src).not.toMatch(/to="\/staffing-requests\/new"/);
  });

  it('drops the ambiguous "Open full create page" copy', () => {
    expect(src).not.toMatch(/Open full create page/);
  });
});
