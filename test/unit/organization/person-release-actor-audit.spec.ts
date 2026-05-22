/**
 * F-110 / D-103-write-path round 20 — PersonReleaseRequest +
 * PersonReleaseApproval actor-audit.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — PersonRelease actor-audit (source-shape)', () => {
  const openSrc = readFileSync(
    'src/modules/organization/application/open-person-release-request.service.ts',
    'utf-8',
  );
  const decideSrc = readFileSync(
    'src/modules/organization/application/decide-person-release.service.ts',
    'utf-8',
  );

  it('open: personReleaseRequest.create sets createdByPersonId + updatedByPersonId', () => {
    const section = openSrc.slice(
      openSrc.indexOf('personReleaseRequest.create'),
      openSrc.indexOf('personReleaseRequest.create') + 800,
    );
    expect(section).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('decide: personReleaseApproval.create sets createdByPersonId + updatedByPersonId', () => {
    const section = decideSrc.slice(
      decideSrc.indexOf('personReleaseApproval.create'),
      decideSrc.indexOf('personReleaseApproval.create') + 800,
    );
    expect(section).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('decide: personReleaseRequest.update sets updatedByPersonId', () => {
    const section = decideSrc.slice(
      decideSrc.indexOf('personReleaseRequest.update'),
      decideSrc.indexOf('personReleaseRequest.update') + 500,
    );
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });
});
