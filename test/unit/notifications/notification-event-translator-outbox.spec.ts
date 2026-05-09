import { Logger } from '@nestjs/common';

import { OutboxEventHandlerRegistry } from '@src/modules/audit-observability/application/outbox-event-handler-registry';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationDispatchService } from '@src/modules/notifications/application/notification-dispatch.service';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { AppConfig } from '@src/shared/config/app-config';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

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

function buildDispatchStub(): {
  dispatch: NotificationDispatchService;
  emails: Array<{ eventName: string; templateKey: string; payload: unknown }>;
} {
  const emails: Array<{ eventName: string; templateKey: string; payload: unknown }> = [];
  // The translator routes through `notificationDispatchService.dispatch(command)`
  // (via private sendEmail → dispatchQuietly). Mirror that contract.
  const dispatch = {
    dispatch: async (command: unknown): Promise<void> => {
      const c = command as { eventName: string; templateKey: string; payload: unknown };
      emails.push({ eventName: c.eventName, templateKey: c.templateKey, payload: c.payload });
    },
  };
  return { dispatch: dispatch as unknown as NotificationDispatchService, emails };
}

// `sendEmail` early-returns when this is unset; provide a value so the
// dispatch path is exercised in the synchronous-fan-out tests.
const fakeAppConfig: AppConfig = {
  notificationsDefaultEmailRecipient: 'ops@test.local',
} as unknown as AppConfig;

describe('NotificationEventTranslatorService — outbox dual-write', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  it('writes an OutboxEvent row instead of dispatching when flag.outboxEnabled = true', async () => {
    const { prisma, outboxRows } = buildPrismaStub(true);
    const { dispatch, emails } = buildDispatchStub();
    const inApp = { createNotification: jest.fn().mockResolvedValue(undefined) };

    const translator = new NotificationEventTranslatorService(
      dispatch,
      fakeAppConfig,
      inApp as unknown as InAppNotificationService,
      prisma,
      undefined, // registry not needed for the producer-side test
      buildPlatformFlagsStub(true),
    );

    await translator.assignmentCreated({
      assignmentId: '11111111-1111-1111-1111-111111111111',
      personId: '22222222-2222-2222-2222-222222222222',
      projectId: '33333333-3333-3333-3333-333333333333',
      staffingRole: 'Engineer',
    });

    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]).toMatchObject({
      topic: 'notifications',
      eventName: 'assignment.created',
      aggregateType: 'ProjectAssignment',
      aggregateId: '11111111-1111-1111-1111-111111111111',
    });
    // Synchronous fan-out is short-circuited by the flag.
    expect(emails).toHaveLength(0);
    expect(inApp.createNotification).not.toHaveBeenCalled();
  });

  it('dispatches synchronously (legacy path) when flag.outboxEnabled = false', async () => {
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

    await translator.assignmentCreated({
      assignmentId: 'aaaa',
      personId: 'bbbb',
      projectId: 'cccc',
      staffingRole: 'Engineer',
    });

    expect(emails).toHaveLength(1);
    expect(emails[0].eventName).toBe('assignment.created');
    expect(inApp.createNotification).toHaveBeenCalledTimes(1);
  });

  // HD-0.3 Phase 2b: prove the generic `dualDispatch` helper short-circuits
  // sync fan-out for every migrated event when the flag is on. Adds a new
  // row per event when migrated; keeps the matrix table-driven.
  describe.each([
    {
      method: 'assignmentCreated' as const,
      eventName: 'assignment.created',
      payload: { assignmentId: 'asg-1', personId: 'p-1', projectId: 'pr-1', staffingRole: 'Eng' },
    },
    {
      method: 'assignmentApproved' as const,
      eventName: 'assignment.approved',
      payload: { assignmentId: 'asg-1', recipientPersonId: 'p-1' },
    },
    {
      method: 'assignmentRejected' as const,
      eventName: 'assignment.rejected',
      payload: { assignmentId: 'asg-1', recipientPersonId: 'p-1', reason: 'no fit' },
    },
    {
      method: 'projectActivated' as const,
      eventName: 'project.activated',
      payload: { projectId: 'pr-1', projectName: 'Apollo' },
    },
    {
      method: 'projectClosed' as const,
      eventName: 'project.closed',
      payload: { projectId: 'pr-1', projectName: 'Apollo', totalMandays: 120 },
    },
    {
      method: 'staffingRequestSubmitted' as const,
      eventName: 'staffing_request.submitted',
      payload: { requestId: 'sr-1', projectId: 'pr-1', role: 'Eng', ownerPersonId: 'pm-1' },
    },
    {
      method: 'staffingRequestFulfilled' as const,
      eventName: 'staffing_request.fulfilled',
      payload: { requestId: 'sr-1', requesterPersonId: 'pm-1', assignedPersonId: 'p-1' },
    },
    {
      method: 'assignmentSlaBreached' as const,
      eventName: 'assignment.sla_breached',
      payload: { assignmentId: 'asg-1', slaStage: 'PROPOSAL', recipientPersonIds: ['p-1'] },
    },
    {
      method: 'assignmentEnded' as const,
      eventName: 'assignment.ended',
      payload: { assignmentId: 'asg-1' },
    },
    {
      method: 'assignmentStatusChanged' as const,
      eventName: 'assignment.status_changed',
      payload: {
        assignmentId: 'asg-1',
        previousStatus: 'PROPOSED',
        status: 'BOOKED',
        recipientPersonId: 'p-1',
      },
    },
    {
      method: 'assignmentAmended' as const,
      eventName: 'assignment.amended',
      payload: { assignmentId: 'asg-1', personId: 'p-1' },
    },
    {
      method: 'assignmentOnboardingScheduled' as const,
      eventName: 'assignment.onboarding_scheduled',
      payload: { assignmentId: 'asg-1', onboardingDate: '2026-06-01', recipientPersonIds: ['p-1'] },
    },
    {
      method: 'assignmentEscalatedToCase' as const,
      eventName: 'assignment.escalated_to_case',
      payload: { assignmentId: 'asg-1', caseId: 'case-1', recipientPersonIds: ['p-1'] },
    },
    {
      method: 'proposalSubmitted' as const,
      eventName: 'assignment.proposal_submitted',
      payload: { assignmentId: 'asg-1', candidateCount: 3, recipientPersonIds: ['p-1'] },
    },
    {
      method: 'proposalAcknowledged' as const,
      eventName: 'assignment.proposal_acknowledged',
      payload: { assignmentId: 'asg-1', recipientPersonIds: ['p-1'] },
    },
    {
      method: 'proposalDirectorApprovalRequested' as const,
      eventName: 'assignment.proposal_director_approval_requested',
      payload: { assignmentId: 'asg-1', recipientPersonIds: ['d-1'] },
    },
    {
      method: 'caseCreated' as const,
      eventName: 'case.created',
      payload: { caseId: 'case-1', caseType: 'ONBOARDING', ownerPersonId: 'hr-1', subjectPersonId: 'p-1' },
    },
    {
      method: 'caseStepCompleted' as const,
      eventName: 'case.step_completed',
      payload: { caseId: 'case-1', ownerPersonId: 'hr-1' },
    },
    {
      method: 'caseClosed' as const,
      eventName: 'case.closed',
      payload: { caseId: 'case-1', subjectPersonId: 'p-1' },
    },
    {
      method: 'caseApproved' as const,
      eventName: 'case.approved',
      payload: { caseId: 'case-1', subjectPersonId: 'p-1' },
    },
    {
      method: 'caseRejected' as const,
      eventName: 'case.rejected',
      payload: { caseId: 'case-1', subjectPersonId: 'p-1', reason: 'incomplete' },
    },
    {
      method: 'staffingRequestInReview' as const,
      eventName: 'staffing_request.in_review',
      payload: { requestId: 'sr-1', requesterPersonId: 'pm-1' },
    },
    {
      method: 'staffingRequestCancelled' as const,
      eventName: 'staffing_request.cancelled',
      payload: { requestId: 'sr-1', requesterPersonId: 'pm-1' },
    },
    {
      method: 'timesheetApproved' as const,
      eventName: 'timesheet.approved',
      payload: { weekId: 'tw-1', weekStart: '2026-04-27', personId: 'p-1' },
    },
    {
      method: 'timesheetRejected' as const,
      eventName: 'timesheet.rejected',
      payload: { weekId: 'tw-1', weekStart: '2026-04-27', personId: 'p-1', reason: 'gaps' },
    },
    {
      method: 'employeeTerminated' as const,
      eventName: 'employee.terminated',
      payload: { personId: 'p-1' },
    },
    {
      method: 'employeeDeactivated' as const,
      eventName: 'employee.deactivated',
      payload: { personId: 'p-1' },
    },
    {
      method: 'integrationSyncFailed' as const,
      eventName: 'integration.sync_failed',
      payload: { errorMessage: 'Token expired', provider: 'jira', resourceType: 'projects' },
    },
  ])('flag-gated $method', ({ method, eventName, payload }) => {
    it(`writes an OutboxEvent (${eventName}) and skips sync dispatch when flag is on`, async () => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (translator as any)[method](payload);

      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0].eventName).toBe(eventName);
      expect(emails).toHaveLength(0);
      expect(inApp.createNotification).not.toHaveBeenCalled();
    });
  });

  it('registers an outbox handler that re-enters the synchronous dispatch on consumption', async () => {
    const { prisma } = buildPrismaStub(false); // flag off so the handler invocation isn't gated
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

    const handler = registry.resolve({ topic: 'notifications', eventName: 'assignment.created' });
    expect(handler).toBeDefined();

    await handler!({
      id: 'outbox-1',
      topic: 'notifications',
      eventName: 'assignment.created',
      aggregateType: 'ProjectAssignment',
      aggregateId: 'asg-1',
      correlationId: null,
      payload: { assignmentId: 'asg-1', personId: 'p-1', projectId: 'pr-1', staffingRole: 'Eng' },
      attempts: 0,
      createdAt: new Date(),
    });

    expect(emails).toHaveLength(1);
    expect(emails[0].payload).toMatchObject({ assignmentId: 'asg-1', personId: 'p-1' });
    expect(inApp.createNotification).toHaveBeenCalledTimes(1);
  });
});
