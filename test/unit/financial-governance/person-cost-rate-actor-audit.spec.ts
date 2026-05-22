/**
 * F-124 / D-103-write-path round 34 — PersonCostRate actor-audit.
 * Immutable row: only createdByPersonId is populated.
 * Source-shape assertions across repo + service + controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — PersonCostRate actor-audit (source-shape)', () => {
  const repoSrc = readFileSync(
    'src/modules/financial-governance/infrastructure/financial.repository.ts',
    'utf-8',
  );
  const serviceSrc = readFileSync(
    'src/modules/financial-governance/application/financial.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/financial-governance/presentation/budget.controller.ts',
    'utf-8',
  );

  it('repo.createPersonCostRate: input gains actorId, create data populates createdByPersonId', () => {
    const section = repoSrc.slice(
      repoSrc.indexOf('public async createPersonCostRate'),
      repoSrc.indexOf('public async findEffectiveCostRates'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('service.createPersonCostRate: accepts actorId and forwards to repo', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async createPersonCostRate'),
      serviceSrc.indexOf('getProjectBudgetDashboard'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/actorId,/);
  });

  it('controller.setCostRate: resolves actor from @Req and threads to service', () => {
    const section = controllerSrc.slice(
      controllerSrc.indexOf('public async setCostRate'),
      controllerSrc.length,
    );
    expect(section).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(section).toMatch(/this\.service\.createPersonCostRate\(personId,\s*dto,\s*actorId\)/);
  });
});
