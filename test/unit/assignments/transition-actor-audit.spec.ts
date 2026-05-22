/**
 * F-118 / D-103-write-path round 28 — ProjectAssignment transition actor-audit.
 * Source-shape assertions across entity + repository + transition service.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectAssignment transition actor-audit (source-shape)', () => {
  const entitySrc = readFileSync(
    'src/modules/assignments/domain/entities/project-assignment.entity.ts',
    'utf-8',
  );
  const repoSrc = readFileSync(
    'src/modules/assignments/infrastructure/repositories/prisma/prisma-project-assignment.repository.ts',
    'utf-8',
  );
  const transitionSrc = readFileSync(
    'src/modules/assignments/application/transition-project-assignment.service.ts',
    'utf-8',
  );
  const createSrc = readFileSync(
    'src/modules/assignments/application/create-project-assignment.service.ts',
    'utf-8',
  );

  it('entity: ProjectAssignmentProps includes updatedByPersonId + getter + setter', () => {
    expect(entitySrc).toMatch(/updatedByPersonId\?:\s*string/);
    expect(entitySrc).toMatch(/public get updatedByPersonId\(\):\s*string\s*\|\s*undefined/);
    expect(entitySrc).toMatch(/public setUpdatedBy\(actorId:\s*string\s*\|\s*undefined\):\s*void/);
  });

  it('repository.save: create branch populates BOTH actor-audit cols', () => {
    const section = repoSrc.slice(repoSrc.indexOf('public async save'), repoSrc.length);
    const createBranch = section.slice(0, section.indexOf('const nextVersion'));
    expect(createBranch).toMatch(/createdByPersonId:\s*aggregate\.createdByPersonId/);
    expect(createBranch).toMatch(/updatedByPersonId:\s*aggregate\.updatedByPersonId/);
  });

  it('repository.save: update branch populates updatedByPersonId from aggregate', () => {
    const section = repoSrc.slice(repoSrc.indexOf('const nextVersion'), repoSrc.length);
    expect(section).toMatch(/updatedByPersonId:\s*aggregate\.updatedByPersonId\s*\?\?\s*null/);
  });

  it('transition service: calls setUpdatedBy before save + stamps on bill-rate pin', () => {
    expect(transitionSrc).toMatch(/assignment\.setUpdatedBy\(command\.actorId\)/);
    // Bill-rate pin update also stamps the actor.
    const billRateSection = transitionSrc.slice(
      transitionSrc.indexOf('appliedRateCardEntryId: verdict.entryId'),
      transitionSrc.length,
    );
    expect(billRateSection).toMatch(/updatedByPersonId:\s*command\.actorId\s*\?\?\s*null/);
  });

  it('create service: aggregate gets updatedByPersonId on initial create', () => {
    const section = createSrc.slice(
      createSrc.indexOf('ProjectAssignment.create'),
      createSrc.indexOf('AssignmentApproval.create'),
    );
    expect(section).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });
});
