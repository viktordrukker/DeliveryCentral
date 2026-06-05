import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';

import { OutboxEventHandlerRegistry } from '@src/modules/audit-observability/application/outbox-event-handler-registry';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { AppConfig } from '@src/shared/config/app-config';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import type { PositionFillStatusValue } from '@src/modules/project-positions/domain/value-objects/position-fill-status';

import { NotificationDispatchService } from './notification-dispatch.service';

const OUTBOX_TOPIC = 'notifications';

/**
 * Stable UUIDv5 namespace for events whose natural key is a non-UUID
 * tuple (e.g., `integration.sync_failed` keyed on `(provider, resourceType)`).
 * Choosing a fixed namespace UUID gives us a reproducible aggregateId so
 * `@db.Uuid` is satisfied and dedup logic can still work cross-process.
 */
const INTEGRATION_SYNC_NAMESPACE = '6c8b2a0e-0001-4000-8000-000000000001';

interface AssignmentCreatedPayload {
  assignmentId: string;
  personId: string;
  projectId: string;
  staffingRole: string;
}

@Injectable()
export class NotificationEventTranslatorService implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventTranslatorService.name);

  public constructor(
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly appConfig: AppConfig,
    private readonly inAppNotificationService?: InAppNotificationService,
    /** Optional — provided in production DI; in unit tests with a stub
     *  PrismaService the flag check defaults to false (sync dispatch). */
    private readonly prisma?: PrismaService,
    /** Optional — registered in production DI. Undefined in unit tests
     *  that exercise the synchronous-dispatch path only. */
    private readonly outboxRegistry?: OutboxEventHandlerRegistry,
    /** Optional — when present, drives the dual-write flag check via
     *  the central registry. When absent, defaults to sync dispatch. */
    private readonly platformFlags?: PlatformFlagsService,
  ) {}

  /**
   * Single source of truth for the (eventName → dispatchMethod) mapping.
   * Adding a new translator event to the dual-write rollout is a single
   * line here plus the (already-existing) `dispatchXxx` private. Used by
   * `onModuleInit` to register handlers and by `dualDispatch` to re-enter
   * the sync path on the consumer side.
   *
   * Aggregate types are PMBOK-aligned domain names; aggregate IDs are
   * pulled out of the payload by the public method before calling
   * `dualDispatch`. The recipe per event:
   *
   *   public async fooHappened(payload) {
   *     await this.dualDispatch({
   *       eventName: 'foo.happened',
   *       aggregateType: 'Foo',
   *       aggregateId: payload.fooId,
   *       payload,
   *       dispatch: () => this.dispatchFooHappened(payload),
   *     });
   *   }
   *
   *   private async dispatchFooHappened(payload) { ...existing body... }
   *
   * Plus: add `{ eventName: 'foo.happened', dispatch: 'dispatchFooHappened' }`
   * to OUTBOX_HANDLERS below.
   */
  private static readonly OUTBOX_HANDLERS = [
    // Assignments
    { eventName: 'assignment.created', dispatch: 'dispatchAssignmentCreated' },
    { eventName: 'assignment.approved', dispatch: 'dispatchAssignmentApproved' },
    { eventName: 'assignment.rejected', dispatch: 'dispatchAssignmentRejected' },
    { eventName: 'assignment.amended', dispatch: 'dispatchAssignmentAmended' },
    { eventName: 'assignment.ended', dispatch: 'dispatchAssignmentEnded' },
    { eventName: 'assignment.status_changed', dispatch: 'dispatchAssignmentStatusChanged' },
    { eventName: 'assignment.onboarding_scheduled', dispatch: 'dispatchAssignmentOnboardingScheduled' },
    { eventName: 'assignment.sla_breached', dispatch: 'dispatchAssignmentSlaBreached' },
    { eventName: 'assignment.sla_pre_breach', dispatch: 'dispatchAssignmentSlaPreBreach' },
    { eventName: 'assignment.escalated_to_case', dispatch: 'dispatchAssignmentEscalatedToCase' },
    { eventName: 'assignment.proposal_submitted', dispatch: 'dispatchProposalSubmitted' },
    { eventName: 'assignment.proposal_acknowledged', dispatch: 'dispatchProposalAcknowledged' },
    {
      eventName: 'assignment.proposal_director_approval_requested',
      dispatch: 'dispatchProposalDirectorApprovalRequested',
    },
    // Project
    { eventName: 'project.submitted_for_approval', dispatch: 'dispatchProjectSubmittedForApproval' },
    { eventName: 'project.approved', dispatch: 'dispatchProjectApproved' },
    { eventName: 'project.rejected', dispatch: 'dispatchProjectRejected' },
    { eventName: 'project.activated', dispatch: 'dispatchProjectActivated' },
    { eventName: 'project.closed', dispatch: 'dispatchProjectClosed' },
    { eventName: 'project.budget_change.requested', dispatch: 'dispatchProjectBudgetChangeRequested' },
    { eventName: 'project.budget_change.approved', dispatch: 'dispatchProjectBudgetChangeApproved' },
    { eventName: 'project.budget_change.rejected', dispatch: 'dispatchProjectBudgetChangeRejected' },
    // Staffing request
    { eventName: 'staffing_request.submitted', dispatch: 'dispatchStaffingRequestSubmitted' },
    { eventName: 'staffing_request.in_review', dispatch: 'dispatchStaffingRequestInReview' },
    { eventName: 'staffing_request.fulfilled', dispatch: 'dispatchStaffingRequestFulfilled' },
    { eventName: 'staffing_request.cancelled', dispatch: 'dispatchStaffingRequestCancelled' },
    // Case
    { eventName: 'case.created', dispatch: 'dispatchCaseCreated' },
    { eventName: 'case.step_completed', dispatch: 'dispatchCaseStepCompleted' },
    { eventName: 'case.closed', dispatch: 'dispatchCaseClosed' },
    { eventName: 'case.approved', dispatch: 'dispatchCaseApproved' },
    { eventName: 'case.rejected', dispatch: 'dispatchCaseRejected' },
    // Timesheet
    { eventName: 'timesheet.approved', dispatch: 'dispatchTimesheetApproved' },
    { eventName: 'timesheet.rejected', dispatch: 'dispatchTimesheetRejected' },
    // Person
    { eventName: 'employee.terminated', dispatch: 'dispatchEmployeeTerminated' },
    { eventName: 'employee.deactivated', dispatch: 'dispatchEmployeeDeactivated' },
    { eventName: 'person.release.requested', dispatch: 'dispatchPersonReleaseRequested' },
    { eventName: 'person.release.partially_approved', dispatch: 'dispatchPersonReleasePartiallyApproved' },
    { eventName: 'person.release.approved', dispatch: 'dispatchPersonReleaseApproved' },
    { eventName: 'person.release.rejected', dispatch: 'dispatchPersonReleaseRejected' },
    // Integration
    { eventName: 'integration.sync_failed', dispatch: 'dispatchIntegrationSyncFailed' },
    // HD-8 / F9b — Nudge categories. Sweeper (chunk 8.3) emits these
    // when an entity is overdue for action. Dispatch produces an email +
    // in-app notification per recipient; rate-limiting / dedup lives on
    // the sweeper.
    { eventName: 'nudge.proposal_acknowledgment_overdue', dispatch: 'dispatchNudgeProposalAcknowledgmentOverdue' },
    { eventName: 'nudge.timesheet_submission_overdue', dispatch: 'dispatchNudgeTimesheetSubmissionOverdue' },
    { eventName: 'nudge.staffing_request_approval_overdue', dispatch: 'dispatchNudgeStaffingRequestApprovalOverdue' },
    { eventName: 'nudge.assignment_approval_overdue', dispatch: 'dispatchNudgeAssignmentApprovalOverdue' },
    // LEAN-P1-5 — lean staffing aggregate fill-status lifecycle. Replaces
    // the legacy `assignment.*` + `staffing_request.*` events listed above.
    // Each ProjectPosition fill-status transition fans out to the same
    // recipient sets as the legacy events; mapping table lives in
    // `dispatchPositionFillChanged()`. Once all callers are on the
    // position-centric path (LEAN-P1-6 .. P1-11), the legacy handlers
    // above can be retired in the LEAN Sprint 5 contract phase.
    { eventName: 'position.fill_changed', dispatch: 'dispatchPositionFillChanged' },
    // LEAN-P4a-1 — Distribution Studio planner-scenario lifecycle.
    // These are content-light notifications (lifecycle audit trail) — the
    // dispatch path is a no-op email; subscribers consume the outbox event
    // directly via the webhook bus.
    { eventName: 'scenario.created', dispatch: 'dispatchScenarioCreated' },
    { eventName: 'scenario.updated', dispatch: 'dispatchScenarioUpdated' },
    { eventName: 'scenario.cancelled', dispatch: 'dispatchScenarioCancelled' },
  ] as const;

  /**
   * HD-0.3 Phase 2 — Register outbox handlers for every event in
   * `OUTBOX_HANDLERS`. Each handler simply re-enters the synchronous
   * dispatch path so the at-least-once guarantee of the outbox publisher
   * composes cleanly with the existing email + in-app fan-out logic.
   * Idempotency lives in the dispatch services, not here.
   */
  public onModuleInit(): void {
    if (!this.outboxRegistry) {
      return;
    }
    for (const entry of NotificationEventTranslatorService.OUTBOX_HANDLERS) {
      const dispatchMethod = entry.dispatch;
      this.outboxRegistry.register(
        { topic: OUTBOX_TOPIC, eventName: entry.eventName },
        async (event) => {
          // Lookup is structural — the dispatch method names live on the
          // class instance and accept a single `payload: unknown` after
          // type narrowing inside each method.
          const fn = (this as unknown as Record<string, (p: unknown) => Promise<void>>)[
            dispatchMethod
          ];
          await fn.call(this, event.payload);
        },
      );
    }
  }

  /**
   * Generic dual-write dispatcher. When `flag.outboxEnabled=true` the
   * payload is persisted to the OutboxEvent table for the publisher to
   * consume; otherwise the closure runs synchronously (legacy path).
   *
   * Caller responsibility: pick a stable `eventName` (matches
   * `OUTBOX_HANDLERS`), set `aggregateType` to the PMBOK-aligned domain
   * name, and pass `aggregateId` from the payload.
   */
  private async dualDispatch(args: {
    eventName: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
    dispatch: () => Promise<void>;
  }): Promise<void> {
    if (await this.isOutboxEnabled()) {
      await this.appendOutbox({
        eventName: args.eventName,
        aggregateType: args.aggregateType,
        aggregateId: args.aggregateId,
        payload: args.payload,
      });
      return;
    }
    await args.dispatch();
  }

  private createInAppNotification(
    recipientPersonId: string,
    eventType: string,
    title: string,
    body: string | undefined,
    link: string,
  ): void {
    if (!this.inAppNotificationService) return;
    this.inAppNotificationService
      .createNotification(recipientPersonId, eventType, title, body, link)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(
          `In-app notification delivery failed for ${eventType} → person ${recipientPersonId}: ${message}`,
        );
      });
  }

  public async assignmentCreated(payload: AssignmentCreatedPayload): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.created',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentCreated(payload),
    });
  }

  /**
   * The actual fan-out for `assignment.created`. Called either:
   *   a) directly from `assignmentCreated()` when the outbox is disabled
   *      (current default), or
   *   b) by the outbox handler registered in `onModuleInit()` when the
   *      publisher dequeues a `notifications/assignment.created` row.
   *
   * Idempotency note: re-entry on (b) re-sends the email + re-creates
   * the in-app notification. Email service is responsible for de-dup
   * via its own `idempotencyKey`; in-app notifications include
   * `assignmentId` in the link, so a duplicate is harmless if rare.
   */
  private async dispatchAssignmentCreated(payload: AssignmentCreatedPayload): Promise<void> {
    await this.sendEmail(
      'assignment.created',
      'assignment-created-email',
      payload,
    );
    if (payload.personId) {
      this.createInAppNotification(
        payload.personId,
        'assignment.created',
        'You have a new assignment',
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  /**
   * Persist a row to `OutboxEvent` so the publisher can deliver it
   * asynchronously. The write opens its own short transaction — the
   * vast majority of translator callers are post-aggregate-tx today
   * (see HD-0.2). When that changes, accept an optional `tx` arg.
   */
  private async appendOutbox(input: {
    eventName: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
  }): Promise<void> {
    if (!this.prisma) {
      this.logger.warn(
        `appendOutbox(${input.eventName}): no PrismaService injected — cannot persist outbox row. Falling back is the caller's responsibility.`,
      );
      return;
    }
    await this.prisma.outboxEvent.create({
      data: {
        topic: OUTBOX_TOPIC,
        eventName: input.eventName,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: input.payload as object,
      },
    });
  }

  private async isOutboxEnabled(): Promise<boolean> {
    if (!this.platformFlags) return false;
    return this.platformFlags.isEnabled('outboxEnabled');
  }

  public async assignmentApproved(payload: {
    assignmentId: string;
    recipientPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.approved',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentApproved(payload),
    });
  }

  private async dispatchAssignmentApproved(payload: {
    assignmentId: string;
    recipientPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('assignment.approved', 'assignment-approved-email', payload);
    if (payload.recipientPersonId) {
      this.createInAppNotification(
        payload.recipientPersonId,
        'assignment.approved',
        'Assignment approved',
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async assignmentRejected(payload: {
    assignmentId: string;
    reason?: string;
    recipientPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.rejected',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentRejected(payload),
    });
  }

  private async dispatchAssignmentRejected(payload: {
    assignmentId: string;
    reason?: string;
    recipientPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('assignment.rejected', 'assignment-rejected-email', payload);
    if (payload.recipientPersonId) {
      this.createInAppNotification(
        payload.recipientPersonId,
        'assignment.rejected',
        'Assignment rejected',
        payload.reason,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async projectActivated(payload: {
    projectId: string;
    projectName: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.activated',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectActivated(payload),
    });
  }

  private async dispatchProjectActivated(payload: {
    projectId: string;
    projectName: string;
  }): Promise<void> {
    await this.sendEmail('project.activated', 'project-activated-email', payload);
  }

  public async projectSubmittedForApproval(payload: {
    projectId: string;
    projectName: string;
    submittedByPersonId: string;
    approvalId: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.submitted_for_approval',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectSubmittedForApproval(payload),
    });
  }

  private async dispatchProjectSubmittedForApproval(payload: {
    projectId: string;
    projectName: string;
    submittedByPersonId: string;
    approvalId: string;
  }): Promise<void> {
    await this.sendEmail(
      'project.submitted_for_approval',
      'project-submitted-for-approval-email',
      payload,
    );
  }

  public async projectApproved(payload: {
    projectId: string;
    projectName: string;
    approvedByPersonId: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.approved',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectApproved(payload),
    });
  }

  private async dispatchProjectApproved(payload: {
    projectId: string;
    projectName: string;
    approvedByPersonId: string;
  }): Promise<void> {
    await this.sendEmail(
      'project.approved',
      'project-approved-email',
      payload,
    );
  }

  public async projectRejected(payload: {
    projectId: string;
    projectName: string;
    rejectedByPersonId: string;
    reason: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.rejected',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectRejected(payload),
    });
  }

  private async dispatchProjectRejected(payload: {
    projectId: string;
    projectName: string;
    rejectedByPersonId: string;
    reason: string;
  }): Promise<void> {
    await this.sendEmail(
      'project.rejected',
      'project-rejected-email',
      payload,
    );
  }

  public async projectBudgetChangeRequested(payload: {
    projectId: string;
    approvalId: string;
    requestedByPersonId: string;
    capexBudget: number;
    opexBudget: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.budget_change.requested',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectBudgetChangeRequested(payload),
    });
  }

  private async dispatchProjectBudgetChangeRequested(payload: {
    projectId: string;
    approvalId: string;
    requestedByPersonId: string;
    capexBudget: number;
    opexBudget: number;
  }): Promise<void> {
    await this.sendEmail(
      'project.budget_change.requested',
      'project-budget-change-requested-email',
      payload,
    );
  }

  public async projectBudgetChangeApproved(payload: {
    projectId: string;
    approvalId: string;
    approvedByPersonId: string;
    capexBudget: number;
    opexBudget: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.budget_change.approved',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectBudgetChangeApproved(payload),
    });
  }

  private async dispatchProjectBudgetChangeApproved(payload: {
    projectId: string;
    approvalId: string;
    approvedByPersonId: string;
    capexBudget: number;
    opexBudget: number;
  }): Promise<void> {
    await this.sendEmail(
      'project.budget_change.approved',
      'project-budget-change-approved-email',
      payload,
    );
  }

  public async projectBudgetChangeRejected(payload: {
    projectId: string;
    approvalId: string;
    rejectedByPersonId: string;
    reason: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.budget_change.rejected',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectBudgetChangeRejected(payload),
    });
  }

  private async dispatchProjectBudgetChangeRejected(payload: {
    projectId: string;
    approvalId: string;
    rejectedByPersonId: string;
    reason: string;
  }): Promise<void> {
    await this.sendEmail(
      'project.budget_change.rejected',
      'project-budget-change-rejected-email',
      payload,
    );
  }

  public async projectClosed(payload: {
    projectId: string;
    projectName: string;
    totalMandays: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'project.closed',
      aggregateType: 'Project',
      aggregateId: payload.projectId,
      payload,
      dispatch: () => this.dispatchProjectClosed(payload),
    });
  }

  private async dispatchProjectClosed(payload: {
    projectId: string;
    projectName: string;
    totalMandays: number;
  }): Promise<void> {
    await this.sendEmail('project.closed', 'project-closed-email', payload);
  }

  public async caseCreated(payload: {
    caseId: string;
    caseType: string;
    ownerPersonId: string;
    subjectPersonId: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'case.created',
      aggregateType: 'CaseRecord',
      aggregateId: payload.caseId,
      payload,
      dispatch: () => this.dispatchCaseCreated(payload),
    });
  }

  private async dispatchCaseCreated(payload: {
    caseId: string;
    caseType: string;
    ownerPersonId: string;
    subjectPersonId: string;
  }): Promise<void> {
    await this.sendEmail('case.created', 'case-created-email', payload);
    if (payload.subjectPersonId) {
      this.createInAppNotification(
        payload.subjectPersonId,
        'case.created',
        'A case has been opened',
        undefined,
        `/cases/${payload.caseId}`,
      );
    }
  }

  public async caseStepCompleted(payload: {
    caseId: string;
    ownerPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'case.step_completed',
      aggregateType: 'CaseRecord',
      aggregateId: payload.caseId,
      payload,
      dispatch: () => this.dispatchCaseStepCompleted(payload),
    });
  }

  private async dispatchCaseStepCompleted(payload: {
    caseId: string;
    ownerPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('case.step_completed', 'case-step-completed-email', payload);
    if (payload.ownerPersonId) {
      this.createInAppNotification(
        payload.ownerPersonId,
        'case.step_completed',
        'Case step completed',
        undefined,
        `/cases/${payload.caseId}`,
      );
    }
  }

  public async caseClosed(payload: {
    caseId: string;
    subjectPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'case.closed',
      aggregateType: 'CaseRecord',
      aggregateId: payload.caseId,
      payload,
      dispatch: () => this.dispatchCaseClosed(payload),
    });
  }

  private async dispatchCaseClosed(payload: {
    caseId: string;
    subjectPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('case.closed', 'case-closed-email', payload);
    if (payload.subjectPersonId) {
      this.createInAppNotification(
        payload.subjectPersonId,
        'case.closed',
        'Your case has been closed',
        undefined,
        `/cases/${payload.caseId}`,
      );
    }
  }

  public async assignmentEnded(payload: { assignmentId: string }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.ended',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentEnded(payload),
    });
  }

  private async dispatchAssignmentEnded(payload: { assignmentId: string }): Promise<void> {
    await this.sendEmail('assignment.ended', 'assignment-ended-email', payload);
  }

  public async assignmentStatusChanged(payload: {
    assignmentId: string;
    previousStatus: string;
    reason?: string;
    recipientPersonId?: string;
    status: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.status_changed',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentStatusChanged(payload),
    });
  }

  private async dispatchAssignmentStatusChanged(payload: {
    assignmentId: string;
    previousStatus: string;
    reason?: string;
    recipientPersonId?: string;
    status: string;
  }): Promise<void> {
    const eventType = `assignment.${payload.status.toLowerCase()}`;
    await this.sendEmail(eventType, `assignment-${payload.status.toLowerCase()}-email`, payload);
    if (payload.recipientPersonId) {
      this.createInAppNotification(
        payload.recipientPersonId,
        eventType,
        `Assignment ${payload.status.toLowerCase().replace('_', ' ')}`,
        payload.reason,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async personReleaseRequested(payload: {
    requestId: string;
    personId: string;
    initiatedByPersonId: string;
    targetTerminationDate: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'person.release.requested',
      aggregateType: 'PersonReleaseRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchPersonReleaseRequested(payload),
    });
  }

  private async dispatchPersonReleaseRequested(payload: {
    requestId: string;
    personId: string;
    initiatedByPersonId: string;
    targetTerminationDate: string;
  }): Promise<void> {
    await this.sendEmail(
      'person.release.requested',
      'person-release-requested-email',
      payload,
    );
  }

  public async personReleasePartiallyApproved(payload: {
    requestId: string;
    personId: string;
    approvedByPersonId: string;
    approvedByRole: 'hr_manager' | 'director';
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'person.release.partially_approved',
      aggregateType: 'PersonReleaseRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchPersonReleasePartiallyApproved(payload),
    });
  }

  private async dispatchPersonReleasePartiallyApproved(payload: {
    requestId: string;
    personId: string;
    approvedByPersonId: string;
    approvedByRole: 'hr_manager' | 'director';
  }): Promise<void> {
    await this.sendEmail(
      'person.release.partially_approved',
      'person-release-partially-approved-email',
      payload,
    );
  }

  public async personReleaseApproved(payload: {
    requestId: string;
    personId: string;
    approvedByPersonId: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'person.release.approved',
      aggregateType: 'PersonReleaseRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchPersonReleaseApproved(payload),
    });
  }

  private async dispatchPersonReleaseApproved(payload: {
    requestId: string;
    personId: string;
    approvedByPersonId: string;
  }): Promise<void> {
    await this.sendEmail(
      'person.release.approved',
      'person-release-approved-email',
      payload,
    );
  }

  public async personReleaseRejected(payload: {
    requestId: string;
    personId: string;
    rejectedByPersonId: string;
    decisionRole: 'hr_manager' | 'director';
    reason: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'person.release.rejected',
      aggregateType: 'PersonReleaseRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchPersonReleaseRejected(payload),
    });
  }

  private async dispatchPersonReleaseRejected(payload: {
    requestId: string;
    personId: string;
    rejectedByPersonId: string;
    decisionRole: 'hr_manager' | 'director';
    reason: string;
  }): Promise<void> {
    await this.sendEmail(
      'person.release.rejected',
      'person-release-rejected-email',
      payload,
    );
  }

  public async employeeTerminated(payload: { personId: string }): Promise<void> {
    await this.dualDispatch({
      eventName: 'employee.terminated',
      aggregateType: 'Person',
      aggregateId: payload.personId,
      payload,
      dispatch: () => this.dispatchEmployeeTerminated(payload),
    });
  }

  private async dispatchEmployeeTerminated(payload: { personId: string }): Promise<void> {
    if (!this.appConfig.notificationsDefaultTeamsWebhookRecipient) {
      return;
    }

    await this.dispatchQuietly({
      channelKey: 'ms_teams_webhook',
      eventName: 'employee.terminated',
      payload,
      recipient: this.appConfig.notificationsDefaultTeamsWebhookRecipient,
      templateKey: 'employee-terminated-teams',
    });
  }

  public async integrationSyncFailed(payload: {
    errorMessage: string;
    provider: string;
    resourceType: string;
  }): Promise<void> {
    // HD-0.3 follow-up — natural key is `(provider, resourceType)`. A
    // UUIDv5 over a stable namespace gives us a reproducible
    // aggregateId that satisfies `OutboxEvent.aggregateId @db.Uuid`.
    // Same input → same UUID → dedupable cross-process.
    const aggregateId = uuidv5(
      `${payload.provider}::${payload.resourceType}`,
      INTEGRATION_SYNC_NAMESPACE,
    );
    await this.dualDispatch({
      eventName: 'integration.sync_failed',
      aggregateType: 'IntegrationSyncState',
      aggregateId,
      payload,
      dispatch: () => this.dispatchIntegrationSyncFailed(payload),
    });
  }

  private async dispatchIntegrationSyncFailed(payload: {
    errorMessage: string;
    provider: string;
    resourceType: string;
  }): Promise<void> {
    if (!this.appConfig.notificationsDefaultTeamsWebhookRecipient) {
      return;
    }

    await this.dispatchQuietly({
      channelKey: 'ms_teams_webhook',
      eventName: 'integration.sync_failed',
      payload,
      recipient: this.appConfig.notificationsDefaultTeamsWebhookRecipient,
      templateKey: 'integration-sync-failed-teams',
    });
  }

  // ── Timesheet Events ─────────────────────────────────────────────────

  public async timesheetApproved(payload: {
    weekId: string;
    weekStart: string;
    personId: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'timesheet.approved',
      aggregateType: 'TimesheetWeek',
      aggregateId: payload.weekId,
      payload,
      dispatch: () => this.dispatchTimesheetApproved(payload),
    });
  }

  private async dispatchTimesheetApproved(payload: {
    weekId: string;
    weekStart: string;
    personId: string;
  }): Promise<void> {
    await this.sendEmail('timesheet.approved', 'timesheet-approved-email', payload);
    this.createInAppNotification(
      payload.personId,
      'timesheet.approved',
      `Timesheet approved for week of ${payload.weekStart}`,
      undefined,
      '/timesheets',
    );
  }

  public async timesheetRejected(payload: {
    weekId: string;
    weekStart: string;
    personId: string;
    reason?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'timesheet.rejected',
      aggregateType: 'TimesheetWeek',
      aggregateId: payload.weekId,
      payload,
      dispatch: () => this.dispatchTimesheetRejected(payload),
    });
  }

  private async dispatchTimesheetRejected(payload: {
    weekId: string;
    weekStart: string;
    personId: string;
    reason?: string;
  }): Promise<void> {
    await this.sendEmail('timesheet.rejected', 'timesheet-rejected-email', payload);
    this.createInAppNotification(
      payload.personId,
      'timesheet.rejected',
      `Timesheet rejected for week of ${payload.weekStart}`,
      payload.reason,
      '/timesheets',
    );
  }

  // ── Staffing Request Events ───────────────────────────────────────────

  public async staffingRequestSubmitted(payload: {
    requestId: string;
    projectId: string;
    role: string;
    ownerPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'staffing_request.submitted',
      aggregateType: 'StaffingRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchStaffingRequestSubmitted(payload),
    });
  }

  private async dispatchStaffingRequestSubmitted(payload: {
    requestId: string;
    projectId: string;
    role: string;
    ownerPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('staffingRequest.submitted', 'staffing-request-submitted-email', payload);
    if (payload.ownerPersonId) {
      this.createInAppNotification(
        payload.ownerPersonId,
        'staffingRequest.submitted',
        `New staffing request for role: ${payload.role}`,
        undefined,
        `/staffing-requests/${payload.requestId}`,
      );
    }
  }

  public async staffingRequestInReview(payload: {
    requestId: string;
    requesterPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'staffing_request.in_review',
      aggregateType: 'StaffingRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchStaffingRequestInReview(payload),
    });
  }

  private async dispatchStaffingRequestInReview(payload: {
    requestId: string;
    requesterPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('staffingRequest.inReview', 'staffing-request-in-review-email', payload);
    if (payload.requesterPersonId) {
      this.createInAppNotification(
        payload.requesterPersonId,
        'staffingRequest.inReview',
        'Your staffing request is under review',
        undefined,
        `/staffing-requests/${payload.requestId}`,
      );
    }
  }

  public async staffingRequestFulfilled(payload: {
    requestId: string;
    requesterPersonId?: string;
    assignedPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'staffing_request.fulfilled',
      aggregateType: 'StaffingRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchStaffingRequestFulfilled(payload),
    });
  }

  private async dispatchStaffingRequestFulfilled(payload: {
    requestId: string;
    requesterPersonId?: string;
    assignedPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('staffingRequest.fulfilled', 'staffing-request-fulfilled-email', payload);
    if (payload.requesterPersonId) {
      this.createInAppNotification(
        payload.requesterPersonId,
        'staffingRequest.fulfilled',
        'Staffing request fulfilled',
        undefined,
        `/staffing-requests/${payload.requestId}`,
      );
    }
    if (payload.assignedPersonId) {
      this.createInAppNotification(
        payload.assignedPersonId,
        'staffingRequest.fulfilled',
        'You have been assigned to fill a staffing request',
        undefined,
        `/staffing-requests/${payload.requestId}`,
      );
    }
  }

  public async staffingRequestCancelled(payload: {
    requestId: string;
    requesterPersonId?: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'staffing_request.cancelled',
      aggregateType: 'StaffingRequest',
      aggregateId: payload.requestId,
      payload,
      dispatch: () => this.dispatchStaffingRequestCancelled(payload),
    });
  }

  private async dispatchStaffingRequestCancelled(payload: {
    requestId: string;
    requesterPersonId?: string;
  }): Promise<void> {
    await this.sendEmail('staffingRequest.cancelled', 'staffing-request-cancelled-email', payload);
    if (payload.requesterPersonId) {
      this.createInAppNotification(
        payload.requesterPersonId,
        'staffingRequest.cancelled',
        'Staffing request cancelled',
        undefined,
        `/staffing-requests/${payload.requestId}`,
      );
    }
  }

  public async employeeDeactivated(payload: { personId: string }): Promise<void> {
    await this.dualDispatch({
      eventName: 'employee.deactivated',
      aggregateType: 'Person',
      aggregateId: payload.personId,
      payload,
      dispatch: () => this.dispatchEmployeeDeactivated(payload),
    });
  }

  private async dispatchEmployeeDeactivated(payload: { personId: string }): Promise<void> {
    await this.sendEmail('employee.deactivated', 'employee-deactivated-email', payload);
  }

  public async assignmentAmended(payload: { assignmentId: string; personId: string }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.amended',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentAmended(payload),
    });
  }

  private async dispatchAssignmentAmended(payload: { assignmentId: string; personId: string }): Promise<void> {
    await this.sendEmail('assignment.amended', 'assignment-amended-email', payload);
    this.createInAppNotification(
      payload.personId,
      'assignment.amended',
      'Your assignment has been amended',
      undefined,
      `/assignments/${payload.assignmentId}`,
    );
  }

  public async caseApproved(payload: { caseId: string; subjectPersonId: string }): Promise<void> {
    await this.dualDispatch({
      eventName: 'case.approved',
      aggregateType: 'CaseRecord',
      aggregateId: payload.caseId,
      payload,
      dispatch: () => this.dispatchCaseApproved(payload),
    });
  }

  private async dispatchCaseApproved(payload: { caseId: string; subjectPersonId: string }): Promise<void> {
    await this.sendEmail('case.approved', 'case-approved-email', payload);
    this.createInAppNotification(
      payload.subjectPersonId,
      'case.approved',
      'Your case has been approved',
      undefined,
      `/cases/${payload.caseId}`,
    );
  }

  public async caseRejected(payload: { caseId: string; subjectPersonId: string; reason: string }): Promise<void> {
    await this.dualDispatch({
      eventName: 'case.rejected',
      aggregateType: 'CaseRecord',
      aggregateId: payload.caseId,
      payload,
      dispatch: () => this.dispatchCaseRejected(payload),
    });
  }

  private async dispatchCaseRejected(payload: { caseId: string; subjectPersonId: string; reason: string }): Promise<void> {
    await this.sendEmail('case.rejected', 'case-rejected-email', payload);
    this.createInAppNotification(
      payload.subjectPersonId,
      'case.rejected',
      `Your case has been rejected: ${payload.reason}`,
      undefined,
      `/cases/${payload.caseId}`,
    );
  }

  // ── Workflow Overhaul Phase WO-3 — proposal slate + SLA events ──────────────

  public async proposalSubmitted(payload: {
    assignmentId: string;
    candidateCount: number;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.proposal_submitted',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchProposalSubmitted(payload),
    });
  }

  private async dispatchProposalSubmitted(payload: {
    assignmentId: string;
    candidateCount: number;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail('assignment.proposal_submitted', 'assignment-proposal-submitted-email', {
      assignmentId: payload.assignmentId,
      candidateCount: payload.candidateCount,
    });
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.proposal_submitted',
        `Proposal slate submitted (${payload.candidateCount} candidate${payload.candidateCount === 1 ? '' : 's'})`,
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async proposalAcknowledged(payload: {
    assignmentId: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.proposal_acknowledged',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchProposalAcknowledged(payload),
    });
  }

  private async dispatchProposalAcknowledged(payload: {
    assignmentId: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail('assignment.proposal_acknowledged', 'assignment-proposal-acknowledged-email', {
      assignmentId: payload.assignmentId,
    });
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.proposal_acknowledged',
        'Reviewer is engaged with your proposal',
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async proposalDirectorApprovalRequested(payload: {
    assignmentId: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.proposal_director_approval_requested',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchProposalDirectorApprovalRequested(payload),
    });
  }

  private async dispatchProposalDirectorApprovalRequested(payload: {
    assignmentId: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail(
      'assignment.proposal_director_approval_requested',
      'assignment-proposal-director-approval-email',
      { assignmentId: payload.assignmentId },
    );
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.proposal_director_approval_requested',
        'Director approval needed',
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async assignmentOnboardingScheduled(payload: {
    assignmentId: string;
    onboardingDate: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.onboarding_scheduled',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentOnboardingScheduled(payload),
    });
  }

  private async dispatchAssignmentOnboardingScheduled(payload: {
    assignmentId: string;
    onboardingDate: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail(
      'assignment.onboarding_scheduled',
      'assignment-onboarding-scheduled-email',
      { assignmentId: payload.assignmentId, onboardingDate: payload.onboardingDate },
    );
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.onboarding_scheduled',
        `Onboarding scheduled for ${payload.onboardingDate}`,
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async assignmentSlaBreached(payload: {
    assignmentId: string;
    slaStage: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.sla_breached',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentSlaBreached(payload),
    });
  }

  private async dispatchAssignmentSlaBreached(payload: {
    assignmentId: string;
    slaStage: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail('assignment.sla_breached', 'assignment-sla-breached-email', {
      assignmentId: payload.assignmentId,
      slaStage: payload.slaStage,
    });
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.sla_breached',
        `Assignment SLA breached (${payload.slaStage})`,
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  // HD-10 — pre-breach warning. Same dispatch shape as the breach
  // event but distinguishable in payload + template by `warnLevel`.
  public async assignmentSlaPreBreach(payload: {
    assignmentId: string;
    slaStage: string;
    warnLevel: '50pct' | '75pct';
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.sla_pre_breach',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentSlaPreBreach(payload),
    });
  }

  private async dispatchAssignmentSlaPreBreach(payload: {
    assignmentId: string;
    slaStage: string;
    warnLevel: '50pct' | '75pct';
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail(
      'assignment.sla_pre_breach',
      'assignment-sla-pre-breach-email',
      {
        assignmentId: payload.assignmentId,
        slaStage: payload.slaStage,
        warnLevel: payload.warnLevel,
      },
    );
    const friendly = payload.warnLevel === '75pct' ? '75%' : '50%';
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.sla_pre_breach',
        `Assignment SLA at ${friendly} (${payload.slaStage})`,
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  // HD-8 / F9b — Nudge events. Each one accepts a `recipientPersonIds`
  // array (the people whose action is overdue) plus a category-specific
  // entity id used to deep-link the in-app notification. Dispatch goes
  // through the standard email + in-app pair; rate-limit / dedup is the
  // sweeper's job (chunk 8.3), not the translator's.

  public async nudgeProposalAcknowledgmentOverdue(payload: {
    proposalId: string;
    staffingRequestId: string;
    requesterPersonId: string;
    recipientPersonIds: readonly string[];
    overdueByHours: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'nudge.proposal_acknowledgment_overdue',
      aggregateType: 'StaffingRequest',
      aggregateId: payload.staffingRequestId,
      payload,
      dispatch: () => this.dispatchNudgeProposalAcknowledgmentOverdue(payload),
    });
  }

  private async dispatchNudgeProposalAcknowledgmentOverdue(payload: {
    proposalId: string;
    staffingRequestId: string;
    requesterPersonId: string;
    recipientPersonIds: readonly string[];
    overdueByHours: number;
  }): Promise<void> {
    await this.sendEmail(
      'nudge.proposal_acknowledgment_overdue',
      'nudge-proposal-ack-overdue-email',
      {
        proposalId: payload.proposalId,
        staffingRequestId: payload.staffingRequestId,
        overdueByHours: payload.overdueByHours,
      },
    );
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'nudge.proposal_acknowledgment_overdue',
        `Reminder: a staffing proposal needs your acknowledgment (${payload.overdueByHours}h overdue)`,
        undefined,
        `/staffing-requests/${payload.staffingRequestId}`,
      );
    }
  }

  public async nudgeTimesheetSubmissionOverdue(payload: {
    personId: string;
    weekStart: string;
    overdueByHours: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'nudge.timesheet_submission_overdue',
      aggregateType: 'TimesheetWeek',
      aggregateId: payload.personId,
      payload,
      dispatch: () => this.dispatchNudgeTimesheetSubmissionOverdue(payload),
    });
  }

  private async dispatchNudgeTimesheetSubmissionOverdue(payload: {
    personId: string;
    weekStart: string;
    overdueByHours: number;
  }): Promise<void> {
    await this.sendEmail(
      'nudge.timesheet_submission_overdue',
      'nudge-timesheet-overdue-email',
      {
        personId: payload.personId,
        weekStart: payload.weekStart,
        overdueByHours: payload.overdueByHours,
      },
    );
    this.createInAppNotification(
      payload.personId,
      'nudge.timesheet_submission_overdue',
      `Reminder: submit your timesheet for week of ${payload.weekStart}`,
      undefined,
      `/time/my`,
    );
  }

  public async nudgeStaffingRequestApprovalOverdue(payload: {
    staffingRequestId: string;
    recipientPersonIds: readonly string[];
    overdueByHours: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'nudge.staffing_request_approval_overdue',
      aggregateType: 'StaffingRequest',
      aggregateId: payload.staffingRequestId,
      payload,
      dispatch: () => this.dispatchNudgeStaffingRequestApprovalOverdue(payload),
    });
  }

  private async dispatchNudgeStaffingRequestApprovalOverdue(payload: {
    staffingRequestId: string;
    recipientPersonIds: readonly string[];
    overdueByHours: number;
  }): Promise<void> {
    await this.sendEmail(
      'nudge.staffing_request_approval_overdue',
      'nudge-staffing-request-approval-overdue-email',
      {
        staffingRequestId: payload.staffingRequestId,
        overdueByHours: payload.overdueByHours,
      },
    );
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'nudge.staffing_request_approval_overdue',
        `Reminder: a staffing request awaits your approval (${payload.overdueByHours}h overdue)`,
        undefined,
        `/staffing-requests/${payload.staffingRequestId}`,
      );
    }
  }

  public async nudgeAssignmentApprovalOverdue(payload: {
    assignmentId: string;
    recipientPersonIds: readonly string[];
    overdueByHours: number;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'nudge.assignment_approval_overdue',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchNudgeAssignmentApprovalOverdue(payload),
    });
  }

  private async dispatchNudgeAssignmentApprovalOverdue(payload: {
    assignmentId: string;
    recipientPersonIds: readonly string[];
    overdueByHours: number;
  }): Promise<void> {
    await this.sendEmail(
      'nudge.assignment_approval_overdue',
      'nudge-assignment-approval-overdue-email',
      {
        assignmentId: payload.assignmentId,
        overdueByHours: payload.overdueByHours,
      },
    );
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'nudge.assignment_approval_overdue',
        `Reminder: an assignment awaits your approval (${payload.overdueByHours}h overdue)`,
        undefined,
        `/assignments/${payload.assignmentId}`,
      );
    }
  }

  public async assignmentEscalatedToCase(payload: {
    assignmentId: string;
    caseId: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'assignment.escalated_to_case',
      aggregateType: 'ProjectAssignment',
      aggregateId: payload.assignmentId,
      payload,
      dispatch: () => this.dispatchAssignmentEscalatedToCase(payload),
    });
  }

  private async dispatchAssignmentEscalatedToCase(payload: {
    assignmentId: string;
    caseId: string;
    recipientPersonIds: readonly string[];
  }): Promise<void> {
    await this.sendEmail(
      'assignment.escalated_to_case',
      'assignment-escalated-to-case-email',
      { assignmentId: payload.assignmentId, caseId: payload.caseId },
    );
    for (const recipient of payload.recipientPersonIds) {
      this.createInAppNotification(
        recipient,
        'assignment.escalated_to_case',
        'Assignment escalated to a case',
        undefined,
        `/cases/${payload.caseId}`,
      );
    }
  }

  // ── LEAN-P1-5 — Position fill-status lifecycle ─────────────────────────
  // Single entry point for `ProjectPositionFillChangedEvent` (S2-7). Routes
  // transitions to the equivalent legacy email + in-app notification flows
  // so user-facing notifications remain identical pre/post lean migration.
  // Mapping table (fromStatus → toStatus → legacy event):
  //   DRAFT → OPEN              : position.opened (search starts)
  //   OPEN → PROPOSED           : assignment.created (candidate proposed)
  //   PROPOSED → BOOKED         : assignment.approved
  //   PROPOSED → OPEN           : assignment.rejected
  //   BOOKED → ONBOARDING       : assignment.onboarding_scheduled
  //   BOOKED → ASSIGNED         : assignment.status_changed (ASSIGNED)
  //   ONBOARDING → ASSIGNED     : assignment.status_changed (ASSIGNED)
  //   ASSIGNED → ON_HOLD        : assignment.status_changed (ON_HOLD)
  //   ON_HOLD → ASSIGNED        : assignment.status_changed (ASSIGNED)
  //   any → RELEASED (filled)   : assignment.ended
  //   any → RELEASED (unfilled) : staffing_request.cancelled
  public async positionFillChanged(payload: {
    positionId: string;
    projectId: string;
    fromStatus: PositionFillStatusValue;
    toStatus: PositionFillStatusValue;
    actorPersonId: string;
    activePersonId?: string;
    reason?: string;
    occurredAt: Date | string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'position.fill_changed',
      aggregateType: 'ProjectPosition',
      aggregateId: payload.positionId,
      payload,
      dispatch: () => this.dispatchPositionFillChanged(payload),
    });
  }

  private async dispatchPositionFillChanged(payload: {
    positionId: string;
    projectId: string;
    fromStatus: PositionFillStatusValue;
    toStatus: PositionFillStatusValue;
    actorPersonId: string;
    activePersonId?: string;
    reason?: string;
    occurredAt: Date | string;
  }): Promise<void> {
    const { fromStatus, toStatus, positionId, activePersonId, reason } = payload;
    const link = `/positions/${positionId}`;

    // Terminal release path — differentiate filled vs unfilled.
    if (toStatus === 'RELEASED') {
      if (activePersonId) {
        // Filled position released — mirrors legacy assignment.ended.
        await this.sendEmail('position.fill_changed', 'assignment-ended-email', payload);
        this.createInAppNotification(
          activePersonId,
          'assignment.ended',
          'Your assignment has ended',
          reason,
          link,
        );
      } else {
        // Unfilled position released — mirrors legacy staffing_request.cancelled.
        await this.sendEmail('position.fill_changed', 'staffing-request-cancelled-email', payload);
      }
      return;
    }

    if (fromStatus === 'DRAFT' && toStatus === 'OPEN') {
      await this.sendEmail('position.fill_changed', 'staffing-request-submitted-email', payload);
      return;
    }

    if (fromStatus === 'OPEN' && toStatus === 'PROPOSED') {
      await this.sendEmail('position.fill_changed', 'assignment-created-email', payload);
      if (activePersonId) {
        this.createInAppNotification(
          activePersonId,
          'assignment.created',
          'You have a new assignment',
          undefined,
          link,
        );
      }
      return;
    }

    if (fromStatus === 'PROPOSED' && toStatus === 'OPEN') {
      await this.sendEmail('position.fill_changed', 'assignment-rejected-email', payload);
      if (activePersonId) {
        this.createInAppNotification(
          activePersonId,
          'assignment.rejected',
          'Assignment rejected',
          reason,
          link,
        );
      }
      return;
    }

    if (fromStatus === 'PROPOSED' && toStatus === 'BOOKED') {
      await this.sendEmail('position.fill_changed', 'assignment-approved-email', payload);
      if (activePersonId) {
        this.createInAppNotification(
          activePersonId,
          'assignment.approved',
          'Assignment approved',
          undefined,
          link,
        );
      }
      return;
    }

    if (fromStatus === 'BOOKED' && toStatus === 'ONBOARDING') {
      await this.sendEmail(
        'position.fill_changed',
        'assignment-onboarding-scheduled-email',
        payload,
      );
      if (activePersonId) {
        this.createInAppNotification(
          activePersonId,
          'assignment.onboarding_scheduled',
          'Onboarding scheduled',
          undefined,
          link,
        );
      }
      return;
    }

    // Status changes among active states fan out via the generic
    // status-change template, matching legacy assignment.status_changed.
    const eventType = `assignment.${toStatus.toLowerCase()}`;
    await this.sendEmail('position.fill_changed', `assignment-${toStatus.toLowerCase()}-email`, payload);
    if (activePersonId) {
      this.createInAppNotification(
        activePersonId,
        eventType,
        `Assignment ${toStatus.toLowerCase().replace('_', ' ')}`,
        reason,
        link,
      );
    }
  }

  // F-35 / 20c-11 — accept any object-shaped payload. Callers previously
  // had to `as unknown as Record<string, unknown>` because TS won't
  // narrow an interface or inline typed payload into the open
  // index-signature shape on its own. Centralising the conversion in
  // one place drops 11 cast sites from the dispatchers below.
  private async sendEmail(
    eventName: string,
    templateKey: string,
    payload: object,
  ): Promise<void> {
    if (!this.appConfig.notificationsDefaultEmailRecipient) {
      return;
    }

    await this.dispatchQuietly({
      channelKey: 'email',
      eventName,
      payload: payload as Record<string, unknown>,
      recipient: this.appConfig.notificationsDefaultEmailRecipient,
      templateKey,
    });
  }

  private async dispatchQuietly(command: {
    channelKey: string;
    eventName: string;
    payload: Record<string, unknown>;
    recipient: string;
    templateKey: string;
  }): Promise<void> {
    try {
      await this.notificationDispatchService.dispatch(command);
    } catch {
      // Notification infrastructure must not block the originating business workflow.
    }
  }

  // ── Planner Scenario Events (LEAN-P4a-1) ────────────────────────────
  //
  // Distribution Studio scenarios are author-facing simulations — the
  // primary consumer is the outbox / webhook bus (for audit forwarding
  // into bank PPM tooling), not end-user email. The dispatch handlers
  // are intentionally minimal: they exist so the OUTBOX_HANDLERS list
  // stays in lockstep with WEBHOOK_EVENT_TYPES (enforced by the
  // F-27 / D-170 webhook-event-types.spec.ts).

  public async scenarioCreated(payload: {
    scenarioId: string;
    actorPersonId: string;
    name: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'scenario.created',
      aggregateType: 'PlannerScenario',
      aggregateId: payload.scenarioId,
      payload,
      dispatch: () => this.dispatchScenarioCreated(payload),
    });
  }

  private async dispatchScenarioCreated(_payload: object): Promise<void> {
    // No-op email dispatch; webhook subscribers consume via the outbox.
    return;
  }

  public async scenarioUpdated(payload: {
    scenarioId: string;
    actorPersonId: string;
    fields: readonly string[];
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'scenario.updated',
      aggregateType: 'PlannerScenario',
      aggregateId: payload.scenarioId,
      payload,
      dispatch: () => this.dispatchScenarioUpdated(payload),
    });
  }

  private async dispatchScenarioUpdated(_payload: object): Promise<void> {
    return;
  }

  public async scenarioCancelled(payload: {
    scenarioId: string;
    actorPersonId: string;
  }): Promise<void> {
    await this.dualDispatch({
      eventName: 'scenario.cancelled',
      aggregateType: 'PlannerScenario',
      aggregateId: payload.scenarioId,
      payload,
      dispatch: () => this.dispatchScenarioCancelled(payload),
    });
  }

  private async dispatchScenarioCancelled(_payload: object): Promise<void> {
    return;
  }
}
