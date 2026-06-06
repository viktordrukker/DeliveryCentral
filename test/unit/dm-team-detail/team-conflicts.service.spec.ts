import { BadRequestException } from '@nestjs/common';

import { TeamConflictsService } from '@src/modules/dm-team-detail/application/team-conflicts.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePosition {
  id: string;
  projectId: string;
  projectCode: string;
  deliveryManagerId: string | null;
  activePersonId: string | null;
  activePersonName: string;
  activeAllocationPercent: number | null;
  activeValidFrom: Date | null;
  activeValidTo: Date | null;
  fillStatus: string;
}

function buildPrisma(positions: FakePosition[]): PrismaService {
  const projectPosition = {
    findMany: async (q: {
      where: {
        fillStatus?: { in: string[] };
        activePersonId?: { not: null };
        project?: { deliveryManagerId?: string };
      };
    }): Promise<unknown[]> => {
      const dmFilter = q.where.project?.deliveryManagerId;
      const statuses = q.where.fillStatus?.in ?? null;
      return positions
        .filter((p) => (dmFilter ? p.deliveryManagerId === dmFilter : true))
        .filter((p) => (statuses ? statuses.includes(p.fillStatus) : true))
        .filter((p) => p.activePersonId !== null)
        .map((p) => ({
          id: p.id,
          projectId: p.projectId,
          activePersonId: p.activePersonId,
          activeAllocationPercent: p.activeAllocationPercent,
          activeValidFrom: p.activeValidFrom,
          activeValidTo: p.activeValidTo,
          fillStatus: p.fillStatus,
          project: { id: p.projectId, projectCode: p.projectCode },
          activePerson: p.activePersonId
            ? { id: p.activePersonId, displayName: p.activePersonName }
            : null,
        }));
    },
  };
  return { projectPosition } as unknown as PrismaService;
}

/** UTC monday for a given calendar date — keeps test seeds deterministic. */
function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe('TeamConflictsService (LEAN-P4-missing-8)', () => {
  // 2026-06-08 is a Monday — convenient anchor for the 4-week window.
  const asOf = utcDate('2026-06-10');
  const dmId = 'dm-1';

  it('detects a 150% allocation in a single week (100% + 50% overlap)', async () => {
    const prisma = buildPrisma([
      {
        id: 'pos-x',
        projectId: 'proj-a',
        projectCode: 'A',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 100,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
      {
        id: 'pos-y',
        projectId: 'proj-b',
        projectCode: 'B',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 50,
        activeValidFrom: utcDate('2026-05-15'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
    ]);

    const svc = new TeamConflictsService(prisma);
    const result = await svc.execute({ deliveryManagerPersonId: dmId, asOf });

    // 4 weekly buckets, all over 100%.
    expect(result.conflicts.length).toBe(4);
    for (const c of result.conflicts) {
      expect(c.personId).toBe('person-1');
      expect(c.personName).toBe('Alice Acker');
      expect(c.totalAllocationPct).toBe(150);
      expect(c.conflictPositions.map((p) => p.positionId).sort()).toEqual([
        'pos-x',
        'pos-y',
      ]);
      // Sorted descending by allocation.
      expect(c.conflictPositions[0].allocationPct).toBe(100);
      expect(c.conflictPositions[1].allocationPct).toBe(50);
    }
  });

  it('skips people who are not in any project owned by the DM', async () => {
    const prisma = buildPrisma([
      {
        id: 'pos-other',
        projectId: 'proj-c',
        projectCode: 'C',
        deliveryManagerId: 'dm-other',
        activePersonId: 'person-2',
        activePersonName: 'Bob Bee',
        activeAllocationPercent: 200,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
      {
        id: 'pos-also-other',
        projectId: 'proj-c',
        projectCode: 'C',
        deliveryManagerId: 'dm-other',
        activePersonId: 'person-2',
        activePersonName: 'Bob Bee',
        activeAllocationPercent: 150,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
    ]);

    const svc = new TeamConflictsService(prisma);
    const result = await svc.execute({ deliveryManagerPersonId: dmId, asOf });

    expect(result.conflicts).toEqual([]);
  });

  it('does not flag a person at exactly 100%', async () => {
    const prisma = buildPrisma([
      {
        id: 'pos-1',
        projectId: 'proj-a',
        projectCode: 'A',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 60,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
      {
        id: 'pos-2',
        projectId: 'proj-b',
        projectCode: 'B',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 40,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
    ]);

    const svc = new TeamConflictsService(prisma);
    const result = await svc.execute({ deliveryManagerPersonId: dmId, asOf });

    expect(result.conflicts).toEqual([]);
  });

  it('only flags weeks where intervals actually overlap', async () => {
    // 100% only week 1; 50% only week 4. Never overlapping → no conflict.
    const prisma = buildPrisma([
      {
        id: 'pos-week1',
        projectId: 'proj-a',
        projectCode: 'A',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 100,
        activeValidFrom: utcDate('2026-06-08'),
        activeValidTo: utcDate('2026-06-14'),
        fillStatus: 'ASSIGNED',
      },
      {
        id: 'pos-week4',
        projectId: 'proj-b',
        projectCode: 'B',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 50,
        activeValidFrom: utcDate('2026-06-29'),
        activeValidTo: utcDate('2026-07-05'),
        fillStatus: 'ASSIGNED',
      },
    ]);

    const svc = new TeamConflictsService(prisma);
    const result = await svc.execute({ deliveryManagerPersonId: dmId, asOf });

    expect(result.conflicts).toEqual([]);
  });

  it('skips RELEASED positions even when allocations would breach 100%', async () => {
    const prisma = buildPrisma([
      {
        id: 'pos-active',
        projectId: 'proj-a',
        projectCode: 'A',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 80,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'ASSIGNED',
      },
      {
        id: 'pos-released',
        projectId: 'proj-b',
        projectCode: 'B',
        deliveryManagerId: dmId,
        activePersonId: 'person-1',
        activePersonName: 'Alice Acker',
        activeAllocationPercent: 50,
        activeValidFrom: utcDate('2026-05-01'),
        activeValidTo: utcDate('2026-12-31'),
        fillStatus: 'RELEASED',
      },
    ]);

    const svc = new TeamConflictsService(prisma);
    const result = await svc.execute({ deliveryManagerPersonId: dmId, asOf });

    expect(result.conflicts).toEqual([]);
  });

  it('rejects an empty principal personId', async () => {
    const svc = new TeamConflictsService(buildPrisma([]));
    await expect(
      svc.execute({ deliveryManagerPersonId: '', asOf }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
