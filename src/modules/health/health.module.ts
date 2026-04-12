import { Module } from '@nestjs/common';

import { JiraModule } from '../integrations/jira/jira.module';
import { M365Module } from '../integrations/m365/m365.module';
import { RadiusModule } from '../integrations/radius/radius.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditObservabilityModule } from '../audit-observability/audit-observability.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [AuditObservabilityModule, JiraModule, M365Module, RadiusModule, NotificationsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
