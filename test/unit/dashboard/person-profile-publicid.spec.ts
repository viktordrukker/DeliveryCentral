import { PersonProfileService } from '@src/modules/dashboard/application/person-profile.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Regression: GET /api/people/:id/profile 500'd on v2 staging (2026-06-15) for
 * director/hr (the roles allowed past the RBAC guard) because the service ran
 * `prisma.person.findUnique({ where: { id: <publicId> } })` — the controller's
 * ParsePublicIdOrUuid pipe validates but does NOT resolve, so a `usr_…`
 * publicId hit a UUID column and Prisma threw
 * "Error creating UUID, invalid character ... found `u`". The service must
 * resolve publicId → uuid and key every downstream read off the canonical uuid.
 */
describe('PersonProfileService.getProfile — publicId resolution', () => {
  const RESOLVED_UUID = 'bbbb0001-0000-0000-0000-000000000003';

  function buildStub() {
    const findUniqueCalls: Array<{ id?: string; publicId?: string }> = [];
    const assignmentWhere: Array<Record<string, unknown>> = [];
    const empty = async () => [];
    const prisma = {
      person: {
        findUnique: async (q: { where: { id?: string; publicId?: string } }) => {
          findUniqueCalls.push(q.where);
          return {
            id: RESOLVED_UUID,
            displayName: 'Subject',
            givenName: 'Sub',
            familyName: 'Ject',
            primaryEmail: 's@x.com',
            role: 'PM',
            grade: 'L5',
            location: null,
            timezone: null,
            employmentStatus: 'ACTIVE',
            hiredAt: null,
          };
        },
      },
      personCostRate: { findFirst: async () => null },
      projectPosition: {
        findMany: async (q: { where: Record<string, unknown> }) => {
          assignmentWhere.push(q.where);
          return [];
        },
      },
      timesheetWeek: { findMany: empty },
      leaveRequest: { findMany: empty },
      leaveBalance: { findMany: empty },
      reportingLine: { findFirst: async () => null },
      personSkill: { findMany: empty },
      personResourcePoolMembership: { findMany: empty },
    } as unknown as PrismaService;
    return { prisma, findUniqueCalls, assignmentWhere };
  }

  it('resolves a publicId via { publicId } and keys downstream reads off the resolved uuid', async () => {
    const { prisma, findUniqueCalls, assignmentWhere } = buildStub();
    const svc = new PersonProfileService(prisma);
    await svc.getProfile('usr_a444cfe3ab85', { callerPersonId: 'dir1', callerRoles: ['director'] });

    expect(findUniqueCalls[0]).toEqual({ publicId: 'usr_a444cfe3ab85' });
    expect(findUniqueCalls[0].id).toBeUndefined();
    // loadAssignments must use the resolved uuid, never the publicId
    expect(assignmentWhere[0]?.activePersonId).toBe(RESOLVED_UUID);
  });

  it('passes a raw uuid through via { id }', async () => {
    const { prisma, findUniqueCalls } = buildStub();
    const svc = new PersonProfileService(prisma);
    await svc.getProfile(RESOLVED_UUID, { callerPersonId: 'dir1', callerRoles: ['director'] });

    expect(findUniqueCalls[0]).toEqual({ id: RESOLVED_UUID });
    expect(findUniqueCalls[0].publicId).toBeUndefined();
  });
});
