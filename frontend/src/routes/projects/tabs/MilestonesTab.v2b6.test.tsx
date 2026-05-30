/**
 * V2-B.6 — Plan gates segmented strip.
 *
 * MilestonesTab is SHARED (legacy `?tab=milestones` AND v2 PlanTab sub-tab),
 * so the gates strip must be gated on `isFeatureEnabled('dsRefresh')` — the
 * legacy flag-off render stays pixel-identical. Source-string assertion keeps
 * the gating + the strip's data dependency locked.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-B.6 — MilestonesTab Plan gates strip', () => {
  const src = readFileSync('src/routes/projects/tabs/MilestonesTab.tsx', 'utf-8');

  it('imports isFeatureEnabled and gates the strip on dsRefresh', () => {
    expect(src).toMatch(/import \{ isFeatureEnabled \} from '@\/lib\/feature-flags'/);
    expect(src).toMatch(/isFeatureEnabled\('dsRefresh'\) && milestones\.length > 0/);
  });

  it('renders a plan-gates-strip with a hit/total summary', () => {
    expect(src).toMatch(/data-testid="plan-gates-strip"/);
    expect(src).toMatch(/m\.status === 'HIT'/);
    expect(src).toMatch(/\/ \{milestones\.length\} hit/);
  });

  it('orders segments by plannedDate ascending', () => {
    expect(src).toMatch(
      /\.sort\(\(a, b\) => \(a\.plannedDate \?\? ''\)\.localeCompare\(b\.plannedDate \?\? ''\)\)/,
    );
  });
});
