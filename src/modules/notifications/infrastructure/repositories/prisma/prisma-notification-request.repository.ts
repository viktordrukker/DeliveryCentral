import { NotificationRequest } from '../../../domain/entities/notification-request.entity';
import { NotificationRequestRepositoryPort } from '../../../domain/repositories/notification-request-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

interface Gateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaNotificationRequestRepository implements NotificationRequestRepositoryPort {
  public constructor(private readonly gateway: Gateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<NotificationRequest | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? NotificationsPrismaMapper.toNotificationRequest(record) : null;
  }

  public async listAll(): Promise<NotificationRequest[]> {
    const records = await this.gateway.findMany();
    return records.map((record) => NotificationsPrismaMapper.toNotificationRequest(record));
  }

  public async save(aggregate: NotificationRequest): Promise<void> {
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
        payload: aggregate.payload,
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
        payload: aggregate.payload,
        recipient: aggregate.recipient,
        status: aggregate.status,
      },
      where: { id: aggregate.id },
    });
  }
}
