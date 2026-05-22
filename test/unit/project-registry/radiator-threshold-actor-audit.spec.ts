/**
 * F-107 / D-103-write-path round 17 — RadiatorThresholdConfig actor-audit.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — RadiatorThresholdConfig actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/project-registry/application/radiator-threshold.service.ts',
    'utf-8',
  );

  it('upsertConfig: create branch sets createdByPersonId = updatedByPersonId param', () => {
    const upsertSection = src.slice(
      src.indexOf('this.prisma.radiatorThresholdConfig.upsert'),
      src.length,
    );
    expect(upsertSection).toMatch(/createdByPersonId:\s*updatedByPersonId/);
    expect(upsertSection).toMatch(/updatedByPersonId,/);
  });
});
