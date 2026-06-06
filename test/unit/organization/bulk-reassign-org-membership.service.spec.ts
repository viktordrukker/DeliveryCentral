import { BadRequestException, NotFoundException } from '@nestjs/common';

import { BulkReassignOrgMembershipService } from '@src/modules/organization/application/bulk-reassign-org-membership.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeMembership {
  id: string;
  personId: string;
  orgUnitId: string;
  isPrimary: boolean;
  validFrom: Date;
  validTo: Date | null;
  archivedAt: Date | null;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

interface FakeOrgUnit {
  id: string;
  name: string;
}

interface FakePerson {
  id: string;
}

const ACTOR = '11111111-1111-1111-1111-111111111111';
const PERSON_A = '22222222-2222-2222-2222-222222222222';
const PERSON_B = '33333333-3333-3333-3333-333333333333';
const FROM_UNIT = '44444444-4444-4444-4444-444444444444';
const TO_UNIT = '55555555-5555-5555-5555-555555555555';

interface FakeStack {
  prisma: PrismaService;
  memberships: FakeMembership[];
  units: FakeOrgUnit[];
  persons: FakePerson[];
}

function buildFakeStack(opts?: { failOnNthCreate?: number }): FakeStack {
  const memberships: FakeMembership[] = [];
  const units: FakeOrgUnit[] = [
    { id: FROM_UNIT, name: 'Frontend Dept' },
    { id: TO_UNIT, name: 'Platform Engineering' },
  ];
  const persons: FakePerson[] = [{ id: PERSON_A }, { id: PERSON_B }];

  let createCount = 0;
  let membershipIdSeq = 1;

  const personOrgMembership = {
    findMany: async (args: {
      where: {
        personId: string;
        archivedAt: null;
        validFrom: { lte: Date };
        OR: Array<{ validTo: null } | { validTo: { gte: Date } }>;
      };
    }): Promise<FakeMembership[]> => {
      const asOf = args.where.validFrom.lte;
      return memberships.filter(
        (m) =>
          m.personId === args.where.personId &&
          m.archivedAt === null &&
          m.validFrom.getTime() <= asOf.getTime() &&
          (m.validTo === null || m.validTo.getTime() >= asOf.getTime()),
      );
    },
    update: async (args: {
      where: { id: string };
      data: Partial<FakeMembership>;
    }): Promise<FakeMembership> => {
      const row = memberships.find((m) => m.id === args.where.id);
      if (!row) throw new Error('membership not found');
      Object.assign(row, args.data);
      return row;
    },
    create: async (args: {
      data: {
        personId: string;
        orgUnitId: string;
        isPrimary: boolean;
        validFrom: Date;
        createdByPersonId: string | null;
        updatedByPersonId: string | null;
      };
      select?: { id: true };
    }): Promise<{ id: string }> => {
      createCount++;
      if (opts?.failOnNthCreate && createCount === opts.failOnNthCreate) {
        throw new Error('simulated failure');
      }
      const row: FakeMembership = {
        id: `mem-${membershipIdSeq++}`,
        personId: args.data.personId,
        orgUnitId: args.data.orgUnitId,
        isPrimary: args.data.isPrimary,
        validFrom: args.data.validFrom,
        validTo: null,
        archivedAt: null,
        createdByPersonId: args.data.createdByPersonId,
        updatedByPersonId: args.data.updatedByPersonId,
      };
      memberships.push(row);
      return { id: row.id };
    },
  };

  const orgUnit = {
    findUnique: async (args: {
      where: { id: string };
      select: { id: true; name: true };
    }): Promise<FakeOrgUnit | null> =>
      units.find((u) => u.id === args.where.id) ?? null,
  };

  const person = {
    findMany: async (args: {
      where: { id: { in: string[] } };
      select: { id: true };
    }): Promise<FakePerson[]> =>
      persons.filter((p) => args.where.id.in.includes(p.id)),
  };

  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      // Snapshot for rollback simulation. The fake commits to the parent
      // arrays only when the callback resolves; if it throws, restore.
      const snapshotMemberships = memberships.map((m) => ({ ...m }));
      try {
        return await fn({ personOrgMembership });
      } catch (err) {
        memberships.splice(0, memberships.length, ...snapshotMemberships);
        throw err;
      }
    },
    personOrgMembership,
    orgUnit,
    person,
  };

  return {
    prisma: prisma as unknown as PrismaService,
    memberships,
    units,
    persons,
  };
}

describe('BulkReassignOrgMembershipService', () => {
  const effectiveFrom = '2026-07-01';
  const effectiveFromDate = new Date(effectiveFrom);
  const closeAt = new Date(effectiveFromDate.getTime() - 24 * 60 * 60 * 1000);

  it('happy path: closes old memberships and opens new ones', async () => {
    const { prisma, memberships } = buildFakeStack();
    // Seed both persons with active memberships in FROM_UNIT.
    memberships.push(
      {
        id: 'seed-a',
        personId: PERSON_A,
        orgUnitId: FROM_UNIT,
        isPrimary: true,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        archivedAt: null,
        createdByPersonId: null,
        updatedByPersonId: null,
      },
      {
        id: 'seed-b',
        personId: PERSON_B,
        orgUnitId: FROM_UNIT,
        isPrimary: true,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        archivedAt: null,
        createdByPersonId: null,
        updatedByPersonId: null,
      },
    );

    const service = new BulkReassignOrgMembershipService(prisma);
    const result = await service.execute({
      actorId: ACTOR,
      personIds: [PERSON_A, PERSON_B],
      toOrgUnitId: TO_UNIT,
      effectiveFrom,
      reason: 'Org realignment Q3',
    });

    expect(result.movedPersonIds).toEqual([PERSON_A, PERSON_B]);
    expect(result.skippedPersonIds).toEqual([]);
    expect(result.newMembershipIds).toHaveLength(2);

    // Old rows were closed at closeAt.
    const oldA = memberships.find((m) => m.id === 'seed-a')!;
    const oldB = memberships.find((m) => m.id === 'seed-b')!;
    expect(oldA.validTo?.getTime()).toBe(closeAt.getTime());
    expect(oldB.validTo?.getTime()).toBe(closeAt.getTime());
    expect(oldA.updatedByPersonId).toBe(ACTOR);
    expect(oldB.updatedByPersonId).toBe(ACTOR);

    // New rows exist in TO_UNIT.
    const newA = memberships.find(
      (m) => m.personId === PERSON_A && m.orgUnitId === TO_UNIT,
    )!;
    const newB = memberships.find(
      (m) => m.personId === PERSON_B && m.orgUnitId === TO_UNIT,
    )!;
    expect(newA.validFrom.getTime()).toBe(effectiveFromDate.getTime());
    expect(newA.isPrimary).toBe(true);
    expect(newA.createdByPersonId).toBe(ACTOR);
    expect(newA.updatedByPersonId).toBe(ACTOR);
    expect(newB.createdByPersonId).toBe(ACTOR);
  });

  it('partial-failure rollback: throws + restores prior state', async () => {
    // Fail on the second create (second person).
    const { prisma, memberships } = buildFakeStack({ failOnNthCreate: 2 });
    memberships.push(
      {
        id: 'seed-a',
        personId: PERSON_A,
        orgUnitId: FROM_UNIT,
        isPrimary: true,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        archivedAt: null,
        createdByPersonId: null,
        updatedByPersonId: null,
      },
      {
        id: 'seed-b',
        personId: PERSON_B,
        orgUnitId: FROM_UNIT,
        isPrimary: true,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        archivedAt: null,
        createdByPersonId: null,
        updatedByPersonId: null,
      },
    );

    const service = new BulkReassignOrgMembershipService(prisma);
    await expect(
      service.execute({
        actorId: ACTOR,
        personIds: [PERSON_A, PERSON_B],
        toOrgUnitId: TO_UNIT,
        effectiveFrom,
      }),
    ).rejects.toThrow('simulated failure');

    // Both originals must remain open (validTo null) — full rollback.
    const oldA = memberships.find((m) => m.id === 'seed-a')!;
    const oldB = memberships.find((m) => m.id === 'seed-b')!;
    expect(oldA.validTo).toBeNull();
    expect(oldB.validTo).toBeNull();
    // No new TO_UNIT row landed for either person.
    expect(
      memberships.filter((m) => m.orgUnitId === TO_UNIT),
    ).toHaveLength(0);
  });

  it('idempotent re-run: skips people already in the destination unit', async () => {
    const { prisma, memberships } = buildFakeStack();
    // PERSON_A already lives in TO_UNIT.
    memberships.push({
      id: 'seed-a-already',
      personId: PERSON_A,
      orgUnitId: TO_UNIT,
      isPrimary: true,
      validFrom: new Date('2026-01-01'),
      validTo: null,
      archivedAt: null,
      createdByPersonId: null,
      updatedByPersonId: null,
    });
    // PERSON_B in FROM_UNIT.
    memberships.push({
      id: 'seed-b',
      personId: PERSON_B,
      orgUnitId: FROM_UNIT,
      isPrimary: true,
      validFrom: new Date('2026-01-01'),
      validTo: null,
      archivedAt: null,
      createdByPersonId: null,
      updatedByPersonId: null,
    });

    const service = new BulkReassignOrgMembershipService(prisma);
    const result = await service.execute({
      actorId: ACTOR,
      personIds: [PERSON_A, PERSON_B],
      toOrgUnitId: TO_UNIT,
      effectiveFrom,
    });

    expect(result.skippedPersonIds).toEqual([PERSON_A]);
    expect(result.movedPersonIds).toEqual([PERSON_B]);

    // PERSON_A's existing row is unchanged.
    const alreadyA = memberships.find((m) => m.id === 'seed-a-already')!;
    expect(alreadyA.validTo).toBeNull();
    expect(alreadyA.updatedByPersonId).toBeNull();
  });

  it('rejects empty personIds', async () => {
    const { prisma } = buildFakeStack();
    const service = new BulkReassignOrgMembershipService(prisma);
    await expect(
      service.execute({
        actorId: ACTOR,
        personIds: [],
        toOrgUnitId: TO_UNIT,
        effectiveFrom,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing actor', async () => {
    const { prisma } = buildFakeStack();
    const service = new BulkReassignOrgMembershipService(prisma);
    await expect(
      service.execute({
        actorId: '',
        personIds: [PERSON_A],
        toOrgUnitId: TO_UNIT,
        effectiveFrom,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid effectiveFrom', async () => {
    const { prisma } = buildFakeStack();
    const service = new BulkReassignOrgMembershipService(prisma);
    await expect(
      service.execute({
        actorId: ACTOR,
        personIds: [PERSON_A],
        toOrgUnitId: TO_UNIT,
        effectiveFrom: 'not-a-date',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unknown destination org unit', async () => {
    const { prisma } = buildFakeStack();
    const service = new BulkReassignOrgMembershipService(prisma);
    await expect(
      service.execute({
        actorId: ACTOR,
        personIds: [PERSON_A],
        toOrgUnitId: '99999999-9999-9999-9999-999999999999',
        effectiveFrom,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects unknown personId', async () => {
    const { prisma } = buildFakeStack();
    const service = new BulkReassignOrgMembershipService(prisma);
    await expect(
      service.execute({
        actorId: ACTOR,
        personIds: [PERSON_A, '99999999-9999-9999-9999-999999999999'],
        toOrgUnitId: TO_UNIT,
        effectiveFrom,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
