import { Injectable } from '@nestjs/common';

import { NotificationOutcomeDto } from './contracts/notification-outcome.dto';
import { NotificationChannelRepositoryPort } from '../domain/repositories/notification-channel-repository.port';
import { NotificationDeliveryRepositoryPort } from '../domain/repositories/notification-delivery-repository.port';
import { NotificationRequestRepositoryPort } from '../domain/repositories/notification-request-repository.port';
import { NotificationTemplateRepositoryPort } from '../domain/repositories/notification-template-repository.port';

@Injectable()
export class NotificationOutcomeQueryService {
  public constructor(
    private readonly channelRepository: NotificationChannelRepositoryPort,
    private readonly templateRepository: NotificationTemplateRepositoryPort,
    private readonly requestRepository: NotificationRequestRepositoryPort,
    private readonly deliveryRepository: NotificationDeliveryRepositoryPort,
  ) {}

  public async listRecent(limit = 10): Promise<NotificationOutcomeDto[]> {
    const boundedLimit = Math.min(Math.max(limit, 1), 50);
    const [deliveries, requests] = await Promise.all([
      this.deliveryRepository.listAll(),
      this.requestRepository.listAll(),
    ]);

    const requestsById = new Map(requests.map((request) => [request.id, request]));
    const templateCache = new Map<string, Awaited<ReturnType<NotificationTemplateRepositoryPort['findById']>>>();
    const channelCache = new Map<string, Awaited<ReturnType<NotificationChannelRepositoryPort['findById']>>>();

    const recentDeliveries = [...deliveries]
      .sort((left, right) => right.attemptedAt.getTime() - left.attemptedAt.getTime())
      .slice(0, boundedLimit);

    return Promise.all(
      recentDeliveries.map(async (delivery) => {
        const request = requestsById.get(delivery.notificationRequestId);
        const template = request
          ? await this.readTemplate(request.templateId, templateCache)
          : null;
        const channel = await this.readChannel(delivery.channelId, channelCache);

        return {
          attemptedAt: delivery.attemptedAt.toISOString(),
          attemptNumber: delivery.attemptNumber,
          channelKey: channel?.channelKey ?? 'unknown',
          ...(delivery.failureReason ? { errorSummary: delivery.failureReason } : {}),
          eventName: request?.eventName ?? template?.eventName ?? 'unknown',
          notificationRequestId: delivery.notificationRequestId,
          status: delivery.status,
          targetSummary: this.sanitizeTargetSummary(
            delivery.recipient,
            channel?.kind ?? channel?.channelKey,
          ),
          templateDisplayName: template?.displayName ?? 'Unknown Template',
          templateKey: template?.templateKey ?? 'unknown',
        } satisfies NotificationOutcomeDto;
      }),
    );
  }

  private async readChannel(
    id: string,
    cache: Map<string, Awaited<ReturnType<NotificationChannelRepositoryPort['findById']>>>,
  ) {
    if (!cache.has(id)) {
      cache.set(id, await this.channelRepository.findById(id));
    }

    return cache.get(id) ?? null;
  }

  private async readTemplate(
    id: string,
    cache: Map<string, Awaited<ReturnType<NotificationTemplateRepositoryPort['findById']>>>,
  ) {
    if (!cache.has(id)) {
      cache.set(id, await this.templateRepository.findById(id));
    }

    return cache.get(id) ?? null;
  }

  private sanitizeTargetSummary(recipient: string, channelKind?: string): string {
    const normalizedKind = (channelKind ?? '').toLowerCase();

    if (normalizedKind.includes('email') && recipient.includes('@')) {
      const [localPart, domain] = recipient.split('@');
      const visibleLocal = localPart.length <= 2 ? localPart[0] ?? '*' : localPart.slice(0, 2);
      return `${visibleLocal}***@${domain}`;
    }

    if (normalizedKind.includes('webhook')) {
      return 'Webhook target configured';
    }

    return 'Configured target';
  }
}
