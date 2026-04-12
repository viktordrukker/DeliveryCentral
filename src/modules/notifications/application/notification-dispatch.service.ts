import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import {
  NotificationChannelAdapter,
  NotificationDeliveryFailure,
  NotificationDispatchResult,
} from './notification-channel-adapter';
import { NotificationRetryPolicy } from './notification-retry-policy';
import { NotificationTemplateResolver } from './notification-template-resolver.service';
import { NotificationChannelRepositoryPort } from '../domain/repositories/notification-channel-repository.port';
import { NotificationDeliveryRepositoryPort } from '../domain/repositories/notification-delivery-repository.port';
import { NotificationRequestRepositoryPort } from '../domain/repositories/notification-request-repository.port';
import { NotificationTemplateRepositoryPort } from '../domain/repositories/notification-template-repository.port';
import { NotificationDelivery } from '../domain/entities/notification-delivery.entity';
import { NotificationRequest } from '../domain/entities/notification-request.entity';

interface DispatchNotificationCommand {
  channelKey: string;
  eventName: string;
  payload: Record<string, unknown>;
  recipient: string;
  templateKey: string;
}

@Injectable()
export class NotificationDispatchService {
  private readonly adapterIndex: Map<string, NotificationChannelAdapter>;

  public constructor(
    adapters: NotificationChannelAdapter[],
    private readonly channelRepository: NotificationChannelRepositoryPort,
    private readonly templateRepository: NotificationTemplateRepositoryPort,
    private readonly requestRepository: NotificationRequestRepositoryPort,
    private readonly deliveryRepository: NotificationDeliveryRepositoryPort,
    private readonly templateResolver: NotificationTemplateResolver,
    private readonly retryPolicy: NotificationRetryPolicy,
    private readonly auditLogger?: AuditLoggerService,
  ) {
    this.adapterIndex = new Map(adapters.map((adapter) => [adapter.channelKey, adapter]));
  }

  public async dispatch(
    command: DispatchNotificationCommand,
  ): Promise<NotificationDispatchResult> {
    const channel = await this.channelRepository.findByChannelKey(command.channelKey);
    if (!channel || !channel.isEnabled) {
      throw new Error('Notification channel is not available.');
    }

    const template = await this.templateRepository.findByTemplateKey(command.templateKey);
    if (!template) {
      throw new Error('Notification template not found.');
    }

    if (template.channelId !== channel.id) {
      throw new Error('Notification template channel does not match the selected channel.');
    }

    const adapter = this.adapterIndex.get(channel.channelKey);
    if (!adapter) {
      throw new Error('Notification channel adapter is not registered.');
    }

    const validConfig = await adapter.validateConfig(channel.config);
    if (!validConfig) {
      throw new Error('Notification channel configuration is invalid.');
    }

    const request = NotificationRequest.create({
      channelId: channel.id,
      eventName: command.eventName,
      maxAttempts: this.retryPolicy.maxAttempts,
      payload: command.payload,
      recipient: command.recipient,
      templateId: template.id,
    });
    await this.requestRepository.save(request);

    const renderedSubject = template.subjectTemplate
      ? this.templateResolver.resolve(template.subjectTemplate, command.payload)
      : undefined;
    const renderedBody = this.templateResolver.resolve(template.bodyTemplate, command.payload);

    let latestDelivery: NotificationDelivery | null = null;

    for (let attemptNumber = 1; attemptNumber <= request.maxAttempts; attemptNumber += 1) {
      const delivery = NotificationDelivery.create({
        attemptNumber,
        channelId: channel.id,
        notificationRequestId: request.id,
        recipient: command.recipient,
        renderedBody,
        renderedSubject,
      });
      latestDelivery = delivery;
      await this.deliveryRepository.save(delivery);

      try {
        const result = await adapter.send(
          {
            body: renderedBody,
            recipient: command.recipient,
            subject: renderedSubject,
          },
          channel.config,
        );

        delivery.markSucceeded(result.providerMessageId);
        request.markSent(new Date(), attemptNumber);
        await this.deliveryRepository.save(delivery);
        await this.requestRepository.save(request);
        this.recordAudit({
          attemptNumber,
          channelKey: channel.channelKey,
          deliveryId: delivery.id,
          eventName: request.eventName,
          providerMessageId: result.providerMessageId ?? null,
          recipient: command.recipient,
          requestId: request.id,
          status: 'SUCCEEDED',
        });

        return {
          deliveryId: delivery.id,
          notificationRequestId: request.id,
          status: 'SUCCEEDED',
        };
      } catch (error) {
        const failure = this.normalizeFailure(error);
        const hasMoreAttempts = failure.retryable && attemptNumber < request.maxAttempts;

        if (hasMoreAttempts) {
          const nextAttemptAt = this.retryPolicy.calculateNextAttempt(delivery.attemptedAt);
          delivery.markRetrying(failure.message, nextAttemptAt);
          request.markRetrying(failure.message, attemptNumber, nextAttemptAt);
          await this.deliveryRepository.save(delivery);
          await this.requestRepository.save(request);
          this.recordAudit({
            attemptNumber,
            channelKey: channel.channelKey,
            deliveryId: delivery.id,
            errorMessage: failure.message,
            eventName: request.eventName,
            nextAttemptAt: nextAttemptAt.toISOString(),
            recipient: command.recipient,
            requestId: request.id,
            status: 'RETRYING',
          });

          if (this.retryPolicy.retryDelayMs > 0) {
            await sleep(this.retryPolicy.retryDelayMs);
          }

          continue;
        }

        delivery.markFailedTerminal(failure.message);
        request.markFailedTerminal(failure.message, attemptNumber);
        await this.deliveryRepository.save(delivery);
        await this.requestRepository.save(request);
        this.recordAudit({
          attemptNumber,
          channelKey: channel.channelKey,
          deliveryId: delivery.id,
          errorMessage: failure.message,
          eventName: request.eventName,
          recipient: command.recipient,
          requestId: request.id,
          status: 'FAILED_TERMINAL',
        });

        return {
          deliveryId: delivery.id,
          notificationRequestId: request.id,
          status: 'FAILED',
        };
      }
    }

    if (!latestDelivery) {
      throw new Error('Notification delivery did not create an attempt.');
    }

    return {
      deliveryId: latestDelivery.id,
      notificationRequestId: request.id,
      status: 'FAILED',
    };
  }

  private normalizeFailure(error: unknown): NotificationDeliveryFailure {
    if (error instanceof NotificationDeliveryFailure) {
      return error;
    }

    if (error instanceof Error) {
      return new NotificationDeliveryFailure(error.message, false);
    }

    return new NotificationDeliveryFailure('Notification delivery failed.', false);
  }

  private recordAudit(params: {
    attemptNumber: number;
    channelKey: string;
    deliveryId: string;
    errorMessage?: string;
    eventName: string;
    nextAttemptAt?: string;
    providerMessageId?: string | null;
    recipient: string;
    requestId: string;
    status: 'FAILED_TERMINAL' | 'RETRYING' | 'SUCCEEDED';
  }): void {
    this.auditLogger?.record({
      actionType: 'notification.send_result',
      actorId: null,
      category: 'notification',
      changeSummary: `Notification ${params.requestId} ${this.describeStatus(params.status)} through ${params.channelKey}.`,
      details: {
        attemptNumber: params.attemptNumber,
        channelKey: params.channelKey,
        eventName: params.eventName,
        status: params.status,
      },
      metadata: {
        attemptNumber: params.attemptNumber,
        channelKey: params.channelKey,
        deliveryId: params.deliveryId,
        errorMessage: params.errorMessage ?? null,
        eventName: params.eventName,
        nextAttemptAt: params.nextAttemptAt ?? null,
        providerMessageId: params.providerMessageId ?? null,
        recipient: params.recipient,
        status: params.status,
      },
      targetEntityId: params.requestId,
      targetEntityType: 'NOTIFICATION_REQUEST',
    });
  }

  private describeStatus(status: 'FAILED_TERMINAL' | 'RETRYING' | 'SUCCEEDED'): string {
    if (status === 'RETRYING') {
      return 'scheduled for retry';
    }

    if (status === 'FAILED_TERMINAL') {
      return 'failed terminally';
    }

    return 'sent';
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
