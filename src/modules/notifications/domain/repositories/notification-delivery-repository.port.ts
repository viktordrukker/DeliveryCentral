import { RepositoryPort } from '@src/shared/domain/repository-port';

import { NotificationDelivery } from '../entities/notification-delivery.entity';

export interface NotificationDeliveryRepositoryPort extends RepositoryPort<NotificationDelivery> {
  listAll(): Promise<NotificationDelivery[]>;
  listByRequestId(notificationRequestId: string): Promise<NotificationDelivery[]>;
}
