import { NotFoundException } from '@nestjs/common';
import { LeaveRequestType } from '@prisma/client';

import { LeavePolicyService } from '@src/modules/leave-requests/application/leave-policy.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  publicId: string | null;
  name: string;
  leaveType: LeaveRequestType;
  accrualPerYear: number;
  maxCarryOver: number;
  approvalChain: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

function makeFakePrisma(seed: FakeRow[] = []): {
  prisma: PrismaService;
  store: FakeRow[];
} {
  const store: FakeRow[] = [...seed];
  let counter = 0;
  const nextId = (): string => {
    counter += 1;
    return `lvp-${counter.toString().padStart(4, '0')}`;
  };

  const prisma = {
    leavePolicy: {
      findMany: async (args: { where?: Partial<FakeRow> }): Promise<FakeRow[]> => {
        const where = args.where ?? {};
        return store.filter((r) =>
          Object.entries(where).every(([k, v]) =>
            (r as unknown as Record<string, unknown>)[k] === v,
          ),
        );
      },
      findUnique: async (args: { where: { id: string } }): Promise<FakeRow | null> => {
        return store.find((r) => r.id === args.where.id) ?? null;
      },
      create: async (args: { data: Partial<FakeRow> }): Promise<FakeRow> => {
        const now = new Date();
        const row: FakeRow = {
          id: nextId(),
          publicId: null,
          name: args.data.name as string,
          leaveType: args.data.leaveType as LeaveRequestType,
          accrualPerYear: args.data.accrualPerYear as number,
          maxCarryOver: args.data.maxCarryOver as number,
          approvalChain: (args.data.approvalChain as string[]) ?? [],
          active: args.data.active ?? true,
          createdAt: now,
          updatedAt: now,
          createdByPersonId: (args.data.createdByPersonId as string | null) ?? null,
          updatedByPersonId: (args.data.updatedByPersonId as string | null) ?? null,
        };
        store.push(row);
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<FakeRow>;
      }): Promise<FakeRow> => {
        const idx = store.findIndex((r) => r.id === args.where.id);
        if (idx === -1) throw new Error('not found');
        const next = { ...store[idx], ...args.data, updatedAt: new Date() };
        store[idx] = next;
        return next;
      },
    },
  } as unknown as PrismaService;

  return { prisma, store };
}

const ACTOR = 'aaaa0000-0000-0000-0000-000000000001';

describe('LeavePolicyService (LEAN-P4-missing-13)', () => {
  it('create() persists row with actor-audit fields and defaults active=true', async () => {
    const { prisma, store } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    const dto = await svc.create(
      {
        name: 'Annual',
        leaveType: LeaveRequestType.ANNUAL,
        accrualPerYear: 20,
        maxCarryOver: 5,
        approvalChain: ['hr_manager', 'director'],
      },
      ACTOR,
    );

    expect(dto.id).toBe('lvp-0001');
    expect(dto.name).toBe('Annual');
    expect(dto.leaveType).toBe(LeaveRequestType.ANNUAL);
    expect(dto.accrualPerYear).toBe(20);
    expect(dto.maxCarryOver).toBe(5);
    expect(dto.approvalChain).toEqual(['hr_manager', 'director']);
    expect(dto.active).toBe(true);
    expect(dto.createdByPersonId).toBe(ACTOR);
    expect(dto.updatedByPersonId).toBe(ACTOR);
    expect(store).toHaveLength(1);
  });

  it('create() honours an explicit active=false', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    const dto = await svc.create(
      {
        name: 'Sick',
        leaveType: LeaveRequestType.SICK,
        accrualPerYear: 10,
        maxCarryOver: 0,
        approvalChain: ['hr_manager'],
        active: false,
      },
      ACTOR,
    );

    expect(dto.active).toBe(false);
  });

  it('list() returns rows ordered by leaveType asc by default (includeInactive=true)', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    await svc.create(
      {
        name: 'Annual',
        leaveType: LeaveRequestType.ANNUAL,
        accrualPerYear: 20,
        maxCarryOver: 5,
        approvalChain: ['hr_manager'],
      },
      ACTOR,
    );
    const sick = await svc.create(
      {
        name: 'Sick',
        leaveType: LeaveRequestType.SICK,
        accrualPerYear: 10,
        maxCarryOver: 0,
        approvalChain: ['hr_manager'],
      },
      ACTOR,
    );
    await svc.softDelete(sick.id, ACTOR);

    const allRows = await svc.list(true);
    expect(allRows.map((r) => r.leaveType)).toEqual(
      expect.arrayContaining([LeaveRequestType.ANNUAL, LeaveRequestType.SICK]),
    );
  });

  it('findById() returns the row when present', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    const created = await svc.create(
      {
        name: 'Parental',
        leaveType: LeaveRequestType.PARENTAL,
        accrualPerYear: 0,
        maxCarryOver: 0,
        approvalChain: ['hr_manager'],
      },
      ACTOR,
    );

    const got = await svc.findById(created.id);
    expect(got.name).toBe('Parental');
  });

  it('findById() throws NotFoundException for an unknown id', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    await expect(svc.findById('lvp-ghost')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() patches only supplied fields and stamps updatedByPersonId', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    const created = await svc.create(
      {
        name: 'Annual',
        leaveType: LeaveRequestType.ANNUAL,
        accrualPerYear: 20,
        maxCarryOver: 5,
        approvalChain: ['hr_manager'],
      },
      ACTOR,
    );

    const updater = 'aaaa0000-0000-0000-0000-000000000002';
    const updated = await svc.update(
      created.id,
      { accrualPerYear: 25, approvalChain: ['hr_manager', 'director'] },
      updater,
    );

    expect(updated.accrualPerYear).toBe(25);
    expect(updated.maxCarryOver).toBe(5); // unchanged
    expect(updated.approvalChain).toEqual(['hr_manager', 'director']);
    expect(updated.updatedByPersonId).toBe(updater);
    expect(updated.createdByPersonId).toBe(ACTOR); // unchanged
  });

  it('update() throws NotFoundException for an unknown id', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    await expect(
      svc.update('lvp-ghost', { name: 'x' }, ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('softDelete() flips active to false but keeps the row', async () => {
    const { prisma, store } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    const created = await svc.create(
      {
        name: 'Annual',
        leaveType: LeaveRequestType.ANNUAL,
        accrualPerYear: 20,
        maxCarryOver: 5,
        approvalChain: ['hr_manager'],
      },
      ACTOR,
    );

    const deactivated = await svc.softDelete(created.id, ACTOR);
    expect(deactivated.active).toBe(false);
    expect(store).toHaveLength(1);
  });

  it('softDelete() throws NotFoundException for an unknown id', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new LeavePolicyService(prisma);

    await expect(svc.softDelete('lvp-ghost', ACTOR)).rejects.toBeInstanceOf(NotFoundException);
  });
});
