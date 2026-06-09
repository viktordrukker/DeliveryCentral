/**
 * W4-06 → SoT PR 6 — Staffing Desk button copy evolution.
 *
 * W4-06 introduced clarifying labels ("+ New Position (Quick)" / "New Position
 * (Full page)") on the two Create-Position CTAs. SoT PR 6 then removes both
 * CTAs entirely so the page conforms to the DS canvas (Staffing Desk has no
 * inline create button — position creation moves to the PageHeader action and
 * the embedded drawer in SoT PR 8).
 *
 * This test now locks in BOTH directions of that evolution:
 *   1. The legacy ambiguous copy is gone.
 *   2. The W4-06 clarifying copy is gone (replaced by saved-tab strip + JqlBar).
 *   3. No legacy "Staffing Request" / "staffing request" strings remain in
 *      rendered output (SoT §9.1 acceptance for /staffing-desk).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SoT PR 6 — StaffingDeskPage drops inline Create-Position CTAs', () => {
  const src = readFileSync('src/routes/staffing-desk/StaffingDeskPage.tsx', 'utf-8');

  it('drops the ambiguous "Open full create page" copy (W4-06 carryover)', () => {
    expect(src).not.toMatch(/Open full create page/);
  });

  it('drops the W4-06 primary CTA "+ New Position (Quick)"', () => {
    expect(src).not.toMatch(/\+ New Position \(Quick\)/);
  });

  it('drops the W4-06 secondary CTA "New Position (Full page)"', () => {
    expect(src).not.toMatch(/New Position \(Full page\)/);
  });

  it('contains no rendered "Staffing Request" / "staffing request" strings (SoT §9.1)', () => {
    expect(src).not.toMatch(/"Staffing Request"|"staffing request"/);
    expect(src).not.toMatch(/Create Staffing Request/);
  });

  it('does not import the legacy StaffingRequestDrawer (replaced by embedded CreatePositionDrawer in SoT PR 8)', () => {
    expect(src).not.toMatch(/StaffingRequestDrawer/);
  });
});
