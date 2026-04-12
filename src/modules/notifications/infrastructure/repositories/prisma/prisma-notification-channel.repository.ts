import { NotificationChannel } from '../../../domain/entities/notification-channel.entity';
import { NotificationChannelRepositoryPort } from '../../../domain/repositories/notification-channel-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

interface Gateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaNotificationChannelRepository implements NotificationChannelRepositoryPort {
  public constructor(private readonly gateway: Gateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByChannelKey(channelKey: string): Promise<NotificationChannel | null> {
    const record = await this.gateway.findFirst({ where: { channelKey } });
    return record ? NotificationsPrismaMapper.toNotificationChannel(record) : null;
  }

  public async findById(id: string): Promise<NotificationChannel | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? NotificationsPrismaMapper.toNotificationChannel(record) : null;
  }

  public async listEnabled(): Promise<NotificationChannel[]> {
    const records = await this.gateway.findMany({ where: { isEnabled: true } });
    return records.map((record) => NotificationsPrismaMapper.toNotificationChannel(record));
  }

  public async save(aggregate: NotificationChannel): Promise<void> {
    await this.gateway.upsert({
      create: {
        id: aggregate.id,
        channelKey: aggregate.channelKey,
        config: aggregate.config ?? null,
        displayName: aggregate.displayName,
        isEnabled: aggregate.isEnabled,
        kind: aggregate.kind,
      },
      update: {
        config: aggregate.config ?? null,
        displayName: aggregate.displayName,
        isEnabled: aggregate.isEnabled,
        kind: aggregate.kind,
      },
      where: { channelKey: aggregate.channelKey },
    });
  }
}
