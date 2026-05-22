/**
 * F-123 / D-103-write-path round 33 — ProjectRisk actor-audit across 6
 * mutation paths (create + update + markReviewed + convertToIssue +
 * resolve + close).
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectRisk actor-audit (source-shape)', () => {
  const serviceSrc = readFileSync(
    'src/modules/project-registry/application/project-risk.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/project-registry/presentation/risk.controller.ts',
    'utf-8',
  );

  it('service.create: data block populates both cols from actorId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async create'),
      serviceSrc.indexOf('public async update'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('service.update: data block populates updatedByPersonId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async update'),
      serviceSrc.indexOf('public async markReviewed'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('service.markReviewed + resolve + close: update data populates updatedByPersonId', () => {
    const mr = serviceSrc.slice(
      serviceSrc.indexOf('public async markReviewed'),
      serviceSrc.indexOf('public async list'),
    );
    expect(mr).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
    const resolve = serviceSrc.slice(
      serviceSrc.indexOf('public async resolve'),
      serviceSrc.indexOf('public async close'),
    );
    expect(resolve).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
    const close = serviceSrc.slice(
      serviceSrc.indexOf('public async close'),
      serviceSrc.indexOf('public async getRiskMatrix'),
    );
    expect(close).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('service.convertToIssue: new issue create has BOTH cols, original update has updatedByPersonId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async convertToIssue'),
      serviceSrc.indexOf('public async resolve'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    const updated = section.match(/updatedByPersonId:\s*actorId\s*\?\?\s*null/g);
    expect(updated?.length).toBe(2);
  });

  it('controller: all 5 mutation endpoints resolve actor from @Req and pass through', () => {
    expect(controllerSrc).toMatch(/this\.riskService\.create\(projectId,\s*dto,\s*actorId\)/);
    expect(controllerSrc).toMatch(/this\.riskService\.update\(riskId,\s*dto,\s*actorId\)/);
    expect(controllerSrc).toMatch(/this\.riskService\.convertToIssue\(riskId,\s*dto\.assigneePersonId,\s*actorId\)/);
    expect(controllerSrc).toMatch(/this\.riskService\.resolve\(riskId,\s*actorId\)/);
    expect(controllerSrc).toMatch(/this\.riskService\.close\(riskId,\s*actorId\)/);
    const principalMatches = controllerSrc.match(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/g);
    expect((principalMatches?.length ?? 0)).toBeGreaterThanOrEqual(5);
  });
});
