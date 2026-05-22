/**
 * F-114 / D-103-write-path round 24 — ProjectRolePlan actor-audit.
 * Source-shape assertions across service + controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectRolePlan actor-audit (source-shape)', () => {
  const serviceSrc = readFileSync(
    'src/modules/project-registry/application/project-role-plan.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/project-registry/presentation/role-plan.controller.ts',
    'utf-8',
  );

  it('service signatures: getRolePlan + initializeFromAssignments + upsertRolePlan all accept actorId', () => {
    expect(serviceSrc).toMatch(/getRolePlan\(projectId:\s*string,\s*actorId\?:\s*string\)/);
    expect(serviceSrc).toMatch(/initializeFromAssignments\(projectId:\s*string,\s*actorId\?:\s*string\)/);
    expect(serviceSrc).toMatch(
      /upsertRolePlan\(\s*projectId:\s*string,\s*entries:\s*UpsertRolePlanEntryDto\[\],\s*\/\/[^\n]*\n\s*actorId\?:\s*string,/,
    );
  });

  it('initializeFromAssignments: derived create populates both cols from actorId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('initializeFromAssignments'),
      serviceSrc.indexOf('public async upsertRolePlan'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('upsertRolePlan create branch: data block populates both cols from actorId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async upsertRolePlan'),
      serviceSrc.indexOf('public async deleteRolePlanEntry'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    // updatedByPersonId appears in BOTH branches (update + create)
    const updates = section.match(/updatedByPersonId:\s*actorId\s*\?\?\s*null/g);
    expect(updates?.length).toBe(2);
  });

  it('controller: getRolePlan + upsertRolePlan resolve actorId from @Req principal', () => {
    const getSection = controllerSrc.slice(
      controllerSrc.indexOf('public async getRolePlan'),
      controllerSrc.indexOf('public async upsertRolePlan'),
    );
    expect(getSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(getSection).toMatch(/this\.rolePlanService\.getRolePlan\(projectId,\s*actorId\)/);
    const upsertSection = controllerSrc.slice(
      controllerSrc.indexOf('public async upsertRolePlan'),
      controllerSrc.indexOf('public async deleteEntry'),
    );
    expect(upsertSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(upsertSection).toMatch(/this\.rolePlanService\.upsertRolePlan\(projectId,\s*entries,\s*actorId\)/);
  });
});
