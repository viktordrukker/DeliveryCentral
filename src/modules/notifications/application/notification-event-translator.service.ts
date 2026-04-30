import { Injectable, Logger } from '@nestjs/common';

import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { AppConfig } from '@src/shared/config/app-config';

import { NotificationDispatchService } from './notification-dispatch.service';

@Injectable()
export class NotificationEventTranslatorService {
  private readonly logger = new Logger(NotificationEventTranslatorService.name);

  public constructor(
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly appConfig: AppConfig,
    private readonly inAppNotificationService?: InAppNotificationService,
  ) {}

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

  public async assignmentCreated(payload: {
    assignmentId: string;
    personId: string;
    projectId: string;
    staffingRole: string;
  }): Promise<void> {
    await this.sendEmail('assignment.created', 'assignment-created-email', payload);
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

  public async assignmentApproved(payload: {
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
    await this.sendEmail('project.activated', 'project-activated-email', payload);
  }

  public async projectClosed(payload: {
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
    await this.sendEmail('assignment.ended', 'assignment-ended-email', payload);
  }

  public async assignmentStatusChanged(payload: {
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

  public async employeeTerminated(payload: { personId: string }): Promise<void> {
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
    await this.sendEmail('employee.deactivated', 'employee-deactivated-email', payload);
  }

  public async assignmentAmended(payload: { assignmentId: string; personId: string }): Promise<void> {
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

  public async assignmentEscalatedToCase(payload: {
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

  private async sendEmail(
    eventName: string,
    templateKey: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.appConfig.notificationsDefaultEmailRecipient) {
      return;
    }

    await this.dispatchQuietly({
      channelKey: 'email',
      eventName,
      payload,
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
}
