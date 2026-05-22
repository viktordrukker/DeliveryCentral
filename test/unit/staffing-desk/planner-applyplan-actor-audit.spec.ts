/**
 * F-129 / D-103-write-path round 39 — workforce-planner.applyPlan +
 * proposal-slate.submit actor-audit gaps.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — Planner applyPlan + submit gaps (source-shape)', () => {
  const plannerSrc = readFileSync(
    'src/modules/staffing-desk/application/workforce-planner.service.ts',
    'utf-8',
  );
  const slateSrc = readFileSync(
    'src/modules/staffing-requests/application/staffing-proposal-slate.service.ts',
    'utf-8',
  );

  it('proposal-slate.submit: tx SR.update sets updatedByPersonId from input.actorId', () => {
    const section = slateSrc.slice(
      slateSrc.indexOf('public async submit'),
      slateSrc.indexOf('public async acknowledge'),
    );
    expect(section).toMatch(/tx\.staffingRequest\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*input\.actorId/);
  });

  it('planner.applyPlan dispatch create: ProjectAssignment.create populates both cols from request.actorId', () => {
    const section = plannerSrc.slice(
      plannerSrc.indexOf('Create assignments for dispatches'),
      plannerSrc.indexOf('Create staffing requests for hires'),
    );
    expect(section).toMatch(/createdByPersonId:\s*request\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*request\.actorId/);
  });

  it('planner.applyPlan extension update: ProjectAssignment.update sets updatedByPersonId from request.actorId', () => {
    const section = plannerSrc.slice(
      plannerSrc.indexOf('Apply extensions'),
      plannerSrc.length,
    );
    expect(section).toMatch(/projectAssignment\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*request\.actorId/);
  });
});
