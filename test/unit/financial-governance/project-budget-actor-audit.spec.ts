/**
 * F-111 / D-103-write-path round 21 — ProjectBudget actor-audit on upsert.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectBudget actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/financial-governance/infrastructure/financial.repository.ts',
    'utf-8',
  );

  it('upsertProjectBudget: create + update branches both set actor-audit', () => {
    const section = src.slice(
      src.indexOf('this.prisma.projectBudget.upsert'),
      // EPIC G added optional vendorBudget/currencyCode spreads to both
      // branches, lengthening the block — widen the window so the update
      // branch's updatedByPersonId stays inside it.
      src.indexOf('this.prisma.projectBudget.upsert') + 1300,
    );
    // create branch: BOTH cols
    expect(section).toMatch(/createdByPersonId:\s*data\.actorId\s*\?\?\s*null/);
    // update branch: only updatedByPersonId
    const updatedMatches = section.match(/updatedByPersonId:\s*data\.actorId\s*\?\?\s*null/g);
    expect(updatedMatches?.length).toBe(2); // one in create + one in update
  });
});
