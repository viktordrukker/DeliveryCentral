/**
 * F-121 / D-103-write-path round 31 — OnboardingTourProgress actor-audit.
 * Source-shape assertions across help.service upsert.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — OnboardingTourProgress actor-audit (source-shape)', () => {
  const serviceSrc = readFileSync(
    'src/modules/help-center/application/help.service.ts',
    'utf-8',
  );

  it('upsertTourProgress: create + update branches both set actor cols from personId', () => {
    const upsertStart = serviceSrc.indexOf('onboardingTourProgress.upsert');
    const section = serviceSrc.slice(upsertStart, serviceSrc.indexOf('/* ── Mappers'));
    // create branch: BOTH cols
    expect(section).toMatch(/createdByPersonId:\s*personId/);
    // updatedByPersonId appears in BOTH create + update branches
    const updatedMatches = section.match(/updatedByPersonId:\s*personId/g);
    expect(updatedMatches?.length).toBe(2);
  });
});
