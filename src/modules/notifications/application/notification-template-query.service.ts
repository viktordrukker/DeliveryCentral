import { Injectable } from '@nestjs/common';

import { NotificationTemplateDto } from './contracts/notification-template.dto';
import { NotificationChannelRepositoryPort } from '../domain/repositories/notification-channel-repository.port';
import { NotificationTemplateRepositoryPort } from '../domain/repositories/notification-template-repository.port';

@Injectable()
export class NotificationTemplateQueryService {
  public constructor(
    private readonly channelRepository: NotificationChannelRepositoryPort,
    private readonly templateRepository: NotificationTemplateRepositoryPort,
  ) {}

  public async listTemplates(): Promise<NotificationTemplateDto[]> {
    const templates = await this.templateRepository.listActive();

    return Promise.all(
      templates.map(async (template) => {
        const channel = await this.channelRepository.findById(template.channelId);

        return {
          bodyTemplate: template.bodyTemplate,
          channelKey: channel?.channelKey ?? 'unknown',
          displayName: template.displayName,
          eventName: template.eventName,
          subjectTemplate: template.subjectTemplate,
          templateKey: template.templateKey,
        };
      }),
    );
  }
}
