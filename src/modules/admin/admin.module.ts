import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditObservabilityModule } from '../audit-observability/audit-observability.module';
import { IntegrationsHubModule } from '../integrations-hub/integrations-hub.module';
import { MetadataModule } from '../metadata/metadata.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { AdminConfigQueryService } from './application/admin-config-query.service';
import { IntegrationsRegistryService } from './application/integrations-registry.service';
import { LeanMigrationParityService } from './application/lean-migration-parity.service';
import { RedactPersonAuditService } from './application/redact-person-audit.service';
import { SoakChecklistService } from './application/soak-checklist.service';
import { InMemoryWebhookService } from './infrastructure/in-memory-webhook.service';
import { AdminConfigController } from './presentation/admin-config.controller';
import { AuditRetentionAdminController } from './presentation/audit-retention-admin.controller';
import { IntegrationsRegistryAdminController } from './presentation/integrations-registry-admin.controller';
import { LeanMigrationParityController } from './presentation/lean-migration-parity.controller';
import { RedactPersonAdminController } from './presentation/redact-person-admin.controller';
import { RolePresetsAdminController } from './presentation/role-presets-admin.controller';
import { RuntimeFlagDebugController } from './presentation/runtime-flag-debug.controller';
import { SoakChecklistController } from './presentation/soak-checklist.controller';

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
    IntegrationsRegistryAdminController,
    LeanMigrationParityController,
    RedactPersonAdminController,
    RolePresetsAdminController,
    RuntimeFlagDebugController,
    SoakChecklistController,
  ],
  providers: [
    AdminConfigQueryService,
    IntegrationsRegistryService,
    LeanMigrationParityService,
    PrismaService,
    InMemoryWebhookService,
    RedactPersonAuditService,
    SoakChecklistService,
  ],
  exports: [
    AdminConfigQueryService,
    IntegrationsRegistryService,
    LeanMigrationParityService,
    InMemoryWebhookService,
    RedactPersonAuditService,
    SoakChecklistService,
  ],
})
export class AdminModule {}
