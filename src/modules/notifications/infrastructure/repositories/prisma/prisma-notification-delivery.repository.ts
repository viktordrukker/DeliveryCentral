import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationDelivery } from '../../../domain/entities/notification-delivery.entity';
import { NotificationDeliveryRepositoryPort } from '../../../domain/repositories/notification-delivery-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

// 20c-10 — typed Prisma delegate slice.
type Gateway = Pick<
  Prisma.NotificationDeliveryDelegate,
  'delete' | 'findFirst' | 'findMany' | 'upsert'
>;

/**
 * F-6.2 / D-144 — hard caps to keep listAll() / listByRequestId() from
 * scanning the entire delivery history at admin-screen load. Most flows
 * read at most a dozen deliveries; the caps below are deliberately
 * generous so legitimate use cases never trip them. Hits get a warn
 * log so operators can spot if a real workload is being truncated.
 */
const LIST_ALL_MAX = 1000;
const LIST_BY_REQUEST_MAX = 500;

export class PrismaNotificationDeliveryRepository implements NotificationDeliveryRepositoryPort {
  private readonly logger = new Logger(PrismaNotificationDeliveryRepository.name);

  public constructor(private readonly gateway: Gateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<NotificationDelivery | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? NotificationsPrismaMapper.toNotificationDelivery(record) : null;
  }

  public async listAll(): Promise<NotificationDelivery[]> {
    const records = await this.gateway.findMany({
      orderBy: { attemptedAt: 'desc' },
      take: LIST_ALL_MAX,
    });
    if (records.length === LIST_ALL_MAX) {
      this.logger.warn(
        `listAll() hit the ${LIST_ALL_MAX}-row cap; older deliveries omitted. Consider paginating callers.`,
      );
    }
    return records.map((record) => NotificationsPrismaMapper.toNotificationDelivery(record));
  }

  public async listByRequestId(notificationRequestId: string): Promise<NotificationDelivery[]> {
    const records = await this.gateway.findMany({
      where: { notificationRequestId },
      orderBy: { attemptedAt: 'desc' },
      take: LIST_BY_REQUEST_MAX,
    });
    if (records.length === LIST_BY_REQUEST_MAX) {
      this.logger.warn(
        `listByRequestId(${notificationRequestId}) hit the ${LIST_BY_REQUEST_MAX}-row cap.`,
      );
    }
    return records.map((record) => NotificationsPrismaMapper.toNotificationDelivery(record));
  }

  public async save(aggregate: NotificationDelivery): Promise<void> {
    await this.gateway.upsert({
      create: {
        attemptNumber: aggregate.attemptNumber,
        attemptedAt: aggregate.attemptedAt,
        channelId: aggregate.channelId,
        failureReason: aggregate.failureReason ?? null,
        id: aggregate.id,
        nextAttemptAt: aggregate.nextAttemptAt ?? null,
        notificationRequestId: aggregate.notificationRequestId,
        providerMessageId: aggregate.providerMessageId ?? null,
        recipient: aggregate.recipient,
        renderedBody: aggregate.renderedBody,
        renderedSubject: aggregate.renderedSubject ?? null,
        status: aggregate.status,
      },
      update: {
        failureReason: aggregate.failureReason ?? null,
        nextAttemptAt: aggregate.nextAttemptAt ?? null,
        providerMessageId: aggregate.providerMessageId ?? null,
        renderedBody: aggregate.renderedBody,
        renderedSubject: aggregate.renderedSubject ?? null,
        status: aggregate.status,
      },
      where: { id: aggregate.id },
    });
  }
}
