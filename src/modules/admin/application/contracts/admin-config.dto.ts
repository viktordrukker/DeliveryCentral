import { ApiProperty } from '@nestjs/swagger';

export class AdminConfigDictionarySummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public dictionaryKey!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public entityType!: string;

  @ApiProperty()
  public entryCount!: number;

  @ApiProperty()
  public enabledEntryCount!: number;

  @ApiProperty()
  public isSystemManaged!: boolean;
}

export class AdminConfigIntegrationDto {
  @ApiProperty()
  public provider!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public supportsProjectSync!: boolean;

  @ApiProperty()
  public supportsWorkEvidence!: boolean;

  @ApiProperty({ required: false })
  public supportsDirectorySync?: boolean;

  @ApiProperty({ required: false })
  public supportsManagerSync?: boolean;

  @ApiProperty({ required: false })
  public supportsAccountSync?: boolean;

  @ApiProperty({ required: false })
  public matchStrategy?: string;

  @ApiProperty({ required: false })
  public defaultOrgUnitId?: string;

  @ApiProperty({ required: false })
  public linkedIdentityCount?: number;

  @ApiProperty({ required: false })
  public linkedAccountCount?: number;

  @ApiProperty({ required: false })
  public unlinkedAccountCount?: number;

  @ApiProperty({ required: false })
  public lastProjectSyncAt?: string;

  @ApiProperty({ required: false })
  public lastProjectSyncOutcome?: string;

  @ApiProperty({ required: false })
  public lastProjectSyncSummary?: string;

  @ApiProperty({ required: false })
  public lastSyncAt?: string;

  @ApiProperty({ required: false })
  public lastSyncOutcome?: string;

  @ApiProperty({ required: false })
  public lastSyncSummary?: string;
}

export class AdminConfigSystemFlagDto {
  @ApiProperty()
  public key!: string;

  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public source!: string;

  @ApiProperty()
  public description!: string;
}

export class AdminNotificationChannelDto {
  @ApiProperty()
  public channelKey!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public kind!: string;

  @ApiProperty()
  public isEnabled!: boolean;
}

export class AdminNotificationTemplateDto {
  @ApiProperty()
  public templateKey!: string;

  @ApiProperty()
  public eventName!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public channelKey!: string;

  @ApiProperty({ required: false })
  public subjectTemplate?: string;

  @ApiProperty()
  public bodyTemplate!: string;
}

export class AdminConfigResponseDto {
  @ApiProperty({ type: () => [AdminConfigDictionarySummaryDto] })
  public dictionaries!: AdminConfigDictionarySummaryDto[];

  @ApiProperty({ type: () => [AdminConfigIntegrationDto] })
  public integrations!: AdminConfigIntegrationDto[];

  @ApiProperty({ type: () => [AdminConfigSystemFlagDto] })
  public systemFlags!: AdminConfigSystemFlagDto[];
}

export class AdminSettingsResponseDto {
  @ApiProperty({ type: () => [AdminConfigSystemFlagDto] })
  public systemFlags!: AdminConfigSystemFlagDto[];
}

export class AdminIntegrationsResponseDto {
  @ApiProperty({ type: () => [AdminConfigIntegrationDto] })
  public integrations!: AdminConfigIntegrationDto[];
}

export class AdminNotificationsResponseDto {
  @ApiProperty({ type: () => [AdminNotificationChannelDto] })
  public channels!: AdminNotificationChannelDto[];

  @ApiProperty({ type: () => [AdminNotificationTemplateDto] })
  public templates!: AdminNotificationTemplateDto[];
}
