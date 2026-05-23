/**
 * GitHub #218 — Best-fit strategy returned 133 assignments at 0% avg match
 * because the Tier-2 fallback (longest-bench eligible person) ignored
 * `minSkillMatch`. Source-shape assertion that the floor gate now applies
 * to all three tiers and the unmatched-demand reason cites the floor.
 */
import { readFileSync } from 'node:fs';

describe('workforce-planner — minSkillMatch gates all tiers (GitHub #218)', () => {
  const src = readFileSync(
    'src/modules/staffing-desk/application/workforce-planner.service.ts',
    'utf-8',
  );

  it('skill-floor check runs BEFORE bestFallback is set', () => {
    const start = src.indexOf('Three-tier selection');
    const end = src.indexOf('const chosen = bestChain');
    const section = src.slice(start, end);
    const floorIdx = section.indexOf('skillScore < minSkillMatch');
    const fallbackIdx = section.indexOf('bestFallback = {');
    expect(floorIdx).toBeGreaterThan(0);
    expect(fallbackIdx).toBeGreaterThan(0);
    expect(floorIdx).toBeLessThan(fallbackIdx);
  });

  it('below-floor candidates increment a counter (used for the unmatched reason)', () => {
    expect(src).toMatch(/belowFloorSkipped\+\+/);
    expect(src).toMatch(/let belowFloorSkipped = 0/);
  });

  it('unmatched-demand reason cites the skill floor when candidates were dropped below it', () => {
    expect(src).toMatch(/No bench person clears the \$\{floorPct\}% skill floor/);
    expect(src).toMatch(/belowFloorSkipped > 0 && minSkillMatch > 0/);
  });
});
