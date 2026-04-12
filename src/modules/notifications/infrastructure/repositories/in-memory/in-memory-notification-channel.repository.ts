import { NotificationChannel } from '../../../domain/entities/notification-channel.entity';
import { NotificationChannelRepositoryPort } from '../../../domain/repositories/notification-channel-repository.port';

export class InMemoryNotificationChannelRepository implements NotificationChannelRepositoryPort {
  public constructor(private readonly items: NotificationChannel[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByChannelKey(channelKey: string): Promise<NotificationChannel | null> {
    return this.items.find((item) => item.channelKey === channelKey) ?? null;
  }

  public async findById(id: string): Promise<NotificationChannel | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async listEnabled(): Promise<NotificationChannel[]> {
    return this.items.filter((item) => item.isEnabled);
  }

  public async save(aggregate: NotificationChannel): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
