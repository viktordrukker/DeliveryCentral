import { Logger } from '@nestjs/common';

import { OutboxEventHandlerRegistry } from '@src/modules/audit-observability/application/outbox-event-handler-registry';
import { OutboxEventPublisherService } from '@src/modules/audit-observability/application/outbox-event-publisher.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationDispatchService } from '@src/modules/notifications/application/notification-dispatch.service';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { AppConfig } from '@src/shared/config/app-config';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-9.1 — outbox round-trip audit.
 *
 * The plan calls for "verify the F-6.5 flag.outboxEnabled flip actually
 * moved fan-out off the request thread on staging". The existing specs
 * cover each half (translator-writes / publisher-dispatches), but not the
 * chain. This spec runs the round-trip in-process:
 *
 *   translator.assignmentCreated(payload)        ← flag ON, sync path skipped
 *     → outboxEvent.create() persists a row      ← captured by stub
 *   publisher.tick()                             ← consumes the same row
 *     → registry handler invoked                 ← row marked PUBLISHED
 *     → registered handler re-enters the dispatch
 *
 * If a future refactor accidentally short-circuits the producer or the
 * publisher, this test fails at commit time rather than on staging.
 */

interface FakeOutboxRow {
  id: string;
  topic: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string | null;
  payload: unknown;
  attempts: number;
  status: 'PENDING' | 'RETRY' | 'PUBLISHED' | 'FAILED';
  availableAt: Date;
  publishedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

function buildPlatformFlagsStub(outboxEnabled: boolean): PlatformFlagsService {
  return {
    isEnabled: async (flagId: string): Promise<boolean> =>
      flagId === 'outboxEnabled' ? outboxEnabled : false,
    isEnabledByKey: async () => outboxEnabled,
    invalidate: () => undefined,
  } as unknown as PlatformFlagsService;
}

function buildSharedPrismaStub(): { prisma: PrismaService; rows: FakeOutboxRow[] } {
  const rows: FakeOutboxRow[] = [];
  let nextId = 0;
  const prisma = {
    platformSetting: {
      findUnique: async () => null,
    },
    outboxEvent: {
      create: async (args: { data: Partial<FakeOutboxRow> }) => {
        const id = `outbox-${++nextId}`;
        const now = new Date();
        const row: FakeOutboxRow = {
          id,
          topic: args.data.topic ?? '',
          eventName: args.data.eventName ?? '',
          aggregateType: args.data.aggregateType ?? '',
          aggregateId: args.data.aggregateId ?? '',
          correlationId: null,
          payload: args.data.payload ?? null,
          attempts: 0,
          status: 'PENDING',
          availableAt: now,
          publishedAt: null,
          lastError: null,
          createdAt: now,
        };
        rows.push(row);
        return row;
      },
      findMany: async (args: {
        where: { status: { in: FakeOutboxRow['status'][] }; availableAt: { lte: Date } };
        take: number;
      }) => {
        const cutoff = args.where.availableAt.lte;
        const allowed = args.where.status.in;
        return rows
          .filter((r) => allowed.includes(r.status) && r.availableAt <= cutoff)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(0, args.take);
      },
      update: async (args: { where: { id: string }; data: Partial<FakeOutboxRow> }) => {
        const row = rows.find((r) => r.id === args.where.id);
        if (!row) throw new Error(`row ${args.where.id} not found`);
        Object.assign(row, args.data);
        return row;
      },
      count: async () => rows.length,
    },
  };
  return { prisma: prisma as unknown as PrismaService, rows };
}

function buildDispatchStub(): {
  dispatch: NotificationDispatchService;
  emails: Array<{ eventName: string; payload: unknown }>;
} {
  const emails: Array<{ eventName: string; payload: unknown }> = [];
  const dispatch = {
    dispatch: async (command: unknown) => {
      const c = command as { eventName: string; payload: unknown };
      emails.push({ eventName: c.eventName, payload: c.payload });
    },
  };
  return { dispatch: dispatch as unknown as NotificationDispatchService, emails };
}

const fakeAppConfig = {
  notificationsDefaultEmailRecipient: 'ops@test.local',
} as unknown as AppConfig;

describe('F-9.1 — outbox producer → publisher → consumer round-trip', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  it('writes a row with flag ON, publisher dispatches it via the registry, sync side-effects happen on the publisher tick — NOT on the producer call', async () => {
    const { prisma, rows } = buildSharedPrismaStub();
    const { dispatch, emails } = buildDispatchStub();
    const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };
    const registry = new OutboxEventHandlerRegistry();
    const flags = buildPlatformFlagsStub(true);

    const translator = new NotificationEventTranslatorService(
      dispatch,
      fakeAppConfig,
      inApp as unknown as InAppNotificationService,
      prisma,
      registry,
      flags,
    );
    // Register the consumer handler.
    translator.onModuleInit();

    // ── Phase A: producer call. With flag ON, this MUST NOT trigger any
    //     sync fan-out. Email + in-app stay at zero counts.
    await translator.assignmentCreated({
      assignmentId: '11111111-1111-1111-1111-111111111111',
      personId: '22222222-2222-2222-2222-222222222222',
      projectId: '33333333-3333-3333-3333-333333333333',
      staffingRole: 'Engineer',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      topic: 'notifications',
      eventName: 'assignment.created',
      status: 'PENDING',
    });
    expect(emails).toHaveLength(0);
    expect(inApp.createNotification).not.toHaveBeenCalled();

    // ── Phase B: publisher tick. Picks up the PENDING row, invokes the
    //     registered handler, marks PUBLISHED. THIS is the off-request-thread
    //     side-effect the F-6.5 flip was supposed to introduce.
    const publisher = new OutboxEventPublisherService(prisma, registry, flags);
    const tick = await publisher.tick(new Date());

    expect(tick).toEqual({ dispatched: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(rows[0].status).toBe('PUBLISHED');
    expect(rows[0].publishedAt).not.toBeNull();

    // ── Phase C: sync side-effects observed on the consumer side.
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      eventName: 'assignment.created',
      payload: expect.objectContaining({
        assignmentId: '11111111-1111-1111-1111-111111111111',
      }),
    });
    expect(inApp.createNotification).toHaveBeenCalledTimes(1);
  });

  it('with flag OFF the producer runs the legacy sync path and no outbox row is written', async () => {
    const { prisma, rows } = buildSharedPrismaStub();
    const { dispatch, emails } = buildDispatchStub();
    const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };
    const registry = new OutboxEventHandlerRegistry();
    const flags = buildPlatformFlagsStub(false);

    const translator = new NotificationEventTranslatorService(
      dispatch,
      fakeAppConfig,
      inApp as unknown as InAppNotificationService,
      prisma,
      registry,
      flags,
    );
    translator.onModuleInit();

    await translator.assignmentCreated({
      assignmentId: 'asg-legacy',
      personId: 'p-legacy',
      projectId: 'pr-legacy',
      staffingRole: 'Engineer',
    });

    expect(rows).toHaveLength(0);
    expect(emails).toHaveLength(1);
    expect(inApp.createNotification).toHaveBeenCalledTimes(1);
  });
});
