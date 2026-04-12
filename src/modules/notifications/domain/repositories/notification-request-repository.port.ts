import { RepositoryPort } from '@src/shared/domain/repository-port';

import { NotificationRequest } from '../entities/notification-request.entity';

export interface NotificationRequestRepositoryPort extends RepositoryPort<NotificationRequest> {
  listAll(): Promise<NotificationRequest[]>;
}
