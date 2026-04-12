import { Injectable } from '@nestjs/common';

import { NotificationRequestRepositoryPort } from '../domain/repositories/notification-request-repository.port';
import { NotificationDeliveryRepositoryPort } from '../domain/repositories/notification-delivery-repository.port';
import { NotificationRequestStatus } from '../domain/entities/notification-request.entity';
import { NotificationQueueResponseDto } from './contracts/notification-queue.dto';

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class NotificationQueueQueryService {
  public constructor(
    private readonly notificationRequestRepository: NotificationRequestRepositoryPort,
    private readonly notificationDeliveryRepository: NotificationDeliveryRepositoryPort,
  ) {}

  public async execute(query: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<NotificationQueueResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    let all = await this.notificationRequestRepository.listAll();

    if (query.status) {
      const statusFilter = query.status.toUpperCase() as NotificationRequestStatus;
      all = all.filter((r) => r.status === statusFilter);
    }

    all.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const totalCount = all.length;
    const offset = (page - 1) * pageSize;
    const pageItems = all.slice(offset, offset + pageSize);

    const deliveriesByRequestId = new Map<string, string | null>();
    await Promise.all(
      pageItems.map(async (r) => {
        const deliveries = await this.notificationDeliveryRepository.listByRequestId(r.id);
        const latest = deliveries.sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime())[0];
        deliveriesByRequestId.set(r.id, latest?.renderedBody ?? null);
      }),
    );

    return {
      items: pageItems.map((r) => ({
        attemptCount: r.attemptCount,
        channelId: r.channelId,
        deliveredAt: r.deliveredAt?.toISOString() ?? null,
        eventName: r.eventName,
        failureReason: r.failureReason ?? null,
        id: r.id,
        latestRenderedBody: deliveriesByRequestId.get(r.id) ?? null,
        maxAttempts: r.maxAttempts,
        nextAttemptAt: r.nextAttemptAt?.toISOString() ?? null,
        payload: r.payload,
        recipient: r.recipient,
        requestedAt: r.requestedAt.toISOString(),
        status: r.status,
        templateId: r.templateId,
      })),
      page,
      pageSize,
      totalCount,
    };
  }
}
