/**
 * F-112 / D-103-write-path round 22 — LeaveRequest actor-audit.
 * Source-shape assertions across port + Prisma adapter + service.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — LeaveRequest actor-audit (source-shape)', () => {
  const portSrc = readFileSync(
    'src/modules/leave-requests/domain/repositories/leave-request-repository.port.ts',
    'utf-8',
  );
  const repoSrc = readFileSync(
    'src/modules/leave-requests/infrastructure/repositories/prisma/prisma-leave-request.repository.ts',
    'utf-8',
  );
  const serviceSrc = readFileSync(
    'src/modules/leave-requests/application/leave-requests.service.ts',
    'utf-8',
  );

  it('port: CreateLeaveRequestRowInput + UpdateLeaveRequestStatusInput accept optional actorId', () => {
    const createSection = portSrc.slice(
      portSrc.indexOf('CreateLeaveRequestRowInput'),
      portSrc.indexOf('UpdateLeaveRequestStatusInput'),
    );
    expect(createSection).toMatch(/actorId\?:\s*string/);
    const updateSection = portSrc.slice(
      portSrc.indexOf('UpdateLeaveRequestStatusInput'),
      portSrc.indexOf('FindLeaveRequestsFilter'),
    );
    expect(updateSection).toMatch(/actorId\?:\s*string/);
  });

  it('Prisma adapter create: data block sets createdByPersonId + updatedByPersonId from actorId', () => {
    const createSection = repoSrc.slice(
      repoSrc.indexOf('public async create'),
      repoSrc.indexOf('public async findById'),
    );
    expect(createSection).toMatch(/createdByPersonId:\s*input\.actorId\s*\?\?\s*null/);
    expect(createSection).toMatch(/updatedByPersonId:\s*input\.actorId\s*\?\?\s*null/);
  });

  it('Prisma adapter updateStatus: data block sets updatedByPersonId (fallback to reviewedBy)', () => {
    const updateSection = repoSrc.slice(repoSrc.indexOf('public async updateStatus'), repoSrc.length);
    expect(updateSection).toMatch(
      /updatedByPersonId:\s*input\.actorId\s*\?\?\s*input\.reviewedBy\s*\?\?\s*null/,
    );
  });

  it('service.create: passes actorId defaulting to subject personId', () => {
    const createSection = serviceSrc.slice(
      serviceSrc.indexOf('public async create'),
      serviceSrc.indexOf('public async findMy'),
    );
    expect(createSection).toMatch(/actorId:\s*dto\.actorId\s*\?\?\s*dto\.personId/);
  });

  it('service.approve + service.reject: pass actorId = reviewerId', () => {
    const approveSection = serviceSrc.slice(
      serviceSrc.indexOf('public async approve'),
      serviceSrc.indexOf('public async reject'),
    );
    expect(approveSection).toMatch(/actorId:\s*reviewerId/);
    const rejectSection = serviceSrc.slice(
      serviceSrc.indexOf('public async reject'),
      serviceSrc.indexOf('private toDto'),
    );
    expect(rejectSection).toMatch(/actorId:\s*reviewerId/);
  });
});
