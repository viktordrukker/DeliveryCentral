import { NotificationDelivery } from '../../../domain/entities/notification-delivery.entity';
import { NotificationDeliveryRepositoryPort } from '../../../domain/repositories/notification-delivery-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

interface Gateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaNotificationDeliveryRepository implements NotificationDeliveryRepositoryPort {
  public constructor(private readonly gateway: Gateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<NotificationDelivery | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? NotificationsPrismaMapper.toNotificationDelivery(record) : null;
  }

  public async listAll(): Promise<NotificationDelivery[]> {
    const records = await this.gateway.findMany();
    return records.map((record) => NotificationsPrismaMapper.toNotificationDelivery(record));
  }

  public async listByRequestId(notificationRequestId: string): Promise<NotificationDelivery[]> {
    const records = await this.gateway.findMany({ where: { notificationRequestId } });
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
