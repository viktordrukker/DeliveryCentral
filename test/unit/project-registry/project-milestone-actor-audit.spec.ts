/**
 * F-115 / D-103-write-path round 25 — ProjectMilestone actor-audit.
 * Source-shape assertions across service + controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectMilestone actor-audit (source-shape)', () => {
  const serviceSrc = readFileSync(
    'src/modules/project-registry/application/project-milestone.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/project-registry/presentation/milestone.controller.ts',
    'utf-8',
  );

  it('service.create: accepts actorId, data block sets both cols', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async create'),
      serviceSrc.indexOf('public async update'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('service.update: accepts actorId, data block sets updatedByPersonId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async update'),
      serviceSrc.indexOf('public async remove'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('controller.create + update: resolve actorId from @Req principal and pass through', () => {
    const createSection = controllerSrc.slice(
      controllerSrc.indexOf('public async create'),
      controllerSrc.indexOf('public async update'),
    );
    expect(createSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(createSection).toMatch(/this\.service\.create\(projectId,\s*dto,\s*actorId\)/);
    const updateSection = controllerSrc.slice(
      controllerSrc.indexOf('public async update'),
      controllerSrc.indexOf('public async remove'),
    );
    expect(updateSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(updateSection).toMatch(/this\.service\.update\(milestoneId,\s*dto,\s*actorId\)/);
  });
});
