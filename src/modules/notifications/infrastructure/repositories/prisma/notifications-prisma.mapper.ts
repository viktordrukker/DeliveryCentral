import { NotificationChannel } from '../../../domain/entities/notification-channel.entity';
import { NotificationDelivery } from '../../../domain/entities/notification-delivery.entity';
import { NotificationRequest } from '../../../domain/entities/notification-request.entity';
import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';

export class NotificationsPrismaMapper {
  public static toNotificationChannel(record: {
    id: string;
    channelKey: string;
    config: Record<string, unknown> | null;
    displayName: string;
    isEnabled: boolean;
    kind: string;
  }): NotificationChannel {
    return NotificationChannel.create(
      {
        channelKey: record.channelKey,
        config: record.config ?? undefined,
        displayName: record.displayName,
        isEnabled: record.isEnabled,
        kind: record.kind,
      },
      record.id,
    );
  }

  public static toNotificationTemplate(record: {
    id: string;
    bodyTemplate: string;
    channelId: string;
    displayName: string;
    eventName: string;
    isSystemManaged: boolean;
    subjectTemplate: string | null;
    templateKey: string;
  }): NotificationTemplate {
    return NotificationTemplate.create(
      {
        bodyTemplate: record.bodyTemplate,
        channelId: record.channelId,
        displayName: record.displayName,
        eventName: record.eventName,
        isSystemManaged: record.isSystemManaged,
        subjectTemplate: record.subjectTemplate ?? undefined,
        templateKey: record.templateKey,
      },
      record.id,
    );
  }

  public static toNotificationRequest(record: {
    id: string;
    attemptCount: number;
    channelId: string;
    deliveredAt: Date | null;
    eventName: string;
    failureReason: string | null;
    maxAttempts: number;
    nextAttemptAt: Date | null;
    payload: Record<string, unknown>;
    recipient: string;
    requestedAt: Date;
    status: 'FAILED_TERMINAL' | 'QUEUED' | 'RETRYING' | 'SENT';
    templateId: string;
  }): NotificationRequest {
    return NotificationRequest.create(
      {
        attemptCount: record.attemptCount,
        channelId: record.channelId,
        deliveredAt: record.deliveredAt ?? undefined,
        eventName: record.eventName,
        failureReason: record.failureReason ?? undefined,
        maxAttempts: record.maxAttempts,
        nextAttemptAt: record.nextAttemptAt ?? undefined,
        payload: record.payload,
        recipient: record.recipient,
        requestedAt: record.requestedAt,
        status: record.status,
        templateId: record.templateId,
      },
      record.id,
    );
  }

  public static toNotificationDelivery(record: {
    id: string;
    attemptNumber: number;
    attemptedAt: Date;
    channelId: string;
    failureReason: string | null;
    nextAttemptAt: Date | null;
    notificationRequestId: string;
    providerMessageId: string | null;
    recipient: string;
    renderedBody: string;
    renderedSubject: string | null;
    status: 'FAILED_TERMINAL' | 'PENDING' | 'RETRYING' | 'SUCCEEDED';
  }): NotificationDelivery {
    return NotificationDelivery.create(
      {
        attemptNumber: record.attemptNumber,
        attemptedAt: record.attemptedAt,
        channelId: record.channelId,
        failureReason: record.failureReason ?? undefined,
        nextAttemptAt: record.nextAttemptAt ?? undefined,
        notificationRequestId: record.notificationRequestId,
        providerMessageId: record.providerMessageId ?? undefined,
        recipient: record.recipient,
        renderedBody: record.renderedBody,
        renderedSubject: record.renderedSubject ?? undefined,
        status: record.status,
      },
      record.id,
    );
  }
}
