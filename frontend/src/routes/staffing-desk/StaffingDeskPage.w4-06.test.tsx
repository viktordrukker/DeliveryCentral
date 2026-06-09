/**
 * W4-06 → SoT PR 6 → SoT PR 8 — Staffing Desk button copy evolution.
 *
 * W4-06 introduced clarifying labels ("+ New Position (Quick)" / "New Position
 * (Full page)") on the two Create-Position CTAs. SoT PR 6 added DS canvas
 * conformance (PageHeader + saved tabs + JqlBar + Supply/Demand toggle).
 * SoT PR 8 retired the legacy full-page surface (V2-done criterion 6 — "no
 * separate full-page CreatePositionPage"); the primary CTA now opens the
 * embedded CreatePositionDrawer via `?openCreatePosition=true`, and the
 * legacy "(Full page)" link is gone.
 *
 * This test locks in the post-PR-8 invariants:
 *   1. Primary "+ New Position" CTA opens the embedded CreatePositionDrawer.
 *   2. The legacy "(Full page)" link to /staffing-requests/new is gone.
 *   3. The ambiguous "Open full create page" copy is gone.
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
