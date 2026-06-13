import { StaffingDeskService } from '@src/modules/staffing-desk/application/staffing-desk.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Regression: open-demand positions migrated from requester-less StaffingRequests
 * carry requestedByPersonId = null. fetchRequests coerces that to '' and the desk
 * collected it into the person-lookup set, so fetchLookups issued
 * person.findMany({ where: { id: { in: [..., ''] } } }) — Prisma rejected the empty
 * string with "Error creating UUID, invalid length: found 0" and 500'd the entire
 * /api/staffing-desk surface (observed live on v2 staging 2026-06-13).
 *
 * This test captures every person/personSkill lookup call and asserts no empty
 * string ever reaches a uuid `in` filter, while the desk still returns the row.
 */
describe('StaffingDeskService — empty requestedByPersonId never reaches a uuid filter', () => {
  function makePrisma(captured: { personIdIns: unknown[][] }): PrismaService {
    const REQUEST_POSITION = {
      id: 'bbbb0001-0000-0000-0000-000000000001',
      projectId: 'cccc0001-0000-0000-0000-000000000001',
      requestedByPersonId: null, // requester-less open-demand position — the trigger
      role: 'Engineer',
      skills: [] as string[],
      summary: null,
      requiredAllocationPercent: 80,
      priority: 'MEDIUM',
      fillStatus: 'OPEN',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-31'),
      createdAt: new Date('2026-06-01'),
      legacyStaffingRequestId: null,
      activePersonId: null,
    };

    const projectPosition = {
      findMany: async (args: { select?: Record<string, unknown> }) => {
        // The requests query is the one selecting requestedByPersonId.
        if (args?.select && 'requestedByPersonId' in args.select) return [REQUEST_POSITION];
        return [];
      },
      count: async () => 0,
      groupBy: async () => [] as unknown[],
    };

    const person = {
      findMany: async (args: { where?: { id?: { in?: unknown[] } } }) => {
        if (args?.where?.id?.in) captured.personIdIns.push(args.where.id.in);
        return [];
      },
    };

    const empty = { findMany: async () => [] };

    return {
      projectPosition,
      person,
      project: empty,
      personSkill: empty,
      personResourcePoolMembership: empty,
      personOrgMembership: empty,
      reportingLine: empty,
    } as unknown as PrismaService;
  }

  it('resolves the desk and passes no empty string into person.findMany id filter', async () => {
    const captured = { personIdIns: [] as unknown[][] };
    const service = new StaffingDeskService(makePrisma(captured));

    const res = await service.query({ kind: 'request' } as never);

    // Desk renders the open-demand row (did not 500).
    expect(res.items.length).toBe(1);
    expect(res.items[0].personName ?? null).toBeNull();

    // Every person lookup id-filter is free of empty strings.
    expect(captured.personIdIns.length).toBeGreaterThan(0);
    for (const arr of captured.personIdIns) {
      expect(arr).not.toContain('');
      for (const id of arr) expect(typeof id === 'string' && id.length > 0).toBe(true);
    }
  });
});
