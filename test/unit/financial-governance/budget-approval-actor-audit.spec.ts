/**
 * F-108 / D-103-write-path round 18 — BudgetApproval actor-audit.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — BudgetApproval actor-audit (source-shape)', () => {
  const requestSrc = readFileSync(
    'src/modules/financial-governance/application/request-budget-change.service.ts',
    'utf-8',
  );
  const decideSrc = readFileSync(
    'src/modules/financial-governance/application/decide-budget-change.service.ts',
    'utf-8',
  );

  it('request: create data block sets createdByPersonId + updatedByPersonId = actorId', () => {
    const section = requestSrc.slice(
      requestSrc.indexOf('budgetApproval.create'),
      requestSrc.indexOf('budgetApproval.create') + 800,
    );
    expect(section).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('decide: update data block sets updatedByPersonId = actorId', () => {
    const section = decideSrc.slice(
      decideSrc.indexOf('budgetApproval.update'),
      decideSrc.indexOf('budgetApproval.update') + 500,
    );
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });
});
