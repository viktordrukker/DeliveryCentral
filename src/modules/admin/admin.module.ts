import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { IntegrationsHubModule } from '../integrations-hub/integrations-hub.module';
import { MetadataModule } from '../metadata/metadata.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminConfigQueryService } from './application/admin-config-query.service';
import { InMemoryWebhookService } from './infrastructure/in-memory-webhook.service';
import { AdminConfigController } from './presentation/admin-config.controller';

@Module({
  imports: [MetadataModule, IntegrationsHubModule, NotificationsModule],
  controllers: [AdminConfigController],
  providers: [AdminConfigQueryService, PrismaService, InMemoryWebhookService],
  exports: [AdminConfigQueryService, InMemoryWebhookService],
})
export class AdminModule {}
