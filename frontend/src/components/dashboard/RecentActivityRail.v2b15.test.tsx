/**
 * V2-B.15 — Director recent-decisions gating.
 *
 * The decision-log reskin must NOT leak onto the legacy flag-off path:
 * DirectorDashboardPage is a live, non-flag-gated route, so gating on
 * `role === 'director'` alone would flip the new grammar on for every real
 * director. The gate must also require isFeatureEnabled('dsRefresh').
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-B.15 — RecentActivityRail decision-log gate', () => {
  const src = readFileSync('src/components/dashboard/RecentActivityRail.tsx', 'utf-8');

  it('gates directorDecisionMode on BOTH role===director AND dsRefresh', () => {
    expect(src).toMatch(
      /directorDecisionMode=\{role === 'director' && isFeatureEnabled\('dsRefresh'\)\}/,
    );
    expect(src).toMatch(/import \{ isFeatureEnabled \} from '@\/lib\/feature-flags'/);
  });
});
