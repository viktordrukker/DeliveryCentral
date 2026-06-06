/**
 * LEAN-P4-missing-6 — `?positionIds=<csv>` URL filter deep-links the Director
 * "What needs you now" anomaly rail straight into a filtered table on the
 * staffing desk.
 *
 * Asserted by source-string inspection of `StaffingDeskPage.tsx`: the filter
 * key sits in `FILTER_DEFAULTS`, gets parsed into a `Set` via `useMemo`, and
 * is applied to the `StaffingDeskTable` items prop alongside the existing
 * HIDDEN_STATUSES filter. Render-level coverage is intentionally avoided —
 * the page wires together ~12 hooks (useStaffingDesk, useStaffingDeskActions,
 * useTitleBarActions, useFilterParams, etc.) that would otherwise require
 * mocking the entire staffing-desk + auth + drilldown surface.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('LEAN-P4-missing-6 — StaffingDeskPage positionIds filter', () => {
  const src = readFileSync('src/routes/staffing-desk/StaffingDeskPage.tsx', 'utf-8');

  it('declares positionIds in the URL filter defaults', () => {
    expect(src).toMatch(/positionIds:\s*''/);
  });

  it('builds a positionIdsSet via useMemo from the comma-separated filter value', () => {
    expect(src).toMatch(/const positionIdsSet = useMemo/);
    expect(src).toMatch(/filters\.positionIds/);
    expect(src).toMatch(/csv\.split\(','\)/);
  });

  it('filters table items by positionIdsSet alongside the hidden-statuses filter', () => {
    expect(src).toMatch(/positionIdsSet === null \|\| positionIdsSet\.has\(row\.id\)/);
  });

  it('threads projectId from the URL through to useStaffingDesk so the BE narrows too', () => {
    expect(src).toMatch(/projectId: filters\.projectId/);
  });
});
