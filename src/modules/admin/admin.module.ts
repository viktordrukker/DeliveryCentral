import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditObservabilityModule } from '../audit-observability/audit-observability.module';
import { IntegrationsHubModule } from '../integrations-hub/integrations-hub.module';
import { MetadataModule } from '../metadata/metadata.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { AdminConfigQueryService } from './application/admin-config-query.service';
import { RedactPersonAuditService } from './application/redact-person-audit.service';
import { InMemoryWebhookService } from './infrastructure/in-memory-webhook.service';
import { AdminConfigController } from './presentation/admin-config.controller';
import { AuditRetentionAdminController } from './presentation/audit-retention-admin.controller';
import { RedactPersonAdminController } from './presentation/redact-person-admin.controller';
import { RolePresetsAdminController } from './presentation/role-presets-admin.controller';

@Module({
  imports: [
    AuditObservabilityModule,
    MetadataModule,
    IntegrationsHubModule,
    NotificationsModule,
    PlatformSettingsModule,
  ],
  controllers: [
    AdminConfigController,
    AuditRetentionAdminController,
    RedactPersonAdminController,
    RolePresetsAdminController,
  ],
  providers: [
    AdminConfigQueryService,
    PrismaService,
    InMemoryWebhookService,
    RedactPersonAuditService,
  ],
  exports: [AdminConfigQueryService, InMemoryWebhookService, RedactPersonAuditService],
})
export class AdminModule {}
