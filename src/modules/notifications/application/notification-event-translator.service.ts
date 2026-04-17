import { Injectable } from '@nestjs/common';

import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { AppConfig } from '@src/shared/config/app-config';

import { NotificationDispatchService } from './notification-dispatch.service';

@Injectable()
export class NotificationEventTranslatorService {
  public constructor(
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly appConfig: AppConfig,
    private readonly inAppNotificationService?: InAppNotificationService,
  ) {}

  public async assignmentCreated(payload: {
    assignmentId: string;
    personId: string;
    projectId: string;
    staffingRole: string;
  }): Promise<void> {
    await this.sendEmail('assignment.created', 'assignment-created-email', payload);
    if (payload.personId) {
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
    void this.inAppNotificationService?.createNotification(
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
    void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
        payload.requesterPersonId,
        'staffingRequest.fulfilled',
        'Staffing request fulfilled',
        undefined,
        `/staffing-requests/${payload.requestId}`,
      );
    }
    if (payload.assignedPersonId) {
      void this.inAppNotificationService?.createNotification(
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
      void this.inAppNotificationService?.createNotification(
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
    void this.inAppNotificationService?.createNotification(
      payload.personId,
      'assignment.amended',
      'Your assignment has been amended',
      undefined,
      `/assignments/${payload.assignmentId}`,
    );
  }

  public async caseApproved(payload: { caseId: string; subjectPersonId: string }): Promise<void> {
    await this.sendEmail('case.approved', 'case-approved-email', payload);
    void this.inAppNotificationService?.createNotification(
      payload.subjectPersonId,
      'case.approved',
      'Your case has been approved',
      undefined,
      `/cases/${payload.caseId}`,
    );
  }

  public async caseRejected(payload: { caseId: string; subjectPersonId: string; reason: string }): Promise<void> {
    await this.sendEmail('case.rejected', 'case-rejected-email', payload);
    void this.inAppNotificationService?.createNotification(
      payload.subjectPersonId,
      'case.rejected',
      `Your case has been rejected: ${payload.reason}`,
      undefined,
      `/cases/${payload.caseId}`,
    );
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
