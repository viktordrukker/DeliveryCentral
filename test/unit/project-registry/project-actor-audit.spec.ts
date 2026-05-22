/**
 * F-126 / D-103-write-path round 36 — Project entity actor-audit
 * (mirrors the F-91 + F-118 ProjectAssignment pattern).
 * Covers entity + repo save + create service + update service.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — Project actor-audit (source-shape)', () => {
  const entitySrc = readFileSync(
    'src/modules/project-registry/domain/entities/project.entity.ts',
    'utf-8',
  );
  const repoSrc = readFileSync(
    'src/modules/project-registry/infrastructure/repositories/prisma/prisma-project.repository.ts',
    'utf-8',
  );
  const createSrc = readFileSync(
    'src/modules/project-registry/application/create-project.service.ts',
    'utf-8',
  );
  const updateSrc = readFileSync(
    'src/modules/project-registry/application/update-project.service.ts',
    'utf-8',
  );

  it('entity: ProjectProps gains both cols + getters + setUpdatedBy', () => {
    expect(entitySrc).toMatch(/createdByPersonId\?:\s*string/);
    expect(entitySrc).toMatch(/updatedByPersonId\?:\s*string/);
    expect(entitySrc).toMatch(/public get createdByPersonId\(\):\s*string\s*\|\s*undefined/);
    expect(entitySrc).toMatch(/public get updatedByPersonId\(\):\s*string\s*\|\s*undefined/);
    expect(entitySrc).toMatch(/public setUpdatedBy\(actorId:\s*string\s*\|\s*undefined\):\s*void/);
  });

  it('repository.save: create branch populates both cols, update branch populates updatedByPersonId', () => {
    const section = repoSrc.slice(repoSrc.indexOf('public async save'), repoSrc.length);
    const createBranch = section.slice(0, section.indexOf('const nextVersion'));
    expect(createBranch).toMatch(/createdByPersonId:\s*aggregate\.createdByPersonId/);
    expect(createBranch).toMatch(/updatedByPersonId:\s*aggregate\.updatedByPersonId/);
    const updateBranch = section.slice(section.indexOf('const nextVersion'), section.length);
    expect(updateBranch).toMatch(/updatedByPersonId:\s*aggregate\.updatedByPersonId\s*\?\?\s*null/);
  });

  it('create service: input.actorId flows into Project.create both cols', () => {
    expect(createSrc).toMatch(/actorId\?:\s*string/);
    const section = createSrc.slice(
      createSrc.indexOf('const project = Project.create'),
      createSrc.indexOf('this.projectRepository.save'),
    );
    expect(section).toMatch(/createdByPersonId:\s*input\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*input\.actorId/);
  });

  it('update service: calls setUpdatedBy before save + stamps manager-reassignment update', () => {
    expect(updateSrc).toMatch(/project\.setUpdatedBy\(actor\?\.personId\)/);
    const reassign = updateSrc.slice(
      updateSrc.indexOf('this.prisma.project.update'),
      updateSrc.length,
    );
    expect(reassign).toMatch(/updatedByPersonId:\s*actor\?\.personId\s*\?\?\s*null/);
  });
});
