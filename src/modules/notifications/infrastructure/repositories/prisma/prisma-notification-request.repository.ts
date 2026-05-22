import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationRequest } from '../../../domain/entities/notification-request.entity';
import { NotificationRequestRepositoryPort } from '../../../domain/repositories/notification-request-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

// 20c-10 — typed Prisma delegate slice.
type Gateway = Pick<
  Prisma.NotificationRequestDelegate,
  'delete' | 'findFirst' | 'findMany' | 'upsert'
>;

// F-18 / 20c-12 — cap on listAll(). Notification requests are
// short-lived (deleted on dispatch) but a stuck queue could grow
// unbounded; the warn log surfaces it before perf degrades.
const LIST_ALL_MAX = 1000;

export class PrismaNotificationRequestRepository implements NotificationRequestRepositoryPort {
  private readonly logger = new Logger(PrismaNotificationRequestRepository.name);

  public constructor(private readonly gateway: Gateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<NotificationRequest | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? NotificationsPrismaMapper.toNotificationRequest(record) : null;
  }

  public async listAll(): Promise<NotificationRequest[]> {
    const records = await this.gateway.findMany({
      orderBy: { requestedAt: 'desc' },
      take: LIST_ALL_MAX,
    });
    if (records.length === LIST_ALL_MAX) {
      this.logger.warn(
        `listAll() hit the ${LIST_ALL_MAX}-row cap; some notification requests omitted.`,
      );
    }
    return records.map((record) => NotificationsPrismaMapper.toNotificationRequest(record));
  }

  public async save(aggregate: NotificationRequest): Promise<void> {
    // 20c-10 — domain entity holds `Record<string, unknown>`; Prisma's
    // generated input is `Prisma.InputJsonValue`. Both are structural
    // JSON objects; the cast preserves runtime shape.
    const payload = aggregate.payload as Prisma.InputJsonValue;
    await this.gateway.upsert({
      create: {
        attemptCount: aggregate.attemptCount,
        channelId: aggregate.channelId,
        deliveredAt: aggregate.deliveredAt ?? null,
        eventName: aggregate.eventName,
        failureReason: aggregate.failureReason ?? null,
        id: aggregate.id,
        maxAttempts: aggregate.maxAttempts,
        nextAttemptAt: aggregate.nextAttemptAt ?? null,
        payload,
        recipient: aggregate.recipient,
        requestedAt: aggregate.requestedAt,
        status: aggregate.status,
        templateId: aggregate.templateId,
      },
      update: {
        attemptCount: aggregate.attemptCount,
        deliveredAt: aggregate.deliveredAt ?? null,
        failureReason: aggregate.failureReason ?? null,
        maxAttempts: aggregate.maxAttempts,
        nextAttemptAt: aggregate.nextAttemptAt ?? null,
        payload,
        recipient: aggregate.recipient,
        status: aggregate.status,
      },
      where: { id: aggregate.id },
    });
  }
}
