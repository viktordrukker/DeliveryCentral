import { Injectable } from '@nestjs/common';

import { JiraStatusService } from '@src/modules/integrations/jira/application/jira-status.service';
import { M365DirectoryStatusService } from '@src/modules/integrations/m365/application/m365-directory-status.service';
import { RadiusStatusService } from '@src/modules/integrations/radius/application/radius-status.service';
import { MetadataDictionaryQueryService } from '@src/modules/metadata/application/metadata-dictionary-query.service';
import { NotificationTemplateQueryService } from '@src/modules/notifications/application/notification-template-query.service';
import { PrismaNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-channel.repository';
import { AppConfig } from '@src/shared/config/app-config';

import {
  AdminConfigDictionarySummaryDto,
  AdminConfigResponseDto,
  AdminConfigSystemFlagDto,
  AdminIntegrationsResponseDto,
  AdminNotificationChannelDto,
  AdminNotificationTemplateDto,
  AdminNotificationsResponseDto,
  AdminSettingsResponseDto,
} from './contracts/admin-config.dto';

@Injectable()
export class AdminConfigQueryService {
  public constructor(
    private readonly metadataDictionaryQueryService: MetadataDictionaryQueryService,
    private readonly jiraStatusService: JiraStatusService,
    private readonly m365DirectoryStatusService: M365DirectoryStatusService,
    private readonly radiusStatusService: RadiusStatusService,
    private readonly notificationTemplateQueryService: NotificationTemplateQueryService,
    private readonly notificationChannelRepository: PrismaNotificationChannelRepository,
    private readonly appConfig: AppConfig,
  ) {}

  public async execute(): Promise<AdminConfigResponseDto> {
    return {
      dictionaries: await this.getDictionaries(),
      integrations: await this.getIntegrations(),
      systemFlags: await this.getSystemFlags(),
    };
  }

  public async getSettings(): Promise<AdminSettingsResponseDto> {
    return {
      systemFlags: await this.getSystemFlags(),
    };
  }

  public async getIntegrations(): Promise<AdminIntegrationsResponseDto['integrations']> {
    const [jiraStatus, m365Status, radiusStatus] = await Promise.all([
      this.jiraStatusService.getStatus(),
      this.m365DirectoryStatusService.getStatus(),
      this.radiusStatusService.getStatus(),
    ]);

    return [
      {
        lastProjectSyncAt: jiraStatus.lastProjectSyncAt,
        lastProjectSyncOutcome: jiraStatus.lastProjectSyncOutcome,
        lastProjectSyncSummary: jiraStatus.lastProjectSyncSummary,
        lastSyncAt: jiraStatus.lastProjectSyncAt,
        lastSyncOutcome: jiraStatus.lastProjectSyncOutcome,
        lastSyncSummary: jiraStatus.lastProjectSyncSummary,
        provider: jiraStatus.provider,
        status: jiraStatus.status,
        supportsProjectSync: jiraStatus.supportsProjectSync,
        supportsWorkEvidence: jiraStatus.supportsWorkEvidence,
      },
      {
        defaultOrgUnitId: m365Status.defaultOrgUnitId,
        lastSyncAt: m365Status.lastDirectorySyncAt,
        lastSyncOutcome: m365Status.lastDirectorySyncOutcome,
        lastSyncSummary: m365Status.lastDirectorySyncSummary,
        linkedIdentityCount: m365Status.linkedIdentityCount,
        matchStrategy: m365Status.matchStrategy,
        provider: m365Status.provider,
        status: m365Status.status,
        supportsDirectorySync: m365Status.supportsDirectorySync,
        supportsManagerSync: m365Status.supportsManagerSync,
        supportsProjectSync: false,
        supportsWorkEvidence: false,
      },
      {
        lastSyncAt: radiusStatus.lastAccountSyncAt,
        lastSyncOutcome: radiusStatus.lastAccountSyncOutcome,
        lastSyncSummary: radiusStatus.lastAccountSyncSummary,
        linkedAccountCount: radiusStatus.linkedAccountCount,
        matchStrategy: radiusStatus.matchStrategy,
        provider: radiusStatus.provider,
        status: radiusStatus.status,
        supportsAccountSync: radiusStatus.supportsAccountSync,
        supportsProjectSync: false,
        supportsWorkEvidence: false,
        unlinkedAccountCount: radiusStatus.unlinkedAccountCount,
      },
    ];
  }

  public async getNotifications(): Promise<AdminNotificationsResponseDto> {
    const [channels, templates] = await Promise.all([
      this.notificationChannelRepository.listEnabled(),
      this.notificationTemplateQueryService.listTemplates(),
    ]);

    return {
      channels: channels.map<AdminNotificationChannelDto>((channel) => ({
        channelKey: channel.channelKey,
        displayName: channel.displayName,
        isEnabled: channel.isEnabled,
        kind: channel.kind,
      })),
      templates: templates.map<AdminNotificationTemplateDto>((template) => ({
        bodyTemplate: template.bodyTemplate,
        channelKey: template.channelKey,
        displayName: template.displayName,
        eventName: template.eventName,
        subjectTemplate: template.subjectTemplate,
        templateKey: template.templateKey,
      })),
    };
  }

  private async getDictionaries(): Promise<AdminConfigDictionarySummaryDto[]> {
    const dictionaries = await this.metadataDictionaryQueryService.listDictionaries({});

    return dictionaries.items.map<AdminConfigDictionarySummaryDto>((item) => ({
      dictionaryKey: item.dictionaryKey,
      displayName: item.displayName,
      enabledEntryCount: item.enabledEntryCount,
      entityType: item.entityType,
      entryCount: item.entryCount,
      id: item.id,
      isSystemManaged: item.isSystemManaged,
    }));
  }

  private async getSystemFlags(): Promise<AdminConfigSystemFlagDto[]> {
    return [
      {
        description:
          'Indicates whether the platform is running in development mode for local/demo administration.',
        enabled: this.appConfig.nodeEnv === 'development',
        key: 'development_mode',
        source: 'NODE_ENV',
      },
      {
        description:
          'Controls workspend conversion from recorded work evidence minutes into mandays.',
        enabled: this.appConfig.minutesPerManday > 0,
        key: 'workspend_summary_enabled',
        source: 'MINUTES_PER_MANDAY',
      },
      {
        description:
          'Signals that browser clients are expected to call the API through the configured CORS origin.',
        enabled: Boolean(this.appConfig.corsOrigin),
        key: 'browser_api_access_enabled',
        source: 'CORS_ORIGIN',
      },
    ];
  }
}
