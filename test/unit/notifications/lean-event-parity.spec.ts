import { Logger } from '@nestjs/common';

import { OutboxEventHandlerRegistry } from '@src/modules/audit-observability/application/outbox-event-handler-registry';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationDispatchService } from '@src/modules/notifications/application/notification-dispatch.service';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { AppConfig } from '@src/shared/config/app-config';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import type { PositionFillStatusValue } from '@src/modules/project-positions/domain/value-objects/position-fill-status';

/**
 * LEAN-P1-5 — contract parity test suite. Each
 * `ProjectPositionFillChangedEvent` transition must produce a notification
 * payload that mirrors the corresponding legacy assignment/staffing-request
 * event. Without these green, P1-6 .. P1-11 (write-side migrations) cannot
 * cut over.
 */

function buildPlatformFlagsStub(outboxEnabled: boolean): PlatformFlagsService {
  return {
    isEnabled: async (flagId: string): Promise<boolean> => {
      if (flagId === 'outboxEnabled') return outboxEnabled;
      return false;
    },
    isEnabledByKey: async () => outboxEnabled,
    invalidate: () => undefined,
  } as unknown as PlatformFlagsService;
}

interface CapturedOutboxRow {
  topic: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
}

function buildPrismaStub(flagOutboxEnabled: boolean): {
  prisma: PrismaService;
  outboxRows: CapturedOutboxRow[];
} {
  const outboxRows: CapturedOutboxRow[] = [];
  const prisma = {
    platformSetting: {
      findUnique: async (args: { where: { key: string } }): Promise<{ value: unknown } | null> => {
        if (args.where.key === 'flag.outboxEnabled') {
          return { value: flagOutboxEnabled };
        }
        return null;
      },
    },
    outboxEvent: {
      create: async (args: { data: CapturedOutboxRow }): Promise<unknown> => {
        outboxRows.push(args.data);
        return { id: 'fake-id' };
      },
    },
  };
  return { prisma: prisma as unknown as PrismaService, outboxRows };
}

interface DispatchedEmail {
  eventName: string;
  templateKey: string;
  payload: unknown;
}

function buildDispatchStub(): {
  dispatch: NotificationDispatchService;
  emails: DispatchedEmail[];
} {
  const emails: DispatchedEmail[] = [];
  const dispatch = {
    dispatch: async (command: unknown): Promise<void> => {
      const c = command as { eventName: string; templateKey: string; payload: unknown };
      emails.push({ eventName: c.eventName, templateKey: c.templateKey, payload: c.payload });
    },
  };
  return { dispatch: dispatch as unknown as NotificationDispatchService, emails };
}

const fakeAppConfig: AppConfig = {
  notificationsDefaultEmailRecipient: 'ops@test.local',
} as unknown as AppConfig;

const PROJECT_ID = '33333333-3333-3333-3333-333333333333';
const POSITION_ID = '11111111-1111-1111-1111-111111111111';
const ACTIVE_PERSON_ID = '22222222-2222-2222-2222-222222222222';
const ACTOR_PERSON_ID = '44444444-4444-4444-4444-444444444444';

function basePayload(
  fromStatus: PositionFillStatusValue,
  toStatus: PositionFillStatusValue,
  overrides: Partial<{
    activePersonId?: string;
    reason?: string;
  }> = {},
): {
  positionId: string;
  projectId: string;
  fromStatus: PositionFillStatusValue;
  toStatus: PositionFillStatusValue;
  actorPersonId: string;
  activePersonId?: string;
  reason?: string;
  occurredAt: Date;
} {
  return {
    positionId: POSITION_ID,
    projectId: PROJECT_ID,
    fromStatus,
    toStatus,
    actorPersonId: ACTOR_PERSON_ID,
    activePersonId: overrides.activePersonId,
    reason: overrides.reason,
    occurredAt: new Date('2026-06-02T12:00:00Z'),
  };
}

describe('NotificationEventTranslatorService — LEAN-P1-5 position.fill_changed parity', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  describe('synchronous dispatch (flag.outboxEnabled = false)', () => {
    it('DRAFT → OPEN routes to staffing-request-submitted-email', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(basePayload('DRAFT', 'OPEN'));

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('staffing-request-submitted-email');
      // No active person at this point — in-app suppressed.
      expect(inApp.createNotification).not.toHaveBeenCalled();
    });

    it('OPEN → PROPOSED with activePersonId routes to assignment-created-email + in-app to candidate', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('OPEN', 'PROPOSED', { activePersonId: ACTIVE_PERSON_ID }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-created-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
      expect(inApp.createNotification).toHaveBeenCalledWith(
        ACTIVE_PERSON_ID,
        'assignment.created',
        'You have a new assignment',
        undefined,
        `/positions/${POSITION_ID}`,
      );
    });

    it('PROPOSED → BOOKED routes to assignment-approved-email + in-app to candidate', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('PROPOSED', 'BOOKED', { activePersonId: ACTIVE_PERSON_ID }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-approved-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
      expect(inApp.createNotification).toHaveBeenCalledWith(
        ACTIVE_PERSON_ID,
        'assignment.approved',
        'Assignment approved',
        undefined,
        `/positions/${POSITION_ID}`,
      );
    });

    it('PROPOSED → OPEN with reason routes to assignment-rejected-email + reason carried in in-app', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('PROPOSED', 'OPEN', {
          activePersonId: ACTIVE_PERSON_ID,
          reason: 'rate too high',
        }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-rejected-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
      expect(inApp.createNotification).toHaveBeenCalledWith(
        ACTIVE_PERSON_ID,
        'assignment.rejected',
        'Assignment rejected',
        'rate too high',
        `/positions/${POSITION_ID}`,
      );
    });

    it('BOOKED → ONBOARDING routes to assignment-onboarding-scheduled-email', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('BOOKED', 'ONBOARDING', { activePersonId: ACTIVE_PERSON_ID }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-onboarding-scheduled-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
    });

    it('ONBOARDING → ASSIGNED routes to assignment-assigned-email (status_changed)', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('ONBOARDING', 'ASSIGNED', { activePersonId: ACTIVE_PERSON_ID }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-assigned-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
      expect(inApp.createNotification).toHaveBeenCalledWith(
        ACTIVE_PERSON_ID,
        'assignment.assigned',
        'Assignment assigned',
        undefined,
        `/positions/${POSITION_ID}`,
      );
    });

    it('ASSIGNED → ON_HOLD routes via status_changed with reason carried', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('ASSIGNED', 'ON_HOLD', {
          activePersonId: ACTIVE_PERSON_ID,
          reason: 'sick leave',
        }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-on_hold-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
      expect(inApp.createNotification).toHaveBeenCalledWith(
        ACTIVE_PERSON_ID,
        'assignment.on_hold',
        'Assignment on hold',
        'sick leave',
        `/positions/${POSITION_ID}`,
      );
    });

    it('ASSIGNED → RELEASED with filled person routes to assignment-ended-email + in-app to person', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('ASSIGNED', 'RELEASED', {
          activePersonId: ACTIVE_PERSON_ID,
          reason: 'project_complete',
        }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-ended-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
      expect(inApp.createNotification).toHaveBeenCalledWith(
        ACTIVE_PERSON_ID,
        'assignment.ended',
        'Your assignment has ended',
        'project_complete',
        `/positions/${POSITION_ID}`,
      );
    });

    it('OPEN → RELEASED (unfilled) routes to staffing-request-cancelled-email and emits NO in-app', async () => {
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(false),
      );

      await translator.positionFillChanged(
        basePayload('OPEN', 'RELEASED', { reason: 'no candidate available' }),
      );

      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('staffing-request-cancelled-email');
      expect(inApp.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('outbox dual-write (flag.outboxEnabled = true)', () => {
    it('writes an OutboxEvent with aggregateType=ProjectPosition and short-circuits sync fan-out', async () => {
      const { prisma, outboxRows } = buildPrismaStub(true);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(true),
      );

      await translator.positionFillChanged(
        basePayload('OPEN', 'PROPOSED', { activePersonId: ACTIVE_PERSON_ID }),
      );

      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0]).toMatchObject({
        topic: 'notifications',
        eventName: 'position.fill_changed',
        aggregateType: 'ProjectPosition',
        aggregateId: POSITION_ID,
      });
      // Sync fan-out short-circuited by the flag.
      expect(emails).toHaveLength(0);
      expect(inApp.createNotification).not.toHaveBeenCalled();
    });

    it('registers an outbox handler that re-enters dispatchPositionFillChanged on consumption', async () => {
      // flag.outboxEnabled = false so the handler's nested dualDispatch
      // is not gated again (no double-dispatch on consumption side).
      const { prisma } = buildPrismaStub(false);
      const { dispatch, emails } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };
      const registry = new OutboxEventHandlerRegistry();

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        registry,
        buildPlatformFlagsStub(false),
      );
      translator.onModuleInit();

      const handler = registry.resolve({
        topic: 'notifications',
        eventName: 'position.fill_changed',
      });
      expect(handler).toBeDefined();

      await handler!({
        id: 'outbox-1',
        topic: 'notifications',
        eventName: 'position.fill_changed',
        aggregateType: 'ProjectPosition',
        aggregateId: POSITION_ID,
        correlationId: null,
        payload: basePayload('OPEN', 'PROPOSED', { activePersonId: ACTIVE_PERSON_ID }),
        attempts: 0,
        createdAt: new Date(),
      });

      // Handler re-entered the synchronous fan-out — same as if the flag
      // had been off when positionFillChanged() was called.
      expect(emails).toHaveLength(1);
      expect(emails[0].templateKey).toBe('assignment-created-email');
      expect(inApp.createNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('payload shape parity with legacy events', () => {
    it('OutboxEvent payload preserves the full ProjectPositionFillChangedEvent shape', async () => {
      const { prisma, outboxRows } = buildPrismaStub(true);
      const { dispatch } = buildDispatchStub();
      const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

      const translator = new NotificationEventTranslatorService(
        dispatch,
        fakeAppConfig,
        inApp as unknown as InAppNotificationService,
        prisma,
        undefined,
        buildPlatformFlagsStub(true),
      );

      const payload = basePayload('PROPOSED', 'BOOKED', {
        activePersonId: ACTIVE_PERSON_ID,
        reason: 'pm approval',
      });
      await translator.positionFillChanged(payload);

      expect(outboxRows[0].payload).toMatchObject({
        positionId: POSITION_ID,
        projectId: PROJECT_ID,
        fromStatus: 'PROPOSED',
        toStatus: 'BOOKED',
        actorPersonId: ACTOR_PERSON_ID,
        activePersonId: ACTIVE_PERSON_ID,
        reason: 'pm approval',
      });
    });
  });
});
