/**
 * V2-B.10 — Staffing-desk Σ-util / over-allocation column.
 *
 * Source-string assertions: the column is gated to the v2 (dsRefresh) SUPPLY
 * board and APPENDED to the rendered column set (not added to the sd-supply
 * visibility seed), so the legacy flag-off board is byte-identical. Full render
 * coverage is intentionally avoided (the table mocks WorkloadTimeline +
 * useColumnVisibility); the sum logic is trivial and asserted here by shape.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-B.10 — StaffingDeskTable Σ-util column', () => {
  const src = readFileSync('src/components/staffing-desk/StaffingDeskTable.tsx', 'utf-8');
  const page = readFileSync('src/routes/staffing-desk/StaffingDeskPage.tsx', 'utf-8');

  it('defines a sumutil over-allocation column with a VarianceBar', () => {
    expect(src).toMatch(/key: 'sumutil'/);
    expect(src).toMatch(/filterType: 'none'/);
    expect(src).toMatch(/<VarianceBar/);
    expect(src).toMatch(/personAssignments\.reduce/);
  });

  it('gates the column to the v2 supply board only', () => {
    expect(src).toMatch(/const showSumUtil = !!dsRefresh && tab === 'supply'/);
  });

  it('appends the column to the rendered set (not the visibility seed) so legacy is unchanged', () => {
    expect(src).toMatch(/base\.push\(SUPPLY_SUMUTIL_COLUMN\)/);
    // must NOT be added to the sd-supply visibility seed
    expect(src).not.toMatch(/supplyColKeys.*sumutil/);
  });

  it('StaffingDeskPage threads dsRefreshEnabled into the table', () => {
    expect(page).toMatch(/dsRefresh=\{dsRefreshEnabled\}/);
  });
});
