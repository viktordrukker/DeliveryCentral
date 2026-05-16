import {
  EmployeeActivityService,
  type EmployeeActivityEventDto,
  type RecordActivityCommand,
} from '@src/modules/organization/application/employee-activity.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-11.9 / 19-10 — unit coverage for the employee activity feed
 * service. Exercises the two public methods (`record` + `listByPerson`)
 * against a Prisma stub so a future refactor that silently drops the
 * service's storage / ordering / fallback semantics fails at commit
 * time.
 */

interface FakeRow {
  id: string;
  personId: string;
  actorId: string | null;
  eventType: string;
  summary: string;
  metadata: unknown;
  occurredAt: Date;
  relatedEntityId: string | null;
  createdAt: Date;
}

function buildPrismaStub(initial: FakeRow[] = []): {
  prisma: PrismaService;
  rows: FakeRow[];
} {
  const rows = [...initial];
  let nextId = 0;
  const prisma = {
    employeeActivityEvent: {
      create: async (args: { data: Omit<FakeRow, 'id' | 'createdAt'> }): Promise<FakeRow> => {
        const id = `evt-${++nextId}`;
        const row: FakeRow = {
          id,
          createdAt: new Date(),
          ...args.data,
        };
        rows.push(row);
        return row;
      },
      findMany: async (args: {
        where: { personId: string };
        orderBy: { occurredAt: 'desc' };
        take: number;
      }): Promise<FakeRow[]> => {
        return rows
          .filter((r) => r.personId === args.where.personId)
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
          .slice(0, args.take);
      },
    },
  } as unknown as PrismaService;
  return { prisma, rows };
}

describe('EmployeeActivityService — record + listByPerson', () => {
  it('writes a row with all required fields + defaults occurredAt to now', async () => {
    const { prisma, rows } = buildPrismaStub();
    const svc = new EmployeeActivityService(prisma);
    const before = new Date();
    const command: RecordActivityCommand = {
      personId: 'person-1',
      eventType: 'HIRED',
      summary: 'Welcome aboard.',
    };
    await svc.record(command);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      personId: 'person-1',
      eventType: 'HIRED',
      summary: 'Welcome aboard.',
      actorId: null,
      relatedEntityId: null,
    });
    expect(rows[0].occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('preserves the supplied actorId, metadata, relatedEntityId, occurredAt', async () => {
    const { prisma, rows } = buildPrismaStub();
    const svc = new EmployeeActivityService(prisma);
    const occurredAt = new Date('2026-03-01T12:00:00Z');
    await svc.record({
      personId: 'person-2',
      eventType: 'ROLE_CHANGED',
      summary: 'Promoted to Senior.',
      actorId: 'admin-1',
      metadata: { from: 'G9', to: 'G10' },
      occurredAt,
      relatedEntityId: 'change-req-7',
    });

    expect(rows[0]).toMatchObject({
      actorId: 'admin-1',
      occurredAt,
      relatedEntityId: 'change-req-7',
    });
    expect(rows[0].metadata).toEqual({ from: 'G9', to: 'G10' });
  });

  it('deep-clones metadata so caller mutations do not leak into the persisted row', async () => {
    const { prisma, rows } = buildPrismaStub();
    const svc = new EmployeeActivityService(prisma);
    const metadata: Record<string, unknown> = { from: 'G9' };
    await svc.record({ personId: 'person-3', eventType: 'ROLE_CHANGED', summary: 's', metadata });
    metadata.from = 'MUTATED';
    expect(rows[0].metadata).toEqual({ from: 'G9' });
  });

  it('listByPerson returns rows for the requested person in occurredAt-DESC order, limited', async () => {
    const fixtures: FakeRow[] = [
      mkRow('e1', 'person-1', 'HIRED', new Date('2026-01-01')),
      mkRow('e2', 'person-1', 'ASSIGNED', new Date('2026-02-15')),
      mkRow('e3', 'person-1', 'ROLE_CHANGED', new Date('2026-03-10')),
      mkRow('e4', 'person-2', 'HIRED', new Date('2026-03-12')), // wrong person — should be excluded
    ];
    const { prisma } = buildPrismaStub(fixtures);
    const svc = new EmployeeActivityService(prisma);
    const result = await svc.listByPerson('person-1', 2);

    expect(result.map((r) => r.id)).toEqual(['e3', 'e2']);
    expect(result[0]).toMatchObject({ eventType: 'ROLE_CHANGED', personId: 'person-1' });
  });

  it('listByPerson serializes occurredAt + createdAt to ISO strings', async () => {
    const fixtures: FakeRow[] = [
      mkRow('e1', 'person-1', 'HIRED', new Date('2026-01-01T08:00:00Z')),
    ];
    const { prisma } = buildPrismaStub(fixtures);
    const svc = new EmployeeActivityService(prisma);
    const [event] = await svc.listByPerson('person-1');
    expect(event.occurredAt).toBe('2026-01-01T08:00:00.000Z');
    expect(typeof event.createdAt).toBe('string');
  });

  it('listByPerson returns an empty array when the person has no events', async () => {
    const { prisma } = buildPrismaStub();
    const svc = new EmployeeActivityService(prisma);
    const result: EmployeeActivityEventDto[] = await svc.listByPerson('person-unknown');
    expect(result).toEqual([]);
  });

  it('listByPerson honours the default limit of 50 when none supplied', async () => {
    const fixtures: FakeRow[] = Array.from({ length: 75 }, (_, i) =>
      mkRow(`e${i}`, 'person-1', 'ASSIGNED', new Date(2026, 0, i + 1)),
    );
    const { prisma } = buildPrismaStub(fixtures);
    const svc = new EmployeeActivityService(prisma);
    const result = await svc.listByPerson('person-1');
    expect(result).toHaveLength(50);
  });
});

function mkRow(id: string, personId: string, eventType: string, occurredAt: Date): FakeRow {
  return {
    id,
    personId,
    actorId: null,
    eventType,
    summary: `summary for ${id}`,
    metadata: null,
    occurredAt,
    relatedEntityId: null,
    createdAt: occurredAt,
  };
}
