/**
 * F-125 / D-103-write-path round 35 — ProjectRagSnapshot actor-audit.
 * Covers both write sites: radiator-override.service.ts (upsert+update)
 * and project-rag.service.ts upsertSnapshot.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectRagSnapshot actor-audit (source-shape)', () => {
  const overrideSrc = readFileSync(
    'src/modules/project-registry/application/radiator-override.service.ts',
    'utf-8',
  );
  const ragSrc = readFileSync(
    'src/modules/project-registry/application/project-rag.service.ts',
    'utf-8',
  );

  it('radiator-override: upsert create + update branches stamp both cols with personId', () => {
    const upsertSection = overrideSrc.slice(
      overrideSrc.indexOf('projectRagSnapshot.upsert'),
      overrideSrc.indexOf('await this.scoringService.computeRadiator'),
    );
    expect(upsertSection).toMatch(/createdByPersonId:\s*personId/);
    const updated = upsertSection.match(/updatedByPersonId:\s*personId/g);
    // create branch (1) + update branch (1)
    expect(updated?.length).toBe(2);
  });

  it('radiator-override: post-recompute update sets updatedByPersonId', () => {
    const updateSection = overrideSrc.slice(
      overrideSrc.indexOf("projectRagSnapshot.update"),
      overrideSrc.length,
    );
    expect(updateSection).toMatch(/updatedByPersonId:\s*personId/);
  });

  it('project-rag.upsertSnapshot: create populates both cols, update populates updatedByPersonId', () => {
    const upsertSection = ragSrc.slice(
      ragSrc.indexOf('projectRagSnapshot.upsert'),
      ragSrc.indexOf('return this.snapshotToDto'),
    );
    expect(upsertSection).toMatch(/createdByPersonId:\s*recordedByPersonId/);
    const updated = upsertSection.match(/updatedByPersonId:\s*recordedByPersonId/g);
    expect(updated?.length).toBe(2);
  });
});
