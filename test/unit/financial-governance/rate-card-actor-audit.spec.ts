/**
 * F-106 / D-103-write-path round 16 — RateCard parent actor-audit.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — RateCard parent actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/financial-governance/application/rate-card-admin.service.ts',
    'utf-8',
  );

  it('create: rateCard.create data block sets createdByPersonId + updatedByPersonId', () => {
    const section = src.slice(
      src.indexOf('this.prisma.rateCard.create'),
      src.indexOf('this.auditLogger?.record', src.indexOf('this.prisma.rateCard.create')),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('update: rateCard.update data block sets updatedByPersonId', () => {
    // First update is in `update()` method (line ~138)
    const firstUpdateIdx = src.indexOf('this.prisma.rateCard.update');
    const section = src.slice(firstUpdateIdx, firstUpdateIdx + 600);
    expect(section).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('archive: second rateCard.update sets updatedByPersonId', () => {
    // archive() is second rateCard.update occurrence
    const firstIdx = src.indexOf('this.prisma.rateCard.update');
    const secondIdx = src.indexOf('this.prisma.rateCard.update', firstIdx + 1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    const section = src.slice(secondIdx, secondIdx + 400);
    expect(section).toMatch(/updatedByPersonId:\s*actorId/);
  });
});
