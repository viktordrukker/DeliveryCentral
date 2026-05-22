/**
 * F-122 / D-103-write-path round 32 — StaffingRequestProposalSlate +
 * StaffingRequestProposalCandidate + duplicate-SR actor-audit.
 * Source-shape assertions across slate repo + service + controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — Proposal slate/candidate actor-audit (source-shape)', () => {
  const repoSrc = readFileSync(
    'src/modules/staffing-requests/infrastructure/repositories/prisma/prisma-staffing-request-proposal-slate.repository.ts',
    'utf-8',
  );
  const serviceSrc = readFileSync(
    'src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/staffing-requests/presentation/staffing-requests.controller.ts',
    'utf-8',
  );

  it('slate repo: slatePayload sets both actor cols from proposedByPersonId', () => {
    const section = repoSrc.slice(repoSrc.indexOf('const slatePayload'), repoSrc.indexOf('withinTx'));
    expect(section).toMatch(/createdByPersonId:\s*slate\.proposedByPersonId/);
    expect(section).toMatch(/updatedByPersonId:\s*slate\.proposedByPersonId/);
  });

  it('slate repo: candidate upsert create + update branches populate actor cols', () => {
    const section = repoSrc.slice(
      repoSrc.indexOf('for (const candidate of slate.candidates)'),
      repoSrc.length,
    );
    expect(section).toMatch(/createdByPersonId:\s*slate\.proposedByPersonId/);
    const updatedMatches = section.match(/updatedByPersonId:\s*slate\.proposedByPersonId/g);
    expect(updatedMatches?.length).toBe(2);
  });

  it('cancel SR with open slate: candidate.updateMany + slate.update stamp actorId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async cancel'),
      serviceSrc.indexOf('public async update'),
    );
    expect(section).toMatch(/staffingRequestProposalCandidate\.updateMany/);
    expect(section).toMatch(/staffingRequestProposalSlate\.update/);
    const stamps = section.match(/updatedByPersonId:\s*actorId\s*\?\?\s*null/g);
    expect((stamps?.length ?? 0)).toBeGreaterThanOrEqual(2);
  });

  it('duplicate SR: data block populates both actor cols (fallback to original requester)', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async duplicate'),
      serviceSrc.indexOf('public async cancel'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*source\.requestedByPersonId/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*source\.requestedByPersonId/);
  });

  it('controller duplicate: resolves actor from @Req and passes to service.duplicate', () => {
    const section = controllerSrc.slice(
      controllerSrc.indexOf("@Post(':id/duplicate')"),
      controllerSrc.length,
    );
    expect(section).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(section).toMatch(/this\.service\.duplicate\(id,\s*actorId\)/);
  });
});
