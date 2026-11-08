import { PersonProfileService } from '@src/modules/dashboard/application/person-profile.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function buildStub(personId: string, costRate: number | null): PrismaService {
  const empty = async () => [];
  const person = {
    findUnique: async (q: { where: { id: string } }) =>
      q.where.id === personId
        ? {
            id: personId,
            displayName: 'Subject',
            givenName: 'Sub',
            familyName: 'Ject',
            primaryEmail: 's@x.com',
            role: 'PM',
            grade: 'L5',
            location: null,
            timezone: null,
            employmentStatus: 'ACTIVE',
            hiredAt: new Date('2026-01-01'),
          }
        : null,
  };
  const personCostRate = {
    findFirst: async () => (costRate === null ? null : { hourlyRate: costRate }),
  };
  return {
    person,
    personCostRate,
    // SoT PR 14b — person-profile assignments now read from the canonical
    // ProjectPosition aggregate, not legacy ProjectAssignment.
    projectPosition: { findMany: empty },
    timesheetWeek: { findMany: empty },
    leaveRequest: { findMany: empty },
    leaveBalance: { findMany: empty },
    reportingLine: { findFirst: async () => null },
    personSkill: { findMany: empty },
    personResourcePoolMembership: { findMany: empty },
  } as unknown as PrismaService;
}

describe('PersonProfileService.getProfile redaction (FE-#262)', () => {
  it('throws when person not found', async () => {
    const svc = new PersonProfileService(buildStub('other', 50));
    await expect(
      svc.getProfile('missing', { callerPersonId: 'admin', callerRoles: ['admin'] }),
    ).rejects.toThrow(/not found/);
  });

  it('OMITS costRate field for non-privileged caller', async () => {
    const svc = new PersonProfileService(buildStub('p1', 75));
    const profile = await svc.getProfile('p1', {
      callerPersonId: 'other-employee',
      callerRoles: ['employee'],
    });
    expect('costRate' in profile).toBe(false);
  });

  it('INCLUDES costRate when caller is the subject', async () => {
    const svc = new PersonProfileService(buildStub('p1', 75));
    const profile = await svc.getProfile('p1', {
      callerPersonId: 'p1',
      callerRoles: ['employee'],
    });
    expect(profile.costRate).toBe(75);
  });

  it('INCLUDES costRate when caller has hr_manager role', async () => {
    const svc = new PersonProfileService(buildStub('p1', 100));
    const profile = await svc.getProfile('p1', {
      callerPersonId: 'hr1',
      callerRoles: ['hr_manager'],
    });
    expect(profile.costRate).toBe(100);
  });

  it('INCLUDES costRate when caller has director role', async () => {
    const svc = new PersonProfileService(buildStub('p1', 200));
    const profile = await svc.getProfile('p1', {
      callerPersonId: 'dir1',
      callerRoles: ['director'],
    });
    expect(profile.costRate).toBe(200);
  });

  it('OMITS costRate when no rate exists for the person', async () => {
    const svc = new PersonProfileService(buildStub('p1', null));
    const profile = await svc.getProfile('p1', {
      callerPersonId: 'p1',
      callerRoles: ['employee'],
    });
    expect('costRate' in profile).toBe(false);
  });
});
