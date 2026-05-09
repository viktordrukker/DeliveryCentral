import { Logger } from '@nestjs/common';

import {
  OutboxEventHandler,
  OutboxEventHandlerRegistry,
} from '@src/modules/audit-observability/application/outbox-event-handler-registry';
import { OutboxEventPublisherService } from '@src/modules/audit-observability/application/outbox-event-publisher.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  topic: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string | null;
  payload: unknown;
  attempts: number;
  status: string;
  availableAt: Date;
  publishedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

function makeRow(over: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 'row-1',
    topic: 'people.lifecycle',
    eventName: 'employee.hired',
    aggregateType: 'Person',
    aggregateId: '00000000-0000-0000-0000-000000000001',
    correlationId: null,
    payload: { foo: 'bar' },
    attempts: 0,
    status: 'PENDING',
    availableAt: new Date('2026-05-03T00:00:00Z'),
    publishedAt: null,
    lastError: null,
    createdAt: new Date('2026-05-03T00:00:00Z'),
    ...over,
  };
}

/**
 * Build a minimal `PrismaService` stub that exposes only what the publisher
 * uses: `outboxEvent.findMany` / `outboxEvent.update` and
 * `platformSetting.findUnique`.
 */
function buildPrismaStub(initialRows: FakeRow[], settings: Record<string, unknown> = {}): {
  prisma: PrismaService;
  rows: FakeRow[];
} {
  const rows = initialRows.map((r) => ({ ...r }));
  const prisma = {
    outboxEvent: {
      findMany: async (args: { where: { availableAt: { lte: Date }; status: { in: string[] } }; take: number }): Promise<FakeRow[]> => {
        const cutoff = args.where.availableAt.lte;
        const allowed = args.where.status.in;
        return rows
          .filter((r) => allowed.includes(r.status) && r.availableAt <= cutoff)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(0, args.take);
      },
      update: async (args: { where: { id: string }; data: Partial<FakeRow> }): Promise<FakeRow> => {
        const row = rows.find((r) => r.id === args.where.id);
        if (!row) throw new Error(`row ${args.where.id} not found`);
        Object.assign(row, args.data);
        return row;
      },
    },
    platformSetting: {
      findUnique: async (args: { where: { key: string } }): Promise<{ value: unknown } | null> => {
        const value = settings[args.where.key];
        return value === undefined ? null : { value };
      },
    },
  };
  return { prisma: prisma as unknown as PrismaService, rows };
}

describe('OutboxEventPublisherService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  it('dispatches PENDING rows to a registered handler and marks them PUBLISHED', async () => {
    const { prisma, rows } = buildPrismaStub([makeRow()]);
    const registry = new OutboxEventHandlerRegistry();
    const handler: jest.MockedFn<OutboxEventHandler> = jest.fn().mockResolvedValue(undefined);
    registry.register({ topic: 'people.lifecycle', eventName: 'employee.hired' }, handler);

    const publisher = new OutboxEventPublisherService(prisma, registry);
    const now = new Date('2026-05-03T01:00:00Z');
    const result = await publisher.tick(now);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ dispatched: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(rows[0].status).toBe('PUBLISHED');
    expect(rows[0].publishedAt).toEqual(now);
    expect(rows[0].lastError).toBeNull();
  });

  it('marks the row RETRY with a future availableAt when the handler throws (under attempts cap)', async () => {
    const { prisma, rows } = buildPrismaStub([makeRow()]);
    const registry = new OutboxEventHandlerRegistry();
    registry.register({ topic: 'people.lifecycle', eventName: 'employee.hired' }, async () => {
      throw new Error('downstream 500');
    });

    const publisher = new OutboxEventPublisherService(prisma, registry);
    const now = new Date('2026-05-03T01:00:00Z');
    const result = await publisher.tick(now);

    expect(result).toEqual({ dispatched: 1, succeeded: 0, failed: 1, skipped: 0 });
    expect(rows[0].status).toBe('RETRY');
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].lastError).toBe('downstream 500');
    expect(rows[0].availableAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('marks the row FAILED when attempts reach the max cap (default 5)', async () => {
    const { prisma, rows } = buildPrismaStub([makeRow({ attempts: 4 })]);
    const registry = new OutboxEventHandlerRegistry();
    registry.register({ topic: 'people.lifecycle', eventName: 'employee.hired' }, async () => {
      throw new Error('persistent failure');
    });

    const publisher = new OutboxEventPublisherService(prisma, registry);
    await publisher.tick(new Date('2026-05-03T01:00:00Z'));

    expect(rows[0].status).toBe('FAILED');
    expect(rows[0].attempts).toBe(5);
    expect(rows[0].lastError).toBe('persistent failure');
  });

  it('skips rows with no registered handler and leaves them PENDING (does not increment attempts)', async () => {
    const { prisma, rows } = buildPrismaStub([makeRow()]);
    const registry = new OutboxEventHandlerRegistry(); // empty

    const publisher = new OutboxEventPublisherService(prisma, registry);
    const result = await publisher.tick(new Date('2026-05-03T01:00:00Z'));

    expect(result).toEqual({ dispatched: 1, succeeded: 0, failed: 0, skipped: 1 });
    expect(rows[0].status).toBe('PENDING');
    expect(rows[0].attempts).toBe(0);
  });

  it('does not re-pick rows whose availableAt is still in the future (RETRY backoff respected)', async () => {
    const future = new Date('2026-05-03T02:00:00Z');
    const { prisma, rows } = buildPrismaStub([
      makeRow({ status: 'RETRY', availableAt: future, attempts: 1 }),
    ]);
    const registry = new OutboxEventHandlerRegistry();
    registry.register({ topic: 'people.lifecycle', eventName: 'employee.hired' }, async () => undefined);

    const publisher = new OutboxEventPublisherService(prisma, registry);
    const result = await publisher.tick(new Date('2026-05-03T01:00:00Z'));

    expect(result).toEqual({ dispatched: 0, succeeded: 0, failed: 0, skipped: 0 });
    expect(rows[0].status).toBe('RETRY');
  });
});
