import { RepositoryPort } from '@src/shared/domain/repository-port';

import { NotificationChannel } from '../entities/notification-channel.entity';

export interface NotificationChannelRepositoryPort extends RepositoryPort<NotificationChannel> {
  findByChannelKey(channelKey: string): Promise<NotificationChannel | null>;
  listEnabled(): Promise<NotificationChannel[]>;
}
