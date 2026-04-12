import { RepositoryPort } from '@src/shared/domain/repository-port';

import { NotificationTemplate } from '../entities/notification-template.entity';

export interface NotificationTemplateRepositoryPort extends RepositoryPort<NotificationTemplate> {
  findByTemplateKey(templateKey: string): Promise<NotificationTemplate | null>;
  listActive(): Promise<NotificationTemplate[]>;
}
