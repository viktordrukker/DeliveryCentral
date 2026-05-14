import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { IntegrationsHubModule } from '../integrations-hub/integrations-hub.module';
import { MetadataModule } from '../metadata/metadata.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { AdminConfigQueryService } from './application/admin-config-query.service';
import { InMemoryWebhookService } from './infrastructure/in-memory-webhook.service';
import { AdminConfigController } from './presentation/admin-config.controller';
import { RolePresetsAdminController } from './presentation/role-presets-admin.controller';

@Module({
  imports: [MetadataModule, IntegrationsHubModule, NotificationsModule, PlatformSettingsModule],
  controllers: [AdminConfigController, RolePresetsAdminController],
  providers: [AdminConfigQueryService, PrismaService, InMemoryWebhookService],
  exports: [AdminConfigQueryService, InMemoryWebhookService],
})
export class AdminModule {}
