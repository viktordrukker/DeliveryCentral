/**
 * F-109 / D-103-write-path round 19 — ProjectActivationApproval actor-audit.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectActivationApproval actor-audit (source-shape)', () => {
  const submitSrc = readFileSync(
    'src/modules/project-registry/application/submit-project-for-approval.service.ts',
    'utf-8',
  );
  const decideSrc = readFileSync(
    'src/modules/project-registry/application/decide-project-activation.service.ts',
    'utf-8',
  );

  it('submit: create data block sets createdByPersonId + updatedByPersonId = actorId', () => {
    const section = submitSrc.slice(
      submitSrc.indexOf('projectActivationApproval.create'),
      submitSrc.indexOf('projectActivationApproval.create') + 700,
    );
    expect(section).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('decide: update data block sets updatedByPersonId = actorId', () => {
    const section = decideSrc.slice(
      decideSrc.indexOf('projectActivationApproval.update'),
      decideSrc.indexOf('projectActivationApproval.update') + 500,
    );
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });
});
