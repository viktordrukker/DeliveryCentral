/**
 * F-128 / D-103-write-path round 38 — StaffingRequest write-path
 * coverage for the remaining 3 SR mutation sites that previously
 * left `updatedByPersonId` NULL despite having `actorId` in scope.
 * Covers acknowledge / pickCandidate / rejectAll plus the two auto-
 * generation create paths (generate-from-plan + workforce-planner.applyPlan).
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — StaffingRequest update gaps (source-shape)', () => {
  const slateSrc = readFileSync(
    'src/modules/staffing-requests/application/staffing-proposal-slate.service.ts',
    'utf-8',
  );
  const generateSrc = readFileSync(
    'src/modules/project-registry/application/generate-staffing-requests-from-plan.service.ts',
    'utf-8',
  );
  const plannerSrc = readFileSync(
    'src/modules/staffing-desk/application/workforce-planner.service.ts',
    'utf-8',
  );

  it('acknowledge: SR.update sets updatedByPersonId from input.actorId', () => {
    const section = slateSrc.slice(
      slateSrc.indexOf('public async acknowledge'),
      slateSrc.indexOf('public async pickCandidate'),
    );
    expect(section).toMatch(/this\.prisma\.staffingRequest\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*input\.actorId/);
  });

  it('pickCandidate: tx SR.update inside $transaction sets updatedByPersonId from input.actorId', () => {
    const section = slateSrc.slice(
      slateSrc.indexOf('public async pickCandidate'),
      slateSrc.indexOf('public async rejectAll'),
    );
    expect(section).toMatch(/tx\.staffingRequest\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*input\.actorId/);
  });

  it('rejectAll: tx SR.update inside $transaction sets updatedByPersonId from input.actorId', () => {
    const section = slateSrc.slice(slateSrc.indexOf('public async rejectAll'), slateSrc.length);
    expect(section).toMatch(/tx\.staffingRequest\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*input\.actorId/);
  });

  it('generate-staffing-requests-from-plan: SR.create populates both cols from requestedByPersonId', () => {
    expect(generateSrc).toMatch(/createdByPersonId:\s*requestedByPersonId/);
    expect(generateSrc).toMatch(/updatedByPersonId:\s*requestedByPersonId/);
  });

  it('workforce-planner.applyPlan hire create: SR.create populates both cols from request.actorId', () => {
    const section = plannerSrc.slice(
      plannerSrc.indexOf('Create staffing requests for hires'),
      plannerSrc.indexOf('Apply extensions'),
    );
    expect(section).toMatch(/createdByPersonId:\s*request\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*request\.actorId/);
  });
});
