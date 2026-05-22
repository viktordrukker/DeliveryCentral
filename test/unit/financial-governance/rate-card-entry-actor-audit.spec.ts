/**
 * F-102 / D-103-write-path round 12 — asserts RateCardAdminService's 3
 * RateCardEntry mutation methods populate createdByPersonId /
 * updatedByPersonId. Static-shape assertion only — exercises the
 * source file's expected call shape rather than spinning up the full
 * NestJS module graph.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — RateCardEntry actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/financial-governance/application/rate-card-admin.service.ts',
    'utf-8',
  );

  it('createEntry: data block includes createdByPersonId + updatedByPersonId', () => {
    // Find the createEntry create-call block
    const createSection = src.slice(
      src.indexOf('public async createEntry'),
      src.indexOf('public async updateEntry'),
    );
    expect(createSection).toMatch(/createdByPersonId:\s*actorId/);
    expect(createSection).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('updateEntry: data block sets updatedByPersonId = actorId', () => {
    const updateSection = src.slice(
      src.indexOf('public async updateEntry'),
      src.indexOf('public async archiveEntry'),
    );
    expect(updateSection).toMatch(/data\.updatedByPersonId\s*=\s*actorId/);
  });

  it('archiveEntry: data block sets updatedByPersonId', () => {
    const archiveSection = src.slice(
      src.indexOf('public async archiveEntry'),
      src.length,
    );
    expect(archiveSection).toMatch(/updatedByPersonId:\s*actorId/);
  });
});
