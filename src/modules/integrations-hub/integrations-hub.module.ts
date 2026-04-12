import { Module } from '@nestjs/common';

import { HrisModule } from '../integrations/hris/hris.module';
import { JiraModule } from '../integrations/jira/jira.module';
import { M365Module } from '../integrations/m365/m365.module';
import { RadiusModule } from '../integrations/radius/radius.module';
import { IntegrationSyncHistoryQueryService } from './application/integration-sync-history-query.service';
import { IntegrationSyncHistoryController } from './presentation/integration-sync-history.controller';

@Module({
  imports: [HrisModule, JiraModule, M365Module, RadiusModule],
  controllers: [IntegrationSyncHistoryController],
  providers: [IntegrationSyncHistoryQueryService],
  exports: [HrisModule, JiraModule, M365Module, RadiusModule, IntegrationSyncHistoryQueryService],
})
export class IntegrationsHubModule {}
